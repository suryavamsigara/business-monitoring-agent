"""
Deterministic analytics engine using Supabase Client directly:
revenue, orders, units sold, conversion rate, return rate, AOV, growth %,
sales velocity, inventory days, revenue at risk, marketplace performance.
"""
from datetime import date, timedelta
import pandas as pd
import numpy as np
from supabase import Client
from app.database.supabase_client import get_supabase


class AnalyticsEngine:
    def __init__(self, client: Client = None):
        self.client = client or get_supabase()
        self._sales_cache = {}
        self._inventory_cache = None
        self._latest_date_cache = None
        self._products_df = None
        self._marketplaces_df = None

    def _get_products_df(self) -> pd.DataFrame:
        if self._products_df is not None:
            return self._products_df
        res = self.client.table("products").select("id, name, category, price, cost, sku").execute()
        df = pd.DataFrame(res.data or [])
        if not df.empty:
            df = df.rename(columns={"id": "product_id", "name": "product_name"})
        self._products_df = df
        return df

    def _get_marketplaces_df(self) -> pd.DataFrame:
        if self._marketplaces_df is not None:
            return self._marketplaces_df
        res = self.client.table("marketplaces").select("id, name").execute()
        df = pd.DataFrame(res.data or [])
        if not df.empty:
            df = df.rename(columns={"id": "marketplace_id", "name": "marketplace_name"})
        self._marketplaces_df = df
        return df

    def sales_df(self, start: date = None, end: date = None) -> pd.DataFrame:
        cache_key = (start, end)
        if cache_key in self._sales_cache:
            return self._sales_cache[cache_key]

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
            self._sales_cache[cache_key] = df
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

        self._sales_cache[cache_key] = sales
        return sales

    def inventory_df(self, as_of: date = None) -> pd.DataFrame:
        if self._inventory_cache is not None and as_of is None:
            return self._inventory_cache

        res = self.client.table("inventory").select("*").order("date", desc=True).limit(500).execute()
        df = pd.DataFrame(res.data or [])
        if df.empty:
            return df

        df["date"] = pd.to_datetime(df["date"]).dt.date
        if as_of is None:
            as_of = df["date"].max()
        df = df[df["date"] == as_of]

        if as_of is None:
            self._inventory_cache = df
        return df

    def latest_data_date(self) -> date:
        if self._latest_date_cache is not None:
            return self._latest_date_cache
        res = self.client.table("sales_daily").select("date").order("date", desc=True).limit(1).execute()
        if res.data and len(res.data) > 0:
            self._latest_date_cache = pd.to_datetime(res.data[0]["date"]).date()
        else:
            self._latest_date_cache = date.today()
        return self._latest_date_cache

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

    def get_all_kpis_with_growth(self, days: int = 30, marketplace: str = None) -> dict:
        start, end, prev_start, prev_end = self.period(days)
        df = self.sales_df(prev_start, end)
        if marketplace:
            df = df[df["marketplace_name"] == marketplace]
        curr = self._kpis(df[(df["date"] >= start) & (df["date"] <= end)])
        prev = self._kpis(df[(df["date"] >= prev_start) & (df["date"] <= prev_end)])

        res = {}
        for key in ["revenue", "orders", "conversion_rate", "return_rate", "avg_order_value"]:
            res[key] = {
                "value": curr[key],
                "previous": prev[key],
                "growth_pct": self.pct_change(curr[key], prev[key]),
            }
        return res

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

        inv_df = self.inventory_df()
        stock_by_product = inv_df.groupby("product_id")["stock"].sum().to_dict() if not inv_df.empty else {}

        cat_grouped = df.groupby("category").agg(total_returns=("returns", "sum"), total_units=("units_sold", "sum"))
        cat_return_rates = (cat_grouped["total_returns"] / cat_grouped["total_units"] * 100).fillna(0).to_dict()

        prod_agg = df.groupby("product_id").agg(
            sku=("sku", "first"),
            product_name=("product_name", "first"),
            category=("category", "first"),
            price=("price", "first"),
            marketplace_count=("marketplace_name", "nunique"),
            marketplace_first=("marketplace_name", "first"),
            revenue=("revenue", "sum"),
            orders=("orders", "sum"),
            units_sold=("units_sold", "sum"),
            visits=("visits", "sum"),
            returns=("returns", "sum"),
        ).reset_index()

        rows = []
        for _, row in prod_agg.iterrows():
            pid = int(row["product_id"])
            rev = round(float(row["revenue"]), 2)
            units = int(row["units_sold"])
            visits = int(row["visits"])
            orders = int(row["orders"])
            returns = int(row["returns"])
            price = float(row["price"])
            cat = str(row["category"])

            conv_rate = round((orders / visits * 100) if visits else 0.0, 2)
            ret_rate = round((returns / units * 100) if units else 0.0, 2)
            p_inv = int(stock_by_product.get(pid, 0))
            velocity = round(units / max(days, 1), 2)
            dos = round(p_inv / velocity, 1) if velocity > 0 else None
            cat_avg_return = cat_return_rates.get(cat, 0.0)

            revenue_at_risk = round(velocity * min(dos or 999, 14) * price, 2) if dos is not None and dos < 14 else 0.0

            status = "Healthy"
            if dos is not None and dos < 7:
                status = "Critical"
            elif dos is not None and dos < 14:
                status = "Needs Attention"
            if ret_rate > cat_avg_return * 1.8 and ret_rate > 8:
                status = "Critical"

            mkt_label = str(row["marketplace_first"]) if row["marketplace_count"] == 1 else "Multiple"

            rows.append({
                "product_id": pid, "sku": row["sku"], "product": row["product_name"],
                "category": cat, "marketplace": mkt_label, "revenue": rev,
                "units_sold": units, "conversion_rate": conv_rate, "return_rate": ret_rate,
                "category_avg_return_rate": round(cat_avg_return, 2), "inventory": p_inv,
                "sales_velocity": velocity, "days_of_stock": dos,
                "revenue_at_risk": revenue_at_risk, "status": status,
            })

        return sorted(rows, key=lambda r: r["revenue"], reverse=True)

    def get_business_summary(self, days: int = 30) -> dict:
        kpis = self.get_all_kpis_with_growth(days)
        return {
            "revenue": kpis["revenue"],
            "orders": kpis["orders"],
            "conversion_rate": kpis["conversion_rate"],
            "return_rate": kpis["return_rate"],
            "avg_order_value": kpis["avg_order_value"],
        }


def get_analytics_engine(client: Client = None) -> AnalyticsEngine:
    return AnalyticsEngine(client)