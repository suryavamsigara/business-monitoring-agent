from datetime import date, timedelta
from fastapi import APIRouter, Depends
from supabase import Client
from pydantic import BaseModel
from app.database.session import get_db
from app.analytics.analytics_engine import AnalyticsEngine
from app.repositories.alert_repository import AlertRepository
from app.repositories.agent_run_repository import AgentRunRepository
from app.agent.orchestrator import AgentOrchestrator

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


class SimulateRequest(BaseModel):
    scenario_type: str


@router.post("/simulate-scenario")
def simulate_scenario(req: SimulateRequest, client: Client = Depends(get_db)):
    """Demo Controls: modify synthetic data for controlled demo story and trigger agent."""
    scenario = req.scenario_type.lower()
    today = date(2026, 8, 18)
    recent_date = (today - timedelta(days=2)).isoformat()

    if scenario in ("revenue_drop", "amazon_revenue_drop"):
        mkt_res = client.table("marketplaces").select("id").eq("name", "Amazon").execute()
        if mkt_res.data:
            mkt_id = mkt_res.data[0]["id"]
            client.table("sales_daily").update({
                "revenue": 12000.0,
                "orders": 12,
                "units_sold": 15
            }).eq("marketplace_id", mkt_id).gte("date", recent_date).execute()

    elif scenario in ("conversion_drop", "conversion_decline"):
        prod_res = client.table("products").select("id").ilike("name", "%EcoRunner%").execute()
        if prod_res.data:
            pid = prod_res.data[0]["id"]
            client.table("sales_daily").update({
                "orders": 2,
                "revenue": 2400.0
            }).eq("product_id", pid).gte("date", recent_date).execute()

    elif scenario in ("stockout_risk", "stock_out"):
        prod_res = client.table("products").select("id").ilike("name", "%Runner Pro%").execute()
        if prod_res.data:
            pid = prod_res.data[0]["id"]
            client.table("inventory").update({
                "stock": 5,
                "incoming_stock": 0
            }).eq("product_id", pid).gte("date", recent_date).execute()

    elif scenario in ("return_spike", "returns"):
        prod_res = client.table("products").select("id").ilike("name", "%Heritage Loafer%").execute()
        if prod_res.data:
            pid = prod_res.data[0]["id"]
            client.table("sales_daily").update({
                "returns": 25
            }).eq("product_id", pid).gte("date", recent_date).execute()

    # Trigger orchestrator run
    orchestrator = AgentOrchestrator(client, trigger=f"demo_sim_{scenario}")
    run_res = orchestrator.run()

    return {
        "status": "success",
        "scenario": scenario,
        "message": f"Scenario '{scenario}' simulated and Agent executed successfully.",
        "run_result": run_res,
    }