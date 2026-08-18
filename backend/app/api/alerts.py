from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database.session import get_db
from app.repositories.alert_repository import AlertRepository
from app.services.alert_service import AlertService
from app.models.business_models import Marketplace
from app.analytics.analytics_engine import AnalyticsEngine

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _serialize(a) -> dict:
    return {
        "id": a.id, "anomaly_id": a.anomaly_id, "run_id": a.run_id, "title": a.title,
        "kpi_name": a.kpi_name, "entity_type": a.entity_type, "entity_name": a.entity_name,
        "marketplace_id": a.marketplace_id, "severity": a.severity,
        "actual_value": a.actual_value, "expected_value": a.expected_value, "deviation_pct": a.deviation_pct,
        "estimated_impact": a.estimated_impact, "summary": a.summary, "evidence": a.evidence,
        "contributors": a.contributors, "recommendations": a.recommendations, "confidence": a.confidence,
        "ai_mode": a.ai_mode, "status": a.status, "occurrence_count": a.occurrence_count,
        "last_detected_at": str(a.last_detected_at), "created_at": str(a.created_at),
        "acknowledged_at": str(a.acknowledged_at) if a.acknowledged_at else None,
        "resolved_at": str(a.resolved_at) if a.resolved_at else None,
        "dismissed_at": str(a.dismissed_at) if a.dismissed_at else None,
    }


@router.get("")
def list_alerts(severity: Optional[str] = None, kpi_name: Optional[str] = None,
                 marketplace: Optional[str] = None, status: Optional[str] = None,
                 db: Session = Depends(get_db)):
    repo = AlertRepository(db)
    marketplace_id = None
    if marketplace:
        mkt = db.query(Marketplace).filter(Marketplace.name == marketplace).first()
        marketplace_id = mkt.id if mkt else -1
    alerts = repo.list(severity=severity, kpi_name=kpi_name, marketplace_id=marketplace_id, status=status)
    return {"alerts": [_serialize(a) for a in alerts], "total": len(alerts), "counts_by_severity": repo.counts_by_severity()}


@router.get("/{alert_id}")
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    repo = AlertRepository(db)
    alert = repo.get(alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    result = _serialize(alert)

    # Historical chart data (actual vs expected) for the alert's KPI
    engine = AnalyticsEngine(db)
    marketplace_name = None
    if alert.marketplace_id:
        mkt = db.query(Marketplace).get(alert.marketplace_id)
        marketplace_name = mkt.name if mkt else None
    kpi_for_series = "revenue" if alert.kpi_name == "marketplace_revenue" else alert.kpi_name
    if kpi_for_series in ("revenue", "orders", "conversion_rate", "return_rate", "avg_order_value"):
        series = engine.daily_series(kpi_for_series, days=30, marketplace=marketplace_name)
        result["history"] = [{"date": str(d), "actual": round(float(v), 2)} for d, v in series.items()]
    else:
        result["history"] = []

    return result


class StatusUpdate(BaseModel):
    status: str


@router.patch("/{alert_id}")
def update_alert_status(alert_id: int, body: StatusUpdate, db: Session = Depends(get_db)):
    service = AlertService(db)
    try:
        alert = service.set_status(alert_id, body.status)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not alert:
        raise HTTPException(404, "Alert not found")
    db.commit()
    return _serialize(alert)