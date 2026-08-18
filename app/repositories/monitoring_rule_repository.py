from sqlalchemy.orm import Session
from app.models.agent_models import MonitoringRule

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
    def __init__(self, db: Session):
        self.db = db

    def list(self, enabled_only: bool = False) -> list[MonitoringRule]:
        q = self.db.query(MonitoringRule)
        if enabled_only:
            q = q.filter(MonitoringRule.enabled == True)  # noqa: E712
        return q.all()

    def get(self, rule_id: int) -> MonitoringRule | None:
        return self.db.query(MonitoringRule).get(rule_id)

    def get_by_kpi(self, kpi_name: str) -> MonitoringRule | None:
        return self.db.query(MonitoringRule).filter(MonitoringRule.kpi_name == kpi_name).first()

    def create(self, **kwargs) -> MonitoringRule:
        rule = MonitoringRule(**kwargs)
        self.db.add(rule)
        self.db.flush()
        return rule

    def update(self, rule_id: int, **fields) -> MonitoringRule | None:
        rule = self.get(rule_id)
        if not rule:
            return None
        for k, v in fields.items():
            if v is not None:
                setattr(rule, k, v)
        self.db.flush()
        return rule

    def ensure_defaults(self):
        if self.db.query(MonitoringRule).count() > 0:
            return
        for r in DEFAULT_RULES:
            self.db.add(MonitoringRule(**r))
        self.db.commit()