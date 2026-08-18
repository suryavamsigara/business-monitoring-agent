from datetime import datetime
from supabase import Client
from app.analytics.anomaly_detector import clean_num
from app.utils.record import RowRecord


class AgentRunRepository:
    def __init__(self, client: Client):
        self.client = client

    def create_run(self, trigger: str = "manual") -> RowRecord:
        max_res = self.client.table("agent_runs").select("id").order("id", desc=True).limit(1).execute()
        next_id = (max_res.data[0]["id"] + 1) if (max_res.data and len(max_res.data) > 0) else 1

        payload = {
            "id": next_id,
            "trigger": trigger,
            "status": "Running",
            "started_at": datetime.utcnow().isoformat(),
        }
        res = self.client.table("agent_runs").insert(payload).execute()
        data = res.data[0] if res.data else payload
        data["steps"] = []
        return RowRecord(data)

    def complete_run(self, run: RowRecord, **fields) -> RowRecord:
        completed_at = datetime.utcnow().isoformat()
        status = fields.pop("status", "Completed")
        payload = {
            "status": status,
            "completed_at": completed_at,
        }
        for k, v in fields.items():
            payload[k] = clean_num(v)

        res = self.client.table("agent_runs").update(payload).eq("id", run.id).execute()
        updated_data = res.data[0] if res.data else {**run.to_dict(), **payload}
        return RowRecord(updated_data)

    def add_step(self, run_id: int, step_name: str) -> RowRecord:
        max_res = self.client.table("agent_steps").select("id").order("id", desc=True).limit(1).execute()
        next_id = (max_res.data[0]["id"] + 1) if (max_res.data and len(max_res.data) > 0) else 1

        payload = {
            "id": next_id,
            "run_id": run_id,
            "step_name": step_name,
            "status": "Running",
            "started_at": datetime.utcnow().isoformat(),
        }
        res = self.client.table("agent_steps").insert(payload).execute()
        return RowRecord(res.data[0] if res.data else payload)

    def complete_step(self, step: RowRecord, status: str = "Completed", output_summary: str = None, metadata: dict = None) -> RowRecord:
        completed_at = datetime.utcnow()
        duration_ms = 0
        if hasattr(step, "started_at") and step.started_at:
            try:
                started = datetime.fromisoformat(str(step.started_at).replace("Z", ""))
                duration_ms = max(1, int((completed_at - started).total_seconds() * 1000))
            except Exception:
                duration_ms = 10

        payload = {
            "status": status,
            "completed_at": completed_at.isoformat(),
            "output_summary": output_summary,
            "duration_ms": duration_ms,
            "step_metadata": clean_num(metadata or {}),
        }
        if hasattr(step, "id") and step.id:
            res = self.client.table("agent_steps").update(payload).eq("id", step.id).execute()
            return RowRecord(res.data[0] if res.data else {**step.to_dict(), **payload})
        return RowRecord({**step.to_dict(), **payload})

    def get(self, run_id: int) -> RowRecord | None:
        res = self.client.table("agent_runs").select("*").eq("id", run_id).execute()
        if not res.data:
            return None
        run_data = res.data[0]
        steps_res = self.client.table("agent_steps").select("*").eq("run_id", run_id).order("id", desc=False).execute()
        run_data["steps"] = [RowRecord(s) for s in (steps_res.data or [])]
        return RowRecord(run_data)

    def list(self, limit: int = 50) -> list[RowRecord]:
        res = self.client.table("agent_runs").select("*").order("id", desc=True).limit(limit).execute()
        runs = []
        for r in (res.data or []):
            r["steps"] = []
            runs.append(RowRecord(r))
        return runs

    def latest(self) -> RowRecord | None:
        res = self.client.table("agent_runs").select("*").order("id", desc=True).limit(1).execute()
        if not res.data:
            return None
        run_data = res.data[0]
        steps_res = self.client.table("agent_steps").select("*").eq("run_id", run_data["id"]).order("id", desc=False).execute()
        run_data["steps"] = [RowRecord(s) for s in (steps_res.data or [])]
        return RowRecord(run_data)

    def cleanup_abandoned_runs(self):
        res = self.client.table("agent_runs").select("id").eq("status", "Running").execute()
        for r in (res.data or []):
            steps = self.client.table("agent_steps").select("id").eq("run_id", r["id"]).execute()
            if not steps.data:
                self.client.table("agent_runs").delete().eq("id", r["id"]).execute()
            else:
                self.client.table("agent_runs").update({
                    "status": "Completed",
                    "completed_at": datetime.utcnow().isoformat()
                }).eq("id", r["id"]).execute()