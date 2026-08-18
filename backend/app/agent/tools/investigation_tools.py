"""
Concrete AgentTool implementations wrapping the AnalyticsEngine and Supabase.
"""
from supabase import Client
from app.agent.tools.base import AgentTool
from app.analytics.analytics_engine import AnalyticsEngine


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
    description = "Identify top/bottom products driving recent KPI changes, filtered by status (Critical, Needs Attention) or category."
    parameters = {
        "type": "object",
        "properties": {
            "days": {"type": "integer"}, "marketplace": {"type": "string"}, "limit": {"type": "integer"},
        },
    }

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, marketplace: str = None, limit: int = 5, **_):
        rows = self.engine.get_product_table(days=days, marketplace=marketplace)
        risky = [r for r in rows if r["status"] in ("Critical", "Needs Attention")]
        return {"contributors": (risky or rows)[:limit]}


class GetInventoryRisksTool(AgentTool):
    name = "get_inventory_risks"
    description = "List products with low days of stock (stockout risk) or critical inventory status, sorted by revenue at risk."
    parameters = {
        "type": "object",
        "properties": {
            "days": {"type": "integer"}, "max_days_of_stock": {"type": "number", "default": 14},
        },
    }

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, max_days_of_stock: float = 14.0, **_):
        rows = self.engine.get_product_table(days=days)
        risky = [r for r in rows if r["days_of_stock"] is not None and r["days_of_stock"] <= max_days_of_stock]
        return {"inventory_risks": sorted(risky, key=lambda r: r["revenue_at_risk"], reverse=True)[:10]}


class GetConversionAnomaliesTool(AgentTool):
    name = "get_conversion_anomalies"
    description = "Get products where visits were sustained or grew but conversion dropped significantly (possible UX, broken listing, or price issue)."
    parameters = {"type": "object", "properties": {"days": {"type": "integer"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, **_):
        start, end, prev_start, prev_end = self.engine.period(days)
        df = self.engine.sales_df(prev_start, end)
        if df.empty:
            return {"conversion_anomalies": []}
        curr = df[(df["date"] >= start) & (df["date"] <= end)].groupby("product_id").agg(
            visits=("visits", "sum"), orders=("orders", "sum"), name=("product_name", "first")
        )
        prev = df[(df["date"] >= prev_start) & (df["date"] <= prev_end)].groupby("product_id").agg(
            visits=("visits", "sum"), orders=("orders", "sum")
        )
        anomalies = []
        for pid, row in curr.iterrows():
            if pid not in prev.index:
                continue
            prev_row = prev.loc[pid]
            if prev_row["visits"] == 0 or row["visits"] == 0:
                continue
            prev_conv = prev_row["orders"] / prev_row["visits"]
            curr_conv = row["orders"] / row["visits"]
            traffic_pct = (row["visits"] - prev_row["visits"]) / prev_row["visits"] * 100
            conv_pct = (curr_conv - prev_conv) / prev_conv * 100 if prev_conv else 0
            if traffic_pct >= -10 and conv_pct <= -20:
                anomalies.append({
                    "product_id": int(pid), "product": row["name"], "traffic_change_pct": round(traffic_pct, 1),
                    "conversion_change_pct": round(conv_pct, 1),
                })
        return {"conversion_anomalies": anomalies[:5]}


class GetReturnAnomaliesTool(AgentTool):
    name = "get_return_anomalies"
    description = "Get products whose return rate is significantly above their category average."
    parameters = {"type": "object", "properties": {"days": {"type": "integer"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, **_):
        rows = self.engine.get_product_table(days=days)
        elevated = [r for r in rows if r["return_rate"] > r["category_avg_return_rate"] * 1.5 and r["return_rate"] > 5.0]
        return {"elevated_returns": sorted(elevated, key=lambda r: r["return_rate"], reverse=True)[:5]}


class EstimateRevenueImpactTool(AgentTool):
    name = "estimate_revenue_impact"
    description = "Estimate the financial impact (revenue at risk) for a specific product or marketplace."
    parameters = {
        "type": "object",
        "properties": {
            "product_id": {"type": "integer"}, "marketplace": {"type": "string"}, "days": {"type": "integer"},
        },
    }

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, product_id: int = None, marketplace: str = None, days: int = 30, **_):
        if product_id:
            dos = self.engine.get_inventory_days(product_id, days)
            velocity = self.engine.get_sales_velocity(product_id, days)
            risk = self.engine.get_revenue_at_risk(product_id, days)
            return {
                "product_id": product_id, "days_of_stock": dos, "sales_velocity": velocity,
                "revenue_at_risk": risk,
            }
        return {"error": "Provide product_id"}


class GetRelatedOpportunitiesTool(AgentTool):
    name = "get_related_opportunities"
    description = "Get related opportunities, such as excess inventory to reallocate or high-performing categories to push."
    parameters = {"type": "object", "properties": {"days": {"type": "integer"}}}

    def __init__(self, engine: AnalyticsEngine):
        self.engine = engine

    def execute(self, days: int = 30, **_):
        rows = self.engine.get_product_table(days=days)
        excess = [r for r in rows if r["days_of_stock"] and r["days_of_stock"] > 60]
        return {"excess_inventory": excess[:5]}


class GetActiveAlertsTool(AgentTool):
    name = "get_active_alerts"
    description = "Get currently active (non-resolved, non-dismissed) alerts, optionally filtered by KPI."
    parameters = {"type": "object", "properties": {"kpi_name": {"type": "string"}}}

    def __init__(self, client: Client):
        self.client = client

    def execute(self, kpi_name: str = None, **_):
        q = self.client.table("alerts").select("id, title, severity, status, kpi_name").not_.in_("status", ["Resolved", "Dismissed"])
        if kpi_name:
            q = q.eq("kpi_name", kpi_name)
        res = q.order("id", desc=True).execute()
        return {"alerts": res.data or []}