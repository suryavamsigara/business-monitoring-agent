"""
Deterministic analytics engine using Supabase Client directly:
revenue, orders, units sold, conversion rate, return rate, AOV, growth %,
sales velocity, inventory days, revenue at risk, marketplace performance.
"""
from datetime import date, timedelta, datetime
import pandas as pd
import numpy as np
from supabase import Client
from app.database.supabase_client import get_supabase

# Global in-memory cache to eliminate redundant Supabase network roundtrips
_GLOBAL_SALES_CACHE = {}
_GLOBAL_CACHE_EXPIRY = {}
_GLOBAL_PRODUCTS_DF = None
_GLOBAL_PRODUCTS_TIMESTAMP = None
_GLOBAL_MARKETPLACES_DF = None
_GLOBAL_MARKETPLACES_TIMESTAMP = None
_GLOBAL_INVENTORY_CACHE = {}
_GLOBAL_INVENTORY_TIMESTAMP = None
_GLOBAL_LATEST_DATE = None
_GLOBAL_LATEST_DATE_TIMESTAMP = None

CACHE_TTL_SECONDS = 180  # 3-minute TTL for fast instantaneous dashboard loading


class AnalyticsEngine:
    def __init__(self, client: Client = None):
        self.client = client or get_supabase()

    @classmethod
    def clear_cache(cls):
        global _GLOBAL_SALES_CACHE, _GLOBAL_CACHE_EXPIRY, _GLOBAL_PRODUCTS_DF
        global _GLOBAL_MARKETPLACES_DF, _GLOBAL_INVENTORY_CACHE, _GLOBAL_LATEST_DATE
        _GLOBAL_SALES_CACHE.clear()
        _GLOBAL_CACHE_EXPIRY.clear()
        _GLOBAL_PRODUCTS_DF = None
        _GLOBAL_MARKETPLACES_DF = None
        _GLOBAL_INVENTORY_CACHE.clear()
        _GLOBAL_LATEST_DATE = None

    def _get_products_df(self) -> pd.DataFrame:
        global _GLOBAL_PRODUCTS_DF, _GLOBAL_PRODUCTS_TIMESTAMP
        now = datetime.utcnow()
        if _GLOBAL_PRODUCTS_DF is not None and _GLOBAL_PRODUCTS_TIMESTAMP and (now - _GLOBAL_PRODUCTS_TIMESTAMP).total_seconds() < CACHE_TTL_SECONDS:
            return _GLOBAL_PRODUCTS_DF

        res = self.client.table("products").select("id, name, category, price, cost, sku").execute()
        df = pd.DataFrame(res.data or [])
        if not df.empty:
            df = df.rename(columns={"id": "product_id", "name": "product_name"})
        _GLOBAL_PRODUCTS_DF = df
        _GLOBAL_PRODUCTS_TIMESTAMP = now
        return df

    def _get_marketplaces_df(self) -> pd.DataFrame:
        global _GLOBAL_MARKETPLACES_DF, _GLOBAL_MARKETPLACES_TIMESTAMP
        now = datetime.utcnow()
        if _GLOBAL_MARKETPLACES_DF is not None and _GLOBAL_MARKETPLACES_TIMESTAMP and (now - _GLOBAL_MARKETPLACES_TIMESTAMP).total_seconds() < CACHE_TTL_SECONDS:
            return _GLOBAL_MARKETPLACES_DF

        res = self.client.table("marketplaces").select("id, name").execute()
        df = pd.DataFrame(res.data or [])
        if not df.empty:
            df = df.rename(columns={"id": "marketplace_id", "name": "marketplace_name"})
        _GLOBAL_MARKETPLACES_DF = df
        _GLOBAL_MARKETPLACES_TIMESTAMP = now
        return df

    def sales_df(self, start: date = None, end: date = None) -> pd.DataFrame:
        global _GLOBAL_SALES_CACHE, _GLOBAL_CACHE_EXPIRY
        now = datetime.utcnow()
        cache_key = (start, end)

        if cache_key in _GLOBAL_SALES_CACHE:
            expiry = _GLOBAL_CACHE_EXPIRY.get(cache_key)
            if expiry and (now - expiry).total_seconds() < CACHE_TTL_SECONDS:
                return _GLOBAL_SALES_CACHE[cache_key]

        all_rows = []
        page_size = 1000
        offset = 0
        while True:
            q = (
                self.client.table("sales_daily")
                .select("date, product_id, marketplace_id, impressions, clicks, visits, orders, units_sold, revenue, returns, ad_spend")
                .order("date", desc=True)
            )
            if start:
                q = q.gte("date", start.isoformat())
            if end:
                q = q.lte("date", end.isoformat())
            res = q.range(offset, offset + page_size - 1).execute()
            rows = res.data or []
            all_rows.extend(rows)
            if len(rows) < page_size or len(all_rows) >= 30000:
                break
            offset += page_size

        sales = pd.DataFrame(all_rows)
        if sales.empty:
            df = pd.DataFrame(columns=[
                "date", "product_id", "marketplace_id", "impressions", "clicks", "visits",
                "orders", "units_sold", "revenue", "returns", "ad_spend",
                "product_name", "category", "price", "cost", "sku", "marketplace_name",
            ])
            _GLOBAL_SALES_CACHE[cache_key] = df
            _GLOBAL_CACHE_EXPIRY[cache_key] = now
            return df

        # Convert date string to date objects
        sales["date"] = pd.to_datetime(sales["date"]).dt.date

        # Join with Products and Marketplaces
        prods = self._get_products_df()
        mkts = self._get_marketplaces_df()

        if not prods.empty:
            sales = sales.merge(prods, on="product_id", how="left")
        if not mkts.empty:
            sales = sales.merge(mkts, on="marketplace_id", how="left")

        _GLOBAL_SALES_CACHE[cache_key] = sales
        _GLOBAL_CACHE_EXPIRY[cache_key] = now
        return sales

    def inventory_df(self, as_of: date = None) -> pd.DataFrame:
        global _GLOBAL_INVENTORY_CACHE, _GLOBAL_INVENTORY_TIMESTAMP
        now = datetime.utcnow()
        if as_of in _GLOBAL_INVENTORY_CACHE and _GLOBAL_INVENTORY_TIMESTAMP and (now - _GLOBAL_INVENTORY_TIMESTAMP).total_seconds() < CACHE_TTL_SECONDS:
            return _GLOBAL_INVENTORY_CACHE[as_of]

        res = self.client.table("inventory").select("*").order("date", desc=True).limit(500).execute()
        df = pd.DataFrame(res.data or [])
        if df.empty:
            return df

        df["date"] = pd.to_datetime(df["date"]).dt.date
        target_as_of = as_of if as_of is not None else df["date"].max()
        filtered = df[df["date"] == target_as_of]

        _GLOBAL_INVENTORY_CACHE[as_of] = filtered
        _GLOBAL_INVENTORY_TIMESTAMP = now
        return filtered

    def latest_data_date(self) -> date:
        global _GLOBAL_LATEST_DATE, _GLOBAL_LATEST_DATE_TIMESTAMP
        now = datetime.utcnow()
        if _GLOBAL_LATEST_DATE is not None and _GLOBAL_LATEST_DATE_TIMESTAMP and (now - _GLOBAL_LATEST_DATE_TIMESTAMP).total_seconds() < CACHE_TTL_SECONDS:
            return _GLOBAL_LATEST_DATE

        res = self.client.table("sales_daily").select("date").order("date", desc=True).limit(1).execute()
        if res.data and len(res.data) > 0:
            _GLOBAL_LATEST_DATE = pd.to_datetime(res.data[0]["date"]).date()
        else:
            _GLOBAL_LATEST_DATE = date.today()

        _GLOBAL_LATEST_DATE_TIMESTAMP = now
        return _GLOBAL_LATEST_DATE

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

    def get_avg_order_value(self, days: int = 30, marketplace: str = None) -> dict:
        return self._kpi_with_growth("avg_order_value", days, marketplace)

    def _kpi_with_growth(self, key: str, days: int = 30, marketplace: str = None) -> dict:
        start, end, prev_start, prev_end = self.period(days)
        df = self.sales_df(prev_start, end)
        if marketplace:
            df = df[df["marketplace_name"] == marketplace]
        curr_df = df[(df["date"] >= start) & (df["date"] <= end)]
        prev_df = df[(df["date"] >= prev_start) & (df["date"] <= prev_end)]
        curr = self._kpis(curr_df)
        prev = self._kpis(prev_df)
        return {
            "value": curr[key],
            "previous": prev[key],
            "growth_pct": self.pct_change(curr[key], prev[key]),
        }

    def get_business_summary(self, days: int = 30) -> dict:
        start, end, prev_start, prev_end = self.period(days)
        df = self.sales_df(prev_start, end)
        curr_df = df[(df["date"] >= start) & (df["date"] <= end)]
        prev_df = df[(df["date"] >= prev_start) & (df["date"] <= prev_end)]
        curr = self._kpis(curr_df)
        prev = self._kpis(prev_df)
        res = {}
        for key in ["revenue", "orders", "units_sold", "visits", "conversion_rate", "avg_order_value", "return_rate"]:
            res[key] = {
                "value": curr[key],
                "previous": prev[key],
                "growth_pct": self.pct_change(curr[key], prev[key]),
            }
        return res

    get_all_kpis_with_growth = get_business_summary

    def get_growth(self, key: str, days: int = 30, marketplace: str = None) -> float:
        return self._kpi_with_growth(key, days, marketplace)["growth_pct"]

    def daily_series(self, key: str, days: int, marketplace: str = None) -> pd.Series:
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
        velocity = self.get_sales_velocity(product_id, days)
        dos = self.get_inventory_days(product_id, days)
        prods = self._get_products_df()
        price = 0.0
        if not prods.empty:
            matched = prods[prods["product_id"] == product_id]
            if not matched.empty:
                price = float(matched["price"].iloc[0])
        if dos is None or dos >= exposure_days_cap:
            return 0.0
        lost_days = max(1.0, exposure_days_cap - float(dos or 0.0))
        return round(velocity * lost_days * price, 2)

    def get_marketplace_performance(self, days: int = 30) -> list:
        start, end, prev_start, prev_end = self.period(days)
        df = self.sales_df(prev_start, end)
        if df.empty:
            return []
        curr = df[(df["date"] >= start) & (df["date"] <= end)]
        prev = df[(df["date"] >= prev_start) & (df["date"] <= prev_end)]
        tot_rev = curr["revenue"].sum() or 1.0

        out = []
        mkts = sorted([m for m in curr["marketplace_name"].dropna().unique()])
        for m in mkts:
            c = curr[curr["marketplace_name"] == m]
            p = prev[prev["marketplace_name"] == m]
            c_k = self._kpis(c)
            p_k = self._kpis(p)
            out.append({
                "marketplace": m,
                "revenue": c_k["revenue"],
                "revenue_growth_pct": self.pct_change(c_k["revenue"], p_k["revenue"]),
                "orders": c_k["orders"],
                "units_sold": c_k["units_sold"],
                "conversion_rate": c_k["conversion_rate"],
                "avg_order_value": c_k["avg_order_value"],
                "return_rate": c_k["return_rate"],
                "revenue_contribution_pct": round(c_k["revenue"] / tot_rev * 100, 2),
            })
        return out

    def get_product_table(self, days: int = 30) -> list:
        start, end, prev_start, prev_end = self.period(days)
        df = self.sales_df(prev_start, end)
        if df.empty:
            return []
        curr = df[(df["date"] >= start) & (df["date"] <= end)]
        prev = df[(df["date"] >= prev_start) & (df["date"] <= prev_end)]
        inv = self.inventory_df()

        grouped = curr.groupby(["product_id", "product_name", "category"]).agg(
            revenue=("revenue", "sum"), units_sold=("units_sold", "sum"),
            orders=("orders", "sum"), visits=("visits", "sum"), returns=("returns", "sum"),
        ).reset_index()

        prev_grouped = prev.groupby("product_id").agg(revenue=("revenue", "sum")).to_dict()["revenue"]

        rows = []
        for _, row in grouped.iterrows():
            pid = int(row["product_id"])
            c_rev = float(row["revenue"])
            p_rev = float(prev_grouped.get(pid, 0.0))
            velocity = round(float(row["units_sold"]) / max(days, 1), 2)
            stock = float(inv[inv["product_id"] == pid]["stock"].sum()) if not inv.empty else 0.0
            dos = round(stock / velocity, 1) if velocity > 0 else None

            # Estimate exposure if DOS is below 14 days
            prods = self._get_products_df()
            price = 0.0
            if not prods.empty:
                m_prod = prods[prods["product_id"] == pid]
                if not m_prod.empty:
                    price = float(m_prod["price"].iloc[0])

            rev_at_risk = round(velocity * max(1.0, 14.0 - (dos or 0.0)) * price, 2) if (dos is not None and dos < 14) else 0.0

            rows.append({
                "product_id": pid,
                "product": row["product_name"],
                "category": row["category"],
                "revenue": round(c_rev, 2),
                "revenue_growth_pct": self.pct_change(c_rev, p_rev),
                "units_sold": int(row["units_sold"]),
                "conversion_rate": round((row["orders"] / row["visits"] * 100) if row["visits"] else 0.0, 2),
                "days_of_stock": dos,
                "sales_velocity": velocity,
                "revenue_at_risk": rev_at_risk,
            })
        return rows

    def get_revenue_trend(self, days: int = 30) -> list:
        start, end, _, _ = self.period(days)
        df = self.sales_df(start, end)
        if df.empty:
            return []
        daily = df.groupby("date")["revenue"].sum().reset_index()
        return [{"date": str(r["date"]), "revenue": round(float(r["revenue"]), 2)} for _, r in daily.iterrows()]