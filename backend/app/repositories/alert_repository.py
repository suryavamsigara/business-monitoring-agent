from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from app.models.agent_models import Alert


class AlertRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> Alert:
        alert = Alert(**kwargs)
        self.db.add(alert)
        self.db.flush()
        return alert

    def get(self, alert_id: int) -> Alert | None:
        return self.db.query(Alert).get(alert_id)

    def find_active_by_dedup_key(self, dedup_key: str) -> Alert | None:
        return (
            self.db.query(Alert)
            .filter(Alert.dedup_key == dedup_key, Alert.status.notin_(["Resolved", "Dismissed"]))
            .order_by(desc(Alert.created_at))
            .first()
        )

    def list(self, severity: str = None, kpi_name: str = None, marketplace_id: int = None,
              status: str = None, limit: int = 200) -> list[Alert]:
        q = self.db.query(Alert)
        if severity:
            q = q.filter(Alert.severity == severity)
        if kpi_name:
            q = q.filter(Alert.kpi_name == kpi_name)
        if marketplace_id:
            q = q.filter(Alert.marketplace_id == marketplace_id)
        if status:
            q = q.filter(Alert.status == status)
        return q.order_by(desc(Alert.created_at)).limit(limit).all()

    def update_status(self, alert_id: int, status: str) -> Alert | None:
        alert = self.get(alert_id)
        if not alert:
            return None
        alert.status = status
        now = datetime.utcnow()
        if status == "Acknowledged":
            alert.acknowledged_at = now
        elif status == "Resolved":
            alert.resolved_at = now
        elif status == "Dismissed":
            alert.dismissed_at = now
        self.db.flush()
        return alert

    def touch(self, alert: Alert, **updates) -> Alert:
        for k, v in updates.items():
            setattr(alert, k, v)
        alert.last_detected_at = datetime.utcnow()
        alert.occurrence_count = (alert.occurrence_count or 1) + 1
        self.db.flush()
        return alert

    def counts_by_severity(self) -> dict:
        alerts = self.db.query(Alert).filter(Alert.status.notin_(["Resolved", "Dismissed"])).all()
        counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for a in alerts:
            counts[a.severity] = counts.get(a.severity, 0) + 1
        return counts