from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from app.models.agent_models import AgentRun, AgentStep


class AgentRunRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_run(self, trigger: str = "manual") -> AgentRun:
        run = AgentRun(trigger=trigger, status="Running")
        self.db.add(run)
        self.db.flush()
        return run

    def complete_run(self, run: AgentRun, **fields) -> AgentRun:
        run.completed_at = datetime.utcnow()
        run.status = fields.pop("status", "Completed")
        for k, v in fields.items():
            setattr(run, k, v)
        self.db.flush()
        return run

    def add_step(self, run_id: int, step_name: str) -> AgentStep:
        step = AgentStep(run_id=run_id, step_name=step_name, status="Running")
        self.db.add(step)
        self.db.flush()
        return step

    def complete_step(self, step: AgentStep, status: str = "Completed", output_summary: str = None, metadata: dict = None):
        step.completed_at = datetime.utcnow()
        step.status = status
        step.output_summary = output_summary
        step.step_metadata = metadata or {}
        if step.started_at:
            step.duration_ms = int((step.completed_at - step.started_at).total_seconds() * 1000)
        self.db.flush()
        return step

    def get(self, run_id: int) -> AgentRun | None:
        return self.db.query(AgentRun).get(run_id)

    def list(self, limit: int = 50) -> list[AgentRun]:
        return self.db.query(AgentRun).order_by(desc(AgentRun.started_at)).limit(limit).all()

    def latest(self) -> AgentRun | None:
        return self.db.query(AgentRun).order_by(desc(AgentRun.started_at)).first()