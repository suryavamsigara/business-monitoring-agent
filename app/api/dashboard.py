from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.analytics.analytics_engine import AnalyticsEngine
from app.repositories.alert_repository import AlertRepository
from app.repositories.agent_run_repository import AgentRunRepository
from app.models.business_models import Product, Marketplace

router = APIRouter(prefix="/api/pulse", tags=["dashboard"])


@router.get("/summary")
def get_pulse_summary(db: Session = Depends(get_db)):
    engine = AnalyticsEngine(db)
    alert_repo = AlertRepository(db)
    run_repo = AgentRunRepository(db)

    latest_run = run_repo.latest()
    recent_alerts = alert_repo.list(limit=6)

    return {
        "business_summary": engine.get_business_summary(days=30),
        "marketplaces_monitored": db.query(Marketplace).count(),
        "products_monitored": db.query(Product).count(),
        "alert_counts": alert_repo.counts_by_severity(),
        "recent_alerts": [
            {
                "id": a.id, "title": a.title, "severity": a.severity, "status": a.status,
                "deviation_pct": a.deviation_pct, "created_at": str(a.created_at),
            } for a in recent_alerts
        ],
        "last_run": {
            "id": latest_run.id, "status": latest_run.status,
            "started_at": str(latest_run.started_at),
            "anomalies_detected": latest_run.anomalies_detected,
            "alerts_created": latest_run.alerts_created,
        } if latest_run else None,
    }


@router.get("/trends")
def get_pulse_trends(days: int = 30, db: Session = Depends(get_db)):
    engine = AnalyticsEngine(db)
    series = engine.daily_series("revenue", days=days)
    return {"trend": [{"date": str(d), "revenue": round(float(v), 2)} for d, v in series.items()]}