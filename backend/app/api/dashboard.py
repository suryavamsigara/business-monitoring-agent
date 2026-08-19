from fastapi import APIRouter, Depends
from supabase import Client
from app.database.session import get_db
from app.analytics.analytics_engine import AnalyticsEngine
from app.repositories.alert_repository import AlertRepository
from app.repositories.agent_run_repository import AgentRunRepository

router = APIRouter(prefix="/api/pulse", tags=["dashboard"])


@router.get("/summary")
def get_pulse_summary(client: Client = Depends(get_db)):
    engine = AnalyticsEngine(client)
    alert_repo = AlertRepository(client)
    run_repo = AgentRunRepository(client)

    latest_run = run_repo.latest()
    recent_alerts = alert_repo.list(limit=6)

    mkt_res = client.table("marketplaces").select("id").execute()
    prod_res = client.table("products").select("id").execute()

    return {
        "business_summary": engine.get_business_summary(days=30),
        "marketplaces_monitored": len(mkt_res.data or []),
        "products_monitored": len(prod_res.data or []),
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
def get_pulse_trends(days: int = 30, client: Client = Depends(get_db)):
    engine = AnalyticsEngine(client)
    series = engine.daily_series("revenue", days=days)
    return {"trend": [{"date": str(d), "revenue": round(float(v), 2)} for d, v in series.items()]}