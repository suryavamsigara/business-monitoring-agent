"""
Deterministic analytics engine, preserving the same business-metric
definitions used in Part 1 (Marketplace Performance Copilot):

revenue, orders, units sold, conversion rate, return rate, AOV, growth %,
sales velocity, inventory days, revenue at risk, marketplace performance.

The LLM never calculates these numbers - this module is the single source
of truth for business metrics used by both the anomaly detector and the
AI investigation tools.
"""
from datetime import date, timedelta
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from app.models.business_models import SalesDaily, Inventory, Product, Marketplace


class AnalyticsEngine:
    def __init__(self, db: Session):
        self.db = db

    # ---------- raw data access ----------

    def sales_df(self, start: date = None, end: date = None) -> pd.DataFrame:
        q = self.db.query(
            SalesDaily.date, SalesDaily.product_id, SalesDaily.marketplace_id,
            SalesDaily.impressions, SalesDaily.clicks, SalesDaily.visits,
            SalesDaily.orders, SalesDaily.units_sold, SalesDaily.revenue,
            SalesDaily.returns, SalesDaily.ad_spend,
            Product.name.label("product_name"), Product.category, Product.price, Product.cost, Product.sku,
            Marketplace.name.label("marketplace_name"),
        ).join(Product, SalesDaily.product_id == Product.id).join(
            Marketplace, SalesDaily.marketplace_id == Marketplace.id
        )
        if start:
            q = q.filter(SalesDaily.date >= start)
        if end:
            q = q.filter(SalesDaily.date <= end)
        rows = q.all()
        return pd.DataFrame(rows, columns=[
            "date", "product_id", "marketplace_id", "impressions", "clicks", "visits",
            "orders", "units_sold", "revenue", "returns", "ad_spend",
            "product_name", "category", "price", "cost", "sku", "marketplace_name",
        ])

    def inventory_df(self, as_of: date = None) -> pd.DataFrame:
        rows = self.db.query(
            Inventory.date, Inventory.product_id, Inventory.marketplace_id,
            Inventory.stock, Inventory.incoming_stock,
        ).all()
        df = pd.DataFrame(rows, columns=["date", "product_id", "marketplace_id", "stock", "incoming_stock"])
        if as_of is None and not df.empty:
            as_of = df["date"].max()
        if not df.empty:
            df = df[df["date"] == as_of]
        return df

    def latest_data_date(self) -> date:
        d = self.db.query(SalesDaily.date).order_by(SalesDaily.date.desc()).first()
        return d[0] if d else date.today()

    def period(self, days: int = 30):
        end = self.latest_data_date()
        start = end - timedelta(days=days - 1)
        prev_end = start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=days - 1)
        return start, end, prev_start, prev_end

    @staticmethod
    def pct_change(curr: float, prev: float) -> float:
        if not prev:
            return 0.0 if curr == 0 else 100.0
        return round(((curr - prev) / prev) * 100, 2)

    # ---------- KPI calculations ----------

    def _kpis(self, df: pd.DataFrame) -> dict:
        if df.empty:
            return {"revenue": 0, "orders": 0, "units_sold": 0, "conversion_rate": 0,
                    "avg_order_value": 0, "return_rate": 0, "visits": 0}
        revenue = float(df["revenue"].sum())
        orders = int(df["orders"].sum())
        units = int(df["units_sold"].sum())
        visits = int(df["visits"].sum())
        returns = int(df["returns"].sum())
        return {
            "revenue": round(revenue, 2),
            "orders": orders,
            "units_sold": units,
            "visits": visits,
            "conversion_rate": round((orders / visits * 100) if visits else 0.0, 2),
            "avg_order_value": round((revenue / orders) if orders else 0.0, 2),
            "return_rate": round((returns / units * 100) if units else 0.0, 2),
        }

    def get_revenue(self, days: int = 30, marketplace: str = None) -> dict:
        return self._kpi_with_growth("revenue", days, marketplace)

    def get_orders(self, days: int = 30, marketplace: str = None) -> dict:
        return self._kpi_with_growth("orders", days, marketplace)

    def get_conversion_rate(self, days: int = 30, marketplace: str = None) -> dict:
        return self._kpi_with_growth("conversion_rate", days, marketplace)

    def get_return_rate(self, days: int = 30, marketplace: str = None) -> dict:
        return self._kpi_with_growth("return_rate", days, marketplace)

    def get_aov(self, days: int = 30, marketplace: str = None) -> dict:
        return self._kpi_with_growth("avg_order_value", days, marketplace)

    def _kpi_with_growth(self, key: str, days: int, marketplace: str = None) -> dict:
        start, end, prev_start, prev_end = self.period(days)
        df = self.sales_df(prev_start, end)
        if marketplace:
            df = df[df["marketplace_name"] == marketplace]
        curr = self._kpis(df[(df["date"] >= start) & (df["date"] <= end)])
        prev = self._kpis(df[(df["date"] >= prev_start) & (df["date"] <= prev_end)])
        return {
            "value": curr[key], "previous": prev[key],
            "growth_pct": self.pct_change(curr[key], prev[key]),
        }

    def get_growth(self, key: str, days: int = 30, marketplace: str = None) -> float:
        return self._kpi_with_growth(key, days, marketplace)["growth_pct"]

    def daily_series(self, key: str, days: int, marketplace: str = None) -> pd.Series:
        """Return a daily time series (indexed by date) for a given KPI key,
        used by the baseline calculator / anomaly detector."""
        start, end, _, _ = self.period(days)
        df = self.sales_df(start, end)
        if marketplace:
            df = df[df["marketplace_name"] == marketplace]
        if df.empty:
            return pd.Series(dtype=float)
        daily = df.groupby("date").agg(
            revenue=("revenue", "sum"), orders=("orders", "sum"), visits=("visits", "sum"),
            units_sold=("units_sold", "sum"), returns=("returns", "sum"),
        )
        if key == "conversion_rate":
            series = np.where(daily["visits"] > 0, daily["orders"] / daily["visits"] * 100, 0)
            return pd.Series(series, index=daily.index).sort_index()
        if key == "return_rate":
            series = np.where(daily["units_sold"] > 0, daily["returns"] / daily["units_sold"] * 100, 0)
            return pd.Series(series, index=daily.index).sort_index()
        if key == "avg_order_value":
            series = np.where(daily["orders"] > 0, daily["revenue"] / daily["orders"], 0)
            return pd.Series(series, index=daily.index).sort_index()
        return daily[key].sort_index()

    def get_sales_velocity(self, product_id: int, days: int = 30) -> float:
        start, end, _, _ = self.period(days)
        df = self.sales_df(start, end)
        df = df[df["product_id"] == product_id]
        if df.empty:
            return 0.0
        return round(float(df["units_sold"].sum()) / max(days, 1), 2)

    def get_inventory_days(self, product_id: int, days: int = 30) -> float | None:
        velocity = self.get_sales_velocity(product_id, days)
        inv = self.inventory_df()
        stock = inv[inv["product_id"] == product_id]["stock"].sum() if not inv.empty else 0
        if velocity <= 0:
            return None
        return round(stock / velocity, 1)

    def get_revenue_at_risk(self, product_id: int, days: int = 30, exposure_days_cap: int = 14) -> float:
        """Estimated potential revenue exposure ~= daily sales velocity x
        min(days_of_stock, exposure_days_cap) x average selling price.
        This is an estimate, NOT a financial forecast."""
        velocity = self.get_sales_velocity(product_id, days)
        dos = self.get_inventory_days(product_id, days)
        product = self.db.query(Product).get(product_id)
        price = product.price if product else 0
        if dos is None or dos >= exposure_days_cap:
            return 0.0
        return round(velocity * min(dos, exposure_days_cap) * price, 2)

    def get_marketplace_performance(self, days: int = 30) -> list:
        start, end, prev_start, prev_end = self.period(days)
        df = self.sales_df(prev_start, end)
        results = []
        total = 0
        for mkt, sub in df.groupby("marketplace_name"):
            curr = self._kpis(sub[(sub["date"] >= start) & (sub["date"] <= end)])
            prev = self._kpis(sub[(sub["date"] >= prev_start) & (sub["date"] <= prev_end)])
            growth = self.pct_change(curr["revenue"], prev["revenue"])
            total += curr["revenue"]
            results.append({
                "marketplace": mkt, "revenue": curr["revenue"], "revenue_growth_pct": growth,
                "orders": curr["orders"], "units_sold": curr["units_sold"],
                "conversion_rate": curr["conversion_rate"], "avg_order_value": curr["avg_order_value"],
                "return_rate": curr["return_rate"],
            })
        for r in results:
            r["revenue_contribution_pct"] = round((r["revenue"] / total * 100) if total else 0, 2)
        return sorted(results, key=lambda r: r["revenue"], reverse=True)

    def get_product_table(self, days: int = 30, marketplace: str = None) -> list:
        start, end, _, _ = self.period(days)
        df = self.sales_df(start, end)
        if marketplace:
            df = df[df["marketplace_name"] == marketplace]
        if df.empty:
            return []
        inv = self.inventory_df()
        cat_return_rates = df.groupby("category").apply(
            lambda g: (g["returns"].sum() / g["units_sold"].sum() * 100) if g["units_sold"].sum() else 0
        ).to_dict()

        rows = []
        for pid, sub in df.groupby("product_id"):
            k = self._kpis(sub)
            p_inv = inv[inv["product_id"] == pid]["stock"].sum() if not inv.empty else 0
            velocity = k["units_sold"] / max(days, 1)
            dos = round(p_inv / velocity, 1) if velocity > 0 else None
            price = sub["price"].iloc[0]
            revenue_at_risk = round(velocity * min(dos or 999, 14) * price, 2) if dos is not None and dos < 14 else 0.0
            cat_avg_return = cat_return_rates.get(sub["category"].iloc[0], 0)
            status = "Healthy"
            if dos is not None and dos < 7:
                status = "Critical"
            elif dos is not None and dos < 14:
                status = "Needs Attention"
            if k["return_rate"] > cat_avg_return * 1.8 and k["return_rate"] > 8:
                status = "Critical"
            rows.append({
                "product_id": int(pid), "sku": sub["sku"].iloc[0], "product": sub["product_name"].iloc[0],
                "category": sub["category"].iloc[0],
                "marketplace": sub["marketplace_name"].iloc[0] if sub["marketplace_name"].nunique() == 1 else "Multiple",
                "revenue": k["revenue"], "units_sold": k["units_sold"], "conversion_rate": k["conversion_rate"],
                "return_rate": k["return_rate"], "category_avg_return_rate": round(cat_avg_return, 2),
                "inventory": int(p_inv), "sales_velocity": round(velocity, 2), "days_of_stock": dos,
                "revenue_at_risk": revenue_at_risk, "status": status,
            })
        return sorted(rows, key=lambda r: r["revenue"], reverse=True)

    def get_business_summary(self, days: int = 30) -> dict:
        return {
            "revenue": self.get_revenue(days), "orders": self.get_orders(days),
            "conversion_rate": self.get_conversion_rate(days), "return_rate": self.get_return_rate(days),
            "avg_order_value": self.get_aov(days),
        }