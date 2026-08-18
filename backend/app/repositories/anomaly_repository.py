from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.agent_models import Anomaly


class AnomalyRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, **kwargs) -> Anomaly:
        anomaly = Anomaly(**kwargs)
        self.db.add(anomaly)
        self.db.flush()
        return anomaly

    def get(self, anomaly_id: int) -> Anomaly | None:
        return self.db.query(Anomaly).get(anomaly_id)

    def list(self, kpi_name: str = None, limit: int = 100) -> list[Anomaly]:
        q = self.db.query(Anomaly)
        if kpi_name:
            q = q.filter(Anomaly.kpi_name == kpi_name)
        return q.order_by(desc(Anomaly.detected_at)).limit(limit).all()