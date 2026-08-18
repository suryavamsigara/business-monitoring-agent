from supabase import Client
from app.utils.record import RowRecord

DEFAULT_RULES = [
    {"kpi_name": "revenue", "threshold_type": "rolling_baseline", "threshold_value": 0.10, "severity": "High", "cooldown_minutes": 120},
    {"kpi_name": "orders", "threshold_type": "rolling_baseline", "threshold_value": 0.12, "severity": "Medium", "cooldown_minutes": 120},
    {"kpi_name": "avg_order_value", "threshold_type": "rolling_baseline", "threshold_value": 0.15, "severity": "Medium", "cooldown_minutes": 120},
    {"kpi_name": "conversion_rate", "threshold_type": "rolling_baseline", "threshold_value": 0.12, "severity": "High", "cooldown_minutes": 120},
    {"kpi_name": "return_rate", "threshold_type": "rolling_baseline", "threshold_value": 0.30, "severity": "Medium", "cooldown_minutes": 180},
    {"kpi_name": "marketplace_revenue", "threshold_type": "rolling_baseline", "threshold_value": 0.10, "severity": "High", "cooldown_minutes": 120},
    {"kpi_name": "inventory_days", "threshold_type": "threshold", "threshold_value": 7, "severity": "Critical", "cooldown_minutes": 240},
    {"kpi_name": "sales_velocity", "threshold_type": "zscore", "threshold_value": 2.0, "severity": "Medium", "cooldown_minutes": 180},
]


class MonitoringRuleRepository:
    def __init__(self, client: Client):
        self.client = client

    def list(self, enabled_only: bool = False) -> list[RowRecord]:
        q = self.client.table("monitoring_rules").select("*")
        if enabled_only:
            q = q.eq("enabled", True)
        res = q.execute()
        return [RowRecord(r) for r in (res.data or [])]

    def get(self, rule_id: int) -> RowRecord | None:
        res = self.client.table("monitoring_rules").select("*").eq("id", rule_id).execute()
        return RowRecord(res.data[0]) if res.data else None

    def get_by_kpi(self, kpi_name: str) -> RowRecord | None:
        res = self.client.table("monitoring_rules").select("*").eq("kpi_name", kpi_name).execute()
        return RowRecord(res.data[0]) if res.data else None

    def create(self, **kwargs) -> RowRecord:
        res = self.client.table("monitoring_rules").insert(kwargs).execute()
        return RowRecord(res.data[0]) if res.data else RowRecord(kwargs)

    def update(self, rule_id: int, **fields) -> RowRecord | None:
        clean_fields = {k: v for k, v in fields.items() if v is not None}
        if not clean_fields:
            return self.get(rule_id)
        res = self.client.table("monitoring_rules").update(clean_fields).eq("id", rule_id).execute()
        return RowRecord(res.data[0]) if res.data else None

    def ensure_defaults(self):
        res = self.client.table("monitoring_rules").select("id").limit(1).execute()
        if res.data and len(res.data) > 0:
            return
        self.client.table("monitoring_rules").insert(DEFAULT_RULES).execute()