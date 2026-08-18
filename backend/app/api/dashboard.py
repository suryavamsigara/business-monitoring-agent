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


from pydantic import BaseModel
from app.models.business_models import SalesDaily, Inventory
from app.agent.orchestrator import AgentOrchestrator
from datetime import date, timedelta


class SimulateRequest(BaseModel):
    scenario_type: str


@router.post("/simulate-scenario")
def simulate_scenario(req: SimulateRequest, db: Session = Depends(get_db)):
    """Demo Controls: modify synthetic data for controlled demo story and trigger agent."""
    scenario = req.scenario_type.lower()
    today = date(2026, 8, 18)
    recent_date = today - timedelta(days=2)

    if scenario in ("revenue_drop", "amazon_revenue_drop"):
        mkt = db.query(Marketplace).filter(Marketplace.name == "Amazon").first()
        if mkt:
            db.query(SalesDaily).filter(
                SalesDaily.marketplace_id == mkt.id,
                SalesDaily.date >= recent_date
            ).update({
                SalesDaily.revenue: SalesDaily.revenue * 0.45,
                SalesDaily.orders: SalesDaily.orders * 0.5,
                SalesDaily.units_sold: SalesDaily.units_sold * 0.5
            }, synchronize_session=False)

    elif scenario in ("conversion_drop", "conversion_decline"):
        prod = db.query(Product).filter(Product.name.like("%EcoRunner%")).first()
        if prod:
            db.query(SalesDaily).filter(
                SalesDaily.product_id == prod.id,
                SalesDaily.date >= recent_date
            ).update({
                SalesDaily.orders: SalesDaily.orders * 0.25,
                SalesDaily.revenue: SalesDaily.revenue * 0.25
            }, synchronize_session=False)

    elif scenario in ("stockout_risk", "stock_out"):
        prod = db.query(Product).filter(Product.name.like("%Runner Pro%")).first()
        if prod:
            db.query(Inventory).filter(
                Inventory.product_id == prod.id,
                Inventory.date >= recent_date
            ).update({
                Inventory.stock: 8,
                Inventory.incoming_stock: 0
            }, synchronize_session=False)

    elif scenario in ("return_spike", "returns"):
        prod = db.query(Product).filter(Product.name.like("%Heritage Loafer%")).first()
        if prod:
            db.query(SalesDaily).filter(
                SalesDaily.product_id == prod.id,
                SalesDaily.date >= recent_date
            ).update({
                SalesDaily.returns: SalesDaily.units_sold * 0.45
            }, synchronize_session=False)

    elif scenario in ("excess_inventory", "overstock"):
        prod = db.query(Product).filter(Product.name.like("%CoastalWalk%")).first()
        if prod:
            db.query(Inventory).filter(
                Inventory.product_id == prod.id,
                Inventory.date >= recent_date
            ).update({
                Inventory.stock: 2800
            }, synchronize_session=False)

    db.commit()

    # Trigger orchestrator run
    orchestrator = AgentOrchestrator(db, trigger=f"demo_sim_{scenario}")
    run_res = orchestrator.run()

    return {
        "status": "success",
        "scenario": scenario,
        "message": f"Scenario '{scenario}' simulated and Agent executed successfully.",
        "run_result": run_res,
    }