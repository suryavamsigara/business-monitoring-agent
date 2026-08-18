"""
Concrete AgentTool implementations. Each tool wraps the AnalyticsEngine /
repositories and returns real structured data - the AI chooses which tools
to call, but never receives raw database access.
"""
from app.agent.tools.base import AgentTool
from app.analytics.analytics_engine import AnalyticsEngine
from app.models.business_models import Product, Marketplace
from app.models.agent_models import Alert


class GetLatestKPIsTool(AgentTool):
    name = "get_latest_kpis"
    description = "Get the latest business KPI snapshot (revenue, orders, conversion, AOV, return rate) with growth vs the previous period."
    parameters = {"type": "object", "properties": {"days": {"type": "integer", "description": "Lookback window"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, **_):
        return self.engine.get_business_summary(days=days)


class GetHistoricalKPIDataTool(AgentTool):
    name = "get_historical_kpi_data"
    description = "Get the daily historical time series for a given KPI (revenue, orders, conversion_rate, return_rate, avg_order_value)."
    parameters = {
        "type": "object",
        "properties": {
            "kpi_name": {"type": "string"}, "days": {"type": "integer"}, "marketplace": {"type": "string"},
        },
        "required": ["kpi_name"],
    }

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, kpi_name: str, days: int = 30, marketplace: str = None, **_):
        series = self.engine.daily_series(kpi_name, days, marketplace)
        return {"kpi_name": kpi_name, "series": [{"date": str(d), "value": round(float(v), 2)} for d, v in series.items()]}


class GetMarketplacePerformanceTool(AgentTool):
    name = "get_marketplace_performance"
    description = "Get performance metrics for all marketplaces (Amazon, Myntra, Flipkart, Ajio), including revenue growth."
    parameters = {"type": "object", "properties": {"days": {"type": "integer"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, **_):
        return {"marketplaces": self.engine.get_marketplace_performance(days=days)}


class GetProductContributorsTool(AgentTool):
    name = "get_product_contributors"
    description = "Get the products most likely contributing to a KPI anomaly, ranked by revenue and risk status."
    parameters = {"type": "object", "properties": {"days": {"type": "integer"}, "marketplace": {"type": "string"}, "limit": {"type": "integer"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, marketplace: str = None, limit: int = 10, **_):
        rows = self.engine.get_product_table(days=days, marketplace=marketplace)
        risky = [r for r in rows if r["status"] in ("Critical", "Needs Attention")]
        risky.sort(key=lambda r: (r["status"] != "Critical", -(r["revenue_at_risk"] or 0)))
        return {"contributors": risky[:limit]}


class GetInventoryRisksTool(AgentTool):
    name = "get_inventory_risks"
    description = "Get products with fewer than 14 days of inventory remaining, with estimated revenue at risk."
    parameters = {"type": "object", "properties": {"days": {"type": "integer"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, **_):
        rows = self.engine.get_product_table(days=days)
        at_risk = [r for r in rows if r["days_of_stock"] is not None and r["days_of_stock"] < 14]
        at_risk.sort(key=lambda r: r["days_of_stock"])
        return {"at_risk_products": at_risk}


class GetConversionAnomaliesTool(AgentTool):
    name = "get_conversion_anomalies"
    description = "Get products where traffic is stable/up but conversion and orders are declining."
    parameters = {"type": "object", "properties": {"days": {"type": "integer"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, **_):
        start, end, prev_start, prev_end = self.engine.period(days)
        df = self.engine.sales_df(prev_start, end)
        results = []
        if df.empty:
            return {"anomalies": results}
        for pid, sub in df.groupby("product_id"):
            curr = sub[(sub["date"] >= start) & (sub["date"] <= end)]
            prev = sub[(sub["date"] >= prev_start) & (sub["date"] <= prev_end)]
            if curr.empty or prev.empty or prev["visits"].sum() == 0 or prev["orders"].sum() == 0:
                continue
            traffic_change = (curr["visits"].sum() - prev["visits"].sum()) / prev["visits"].sum() * 100
            orders_change = (curr["orders"].sum() - prev["orders"].sum()) / prev["orders"].sum() * 100
            prev_conv = prev["orders"].sum() / prev["visits"].sum()
            curr_conv = curr["orders"].sum() / curr["visits"].sum() if curr["visits"].sum() else 0
            conv_change = (curr_conv - prev_conv) / prev_conv * 100 if prev_conv else 0
            if traffic_change > -3 and conv_change < -10 and orders_change < 0:
                results.append({
                    "product_id": int(pid), "product": sub["product_name"].iloc[0],
                    "traffic_change_pct": round(traffic_change, 1), "orders_change_pct": round(orders_change, 1),
                    "conversion_change_pct": round(conv_change, 1),
                })
        return {"anomalies": results}


class GetReturnAnomaliesTool(AgentTool):
    name = "get_return_anomalies"
    description = "Get products whose return rate is far above their category benchmark."
    parameters = {"type": "object", "properties": {"days": {"type": "integer"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, **_):
        rows = self.engine.get_product_table(days=days)
        anomalies = []
        for r in rows:
            cat_avg = r["category_avg_return_rate"] or 0
            if cat_avg > 0 and r["units_sold"] >= 5:
                ratio = r["return_rate"] / cat_avg
                if ratio >= 1.6 and r["return_rate"] > 8:
                    anomalies.append({**r, "ratio_vs_category": round(ratio, 2)})
        return {"anomalies": anomalies}


class EstimateRevenueImpactTool(AgentTool):
    name = "estimate_revenue_impact"
    description = "Estimate potential revenue exposure for a product using sales velocity, days of stock, and price. This is an estimate, not a guaranteed loss."
    parameters = {"type": "object", "properties": {"product_id": {"type": "integer"}, "days": {"type": "integer"}}, "required": ["product_id"]}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, product_id: int, days: int = 30, **_):
        return {
            "product_id": product_id,
            "revenue_at_risk": self.engine.get_revenue_at_risk(product_id, days=days),
            "days_of_stock": self.engine.get_inventory_days(product_id, days=days),
            "sales_velocity": self.engine.get_sales_velocity(product_id, days=days),
        }


class GetRelatedOpportunitiesTool(AgentTool):
    name = "get_related_opportunities"
    description = "Get related business opportunities (pricing, excess inventory, underperformers) for broader context."
    parameters = {"type": "object", "properties": {"days": {"type": "integer"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, **_):
        rows = self.engine.get_product_table(days=days)
        excess = [r for r in rows if r["days_of_stock"] and r["days_of_stock"] > 60]
        return {"excess_inventory": excess[:5]}


class GetActiveAlertsTool(AgentTool):
    """Used both for dedup checks and for the Agent Assistant chat."""
    name = "get_active_alerts"
    description = "Get currently active (non-resolved, non-dismissed) alerts, optionally filtered by KPI."
    parameters = {"type": "object", "properties": {"kpi_name": {"type": "string"}}}

    def __init__(self, db):
        self.db = db

    def execute(self, kpi_name: str = None, **_):
        q = self.db.query(Alert).filter(Alert.status.notin_(["Resolved", "Dismissed"]))
        if kpi_name:
            q = q.filter(Alert.kpi_name == kpi_name)
        alerts = q.order_by(Alert.created_at.desc()).all()
        return {"alerts": [
            {"id": a.id, "title": a.title, "severity": a.severity, "status": a.status, "kpi_name": a.kpi_name}
            for a in alerts
        ]}