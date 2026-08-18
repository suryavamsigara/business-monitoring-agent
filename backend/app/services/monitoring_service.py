"""
MonitoringService: coordinates the Observe and Detect steps. Delegates KPI
calculation to AnalyticsEngine and anomaly detection to AnomalyDetector -
it does not contain business-metric or detection logic itself.
"""
from supabase import Client
from app.analytics.analytics_engine import AnalyticsEngine
from app.analytics.anomaly_detector import AnomalyDetector, DetectedAnomaly
from app.repositories.monitoring_rule_repository import MonitoringRuleRepository


class MonitoringService:
    def __init__(self, client: Client, days: int = 30):
        self.client = client
        self.days = days
        self.engine = AnalyticsEngine(client)
        self.detector = AnomalyDetector()
        self.rule_repo = MonitoringRuleRepository(client)

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
            mkts = self.client.table("marketplaces").select("*").execute().data or []
            for mkt in mkts:
                mkt_id = mkt.get("id")
                mkt_name = mkt.get("name")
                series = self.engine.daily_series("revenue", self.days, marketplace=mkt_name)
                a = self.detector.detect_rolling_baseline(
                    "marketplace_revenue", series, mkt_rule.threshold_value,
                    entity_type="marketplace", entity_id=mkt_id, entity_name=mkt_name, marketplace_id=mkt_id,
                )
                if a:
                    anomalies.append(a)

        # Product-level inventory and compound checks
        product_table = self.engine.get_product_table(days=self.days)
        inv_rule = rules.get("inventory_days")
        if inv_rule:
            for r in product_table:
                if r["days_of_stock"] is not None and r["days_of_stock"] < 14:
                    a = self.detector.detect_threshold(
                        "inventory_days", actual=r["days_of_stock"], expected=14.0, ratio=1.0,
                        entity_type="product", entity_id=r["product_id"], entity_name=r["product"],
                    )
                    if a:
                        anomalies.append(a)

        # Compound: conversion issue & inventory-driven risk per product
        self._detect_compound_product_anomalies(anomalies, product_table)

        return anomalies

    def _detect_compound_product_anomalies(self, anomalies: list[DetectedAnomaly], product_table: list):
        start, end, prev_start, prev_end = self.engine.period(self.days)
        df = self.engine.sales_df(prev_start, end)
        if df.empty:
            return

        dos_map = {r["product_id"]: r["days_of_stock"] for r in product_table}

        curr_df = df[(df["date"] >= start) & (df["date"] <= end)]
        prev_df = df[(df["date"] >= prev_start) & (df["date"] <= prev_end)]

        curr_agg = curr_df.groupby("product_id").agg(
            visits=("visits", "sum"), orders=("orders", "sum"), revenue=("revenue", "sum"),
            product_name=("product_name", "first")
        )
        prev_agg = prev_df.groupby("product_id").agg(
            visits=("visits", "sum"), orders=("orders", "sum"), revenue=("revenue", "sum"),
        )

        merged = curr_agg.join(prev_agg, lsuffix="_curr", rsuffix="_prev", how="inner")

        for pid, row in merged.iterrows():
            prev_v = float(row["visits_prev"])
            curr_v = float(row["visits_curr"])
            prev_o = float(row["orders_prev"])
            curr_o = float(row["orders_curr"])
            prev_r = float(row["revenue_prev"])
            curr_r = float(row["revenue_curr"])

            if prev_v == 0 or prev_r == 0:
                continue

            traffic_change = (curr_v - prev_v) / prev_v * 100
            revenue_change = (curr_r - prev_r) / prev_r * 100
            orders_change = ((curr_o - prev_o) / prev_o * 100) if prev_o else 0

            prev_conv = (prev_o / prev_v * 100)
            curr_conv = (curr_o / curr_v * 100) if curr_v else 0
            conv_change = (curr_conv - prev_conv) / prev_conv * 100 if prev_conv else 0
            name = str(row["product_name"])

            a1 = self.detector.detect_compound_conversion_issue(
                traffic_change, conv_change, orders_change,
                entity_type="product", entity_id=int(pid), entity_name=name,
            )
            if a1:
                anomalies.append(a1)

            dos = dos_map.get(int(pid))
            a2 = self.detector.detect_compound_inventory_risk(
                revenue_change, traffic_change, dos,
                entity_type="product", entity_id=int(pid), entity_name=name,
            )
            if a2:
                anomalies.append(a2)