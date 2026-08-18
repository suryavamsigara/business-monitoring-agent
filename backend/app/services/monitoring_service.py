"""
MonitoringService: coordinates the Observe and Detect steps. Delegates KPI
calculation to AnalyticsEngine and anomaly detection to AnomalyDetector -
it does not contain business-metric or detection logic itself.
"""
from sqlalchemy.orm import Session
from app.analytics.analytics_engine import AnalyticsEngine
from app.analytics.anomaly_detector import AnomalyDetector, DetectedAnomaly
from app.repositories.monitoring_rule_repository import MonitoringRuleRepository
from app.models.business_models import Marketplace


class MonitoringService:
    def __init__(self, db: Session, days: int = 30):
        self.db = db
        self.days = days
        self.engine = AnalyticsEngine(db)
        self.detector = AnomalyDetector()
        self.rule_repo = MonitoringRuleRepository(db)

    def collect_metrics(self) -> dict:
        """Observe step: snapshot the business KPIs."""
        summary = self.engine.get_business_summary(days=self.days)
        marketplaces = self.engine.get_marketplace_performance(days=self.days)
        return {"summary": summary, "marketplaces": marketplaces}

    def detect_anomalies(self, metrics: dict) -> list[DetectedAnomaly]:
        """Detect step: run every enabled monitoring rule."""
        rules = {r.kpi_name: r for r in self.rule_repo.list(enabled_only=True)}
        anomalies: list[DetectedAnomaly] = []

        # Business-wide KPIs
        for kpi_name in ["revenue", "orders", "avg_order_value", "conversion_rate", "return_rate"]:
            rule = rules.get(kpi_name)
            if not rule:
                continue
            series = self.engine.daily_series(kpi_name, self.days)
            a = self.detector.detect_rolling_baseline(kpi_name, series, rule.threshold_value,
                                                        entity_type="business", entity_id=None, entity_name="Business-wide")
            if a:
                anomalies.append(a)

        # Marketplace revenue
        mkt_rule = rules.get("marketplace_revenue")
        if mkt_rule:
            for mkt in self.db.query(Marketplace).all():
                series = self.engine.daily_series("revenue", self.days, marketplace=mkt.name)
                a = self.detector.detect_rolling_baseline(
                    "marketplace_revenue", series, mkt_rule.threshold_value,
                    entity_type="marketplace", entity_id=mkt.id, entity_name=mkt.name, marketplace_id=mkt.id,
                )
                if a:
                    anomalies.append(a)

        # Inventory days per at-risk product (threshold detection)
        inv_rule = rules.get("inventory_days")
        if inv_rule:
            rows = self.engine.get_product_table(days=self.days)
            for r in rows:
                if r["days_of_stock"] is not None:
                    a = self.detector.detect_threshold(
                        "inventory_days", actual=r["days_of_stock"], expected=inv_rule.threshold_value, ratio=1.0,
                        entity_type="product", entity_id=r["product_id"], entity_name=r["product"],
                    )
                    if a:
                        anomalies.append(a)

        # Compound: conversion issue & inventory-driven risk per product
        self._detect_compound_product_anomalies(anomalies)

        return anomalies

    def _detect_compound_product_anomalies(self, anomalies: list[DetectedAnomaly]):
        start, end, prev_start, prev_end = self.engine.period(self.days)
        df = self.engine.sales_df(prev_start, end)
        if df.empty:
            return
        for pid, sub in df.groupby("product_id"):
            curr = sub[(sub["date"] >= start) & (sub["date"] <= end)]
            prev = sub[(sub["date"] >= prev_start) & (sub["date"] <= prev_end)]
            if curr.empty or prev.empty or prev["visits"].sum() == 0 or prev["revenue"].sum() == 0:
                continue
            traffic_change = (curr["visits"].sum() - prev["visits"].sum()) / prev["visits"].sum() * 100
            revenue_change = (curr["revenue"].sum() - prev["revenue"].sum()) / prev["revenue"].sum() * 100
            orders_change_denominator = prev["orders"].sum()
            orders_change = ((curr["orders"].sum() - prev["orders"].sum()) / orders_change_denominator * 100) if orders_change_denominator else 0
            prev_conv = prev["orders"].sum() / prev["visits"].sum()
            curr_conv = curr["orders"].sum() / curr["visits"].sum() if curr["visits"].sum() else 0
            conv_change = (curr_conv - prev_conv) / prev_conv * 100 if prev_conv else 0
            name = sub["product_name"].iloc[0]

            a1 = self.detector.detect_compound_conversion_issue(
                traffic_change, conv_change, orders_change,
                entity_type="product", entity_id=int(pid), entity_name=name,
            )
            if a1:
                anomalies.append(a1)

            dos = self.engine.get_inventory_days(int(pid), self.days)
            a2 = self.detector.detect_compound_inventory_risk(
                revenue_change, traffic_change, dos,
                entity_type="product", entity_id=int(pid), entity_name=name,
            )
            if a2:
                anomalies.append(a2)