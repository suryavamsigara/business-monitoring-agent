from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.agent.orchestrator import AgentOrchestrator
from app.repositories.agent_run_repository import AgentRunRepository
from app.services.scheduler_service import scheduler_service
from app.models.business_models import Product, Marketplace

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/run")
def run_agent_now(db: Session = Depends(get_db)):
    orchestrator = AgentOrchestrator(db, trigger="manual")
    result = orchestrator.run()
    return result


@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    repo = AgentRunRepository(db)
    latest = repo.latest()
    return {
        "active": scheduler_service.is_active(),
        "last_run": {
            "id": latest.id, "started_at": str(latest.started_at),
            "completed_at": str(latest.completed_at) if latest.completed_at else None,
            "status": latest.status, "anomalies_detected": latest.anomalies_detected,
            "alerts_created": latest.alerts_created,
        } if latest else None,
        "next_run_time": str(scheduler_service.next_run_time()) if scheduler_service.next_run_time() else None,
        "kpis_monitored": 8,
        "marketplaces_monitored": db.query(Marketplace).count(),
        "products_monitored": db.query(Product).count(),
    }


@router.get("/runs")
def list_runs(limit: int = 50, db: Session = Depends(get_db)):
    repo = AgentRunRepository(db)
    runs = repo.list(limit=limit)
    return {"runs": [
        {
            "id": r.id, "started_at": str(r.started_at),
            "completed_at": str(r.completed_at) if r.completed_at else None,
            "status": r.status, "trigger": r.trigger, "kpis_checked": r.kpis_checked,
            "anomalies_detected": r.anomalies_detected, "alerts_created": r.alerts_created,
        } for r in runs
    ]}


@router.get("/runs/{run_id}")
def get_run_detail(run_id: int, db: Session = Depends(get_db)):
    repo = AgentRunRepository(db)
    run = repo.get(run_id)
    if not run:
        raise HTTPException(404, "Agent run not found")
    return {
        "id": run.id, "started_at": str(run.started_at),
        "completed_at": str(run.completed_at) if run.completed_at else None,
        "status": run.status, "trigger": run.trigger, "kpis_checked": run.kpis_checked,
        "anomalies_detected": run.anomalies_detected, "alerts_created": run.alerts_created,
        "error_message": run.error_message,
        "steps": [
            {
                "id": s.id, "step_name": s.step_name, "started_at": str(s.started_at),
                "completed_at": str(s.completed_at) if s.completed_at else None,
                "status": s.status, "duration_ms": s.duration_ms,
                "output_summary": s.output_summary, "metadata": s.step_metadata,
            } for s in run.steps
        ],
    }