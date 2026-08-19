from datetime import datetime, timezone
from supabase import Client
from app.analytics.anomaly_detector import clean_num
from app.utils.record import RowRecord
from app.utils.query_retry import execute_with_retry


class AgentRunRepository:
    def __init__(self, client: Client):
        self.client = client

    def create_run(self, trigger: str = "manual") -> RowRecord:
        payload = {
            "trigger": trigger,
            "status": "Running",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        res = execute_with_retry(self.client.table("agent_runs").insert(payload))
        data = res.data[0] if res.data else payload
        data["steps"] = []
        return RowRecord(data)

    def complete_run(self, run: RowRecord, **fields) -> RowRecord:
        completed_at = datetime.now(timezone.utc).isoformat()
        status = fields.pop("status", "Completed")
        payload = {
            "status": status,
            "completed_at": completed_at,
        }
        for k, v in fields.items():
            payload[k] = clean_num(v)

        res = execute_with_retry(self.client.table("agent_runs").update(payload).eq("id", run.id))
        updated_data = res.data[0] if res.data else {**run.to_dict(), **payload}
        return RowRecord(updated_data)

    def add_step(self, run_id: int, step_name: str) -> RowRecord:
        payload = {
            "run_id": run_id,
            "step_name": step_name,
            "status": "Running",
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        res = execute_with_retry(self.client.table("agent_steps").insert(payload))
        return RowRecord(res.data[0] if res.data else payload)

    def complete_step(self, step: RowRecord, status: str = "Completed", output_summary: str = None, metadata: dict = None) -> RowRecord:
        completed_at = datetime.now(timezone.utc)
        duration_ms = 0
        if hasattr(step, "started_at") and step.started_at:
            try:
                started_str = str(step.started_at).replace("Z", "")
                if "+" in started_str:
                    started_str = started_str.split("+")[0]
                started = datetime.fromisoformat(started_str)
                # Ensure naive vs aware comparison is safe
                if started.tzinfo is None:
                    completed_naive = completed_at.replace(tzinfo=None)
                    duration_ms = max(1, int((completed_naive - started).total_seconds() * 1000))
                else:
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
            res = execute_with_retry(self.client.table("agent_steps").update(payload).eq("id", step.id))
            return RowRecord(res.data[0] if res.data else {**step.to_dict(), **payload})
        return RowRecord({**step.to_dict(), **payload})

    def get(self, run_id: int) -> RowRecord | None:
        res = execute_with_retry(self.client.table("agent_runs").select("*").eq("id", run_id))
        if not res.data:
            return None
        run_data = res.data[0]
        steps_res = execute_with_retry(
            self.client.table("agent_steps").select("*").eq("run_id", run_id).order("id", desc=False)
        )
        run_data["steps"] = [RowRecord(s) for s in (steps_res.data or [])]
        return RowRecord(run_data)

    def list(self, limit: int = 50) -> list[RowRecord]:
        res = execute_with_retry(
            self.client.table("agent_runs").select("*").order("id", desc=True).limit(limit)
        )
        runs = []
        for r in (res.data or []):
            r["steps"] = []
            runs.append(RowRecord(r))
        return runs

    def latest(self) -> RowRecord | None:
        res = execute_with_retry(
            self.client.table("agent_runs").select("*").order("id", desc=True).limit(1)
        )
        if not res.data:
            return None
        run_data = res.data[0]
        steps_res = execute_with_retry(
            self.client.table("agent_steps").select("*").eq("run_id", run_data["id"]).order("id", desc=False)
        )
        run_data["steps"] = [RowRecord(s) for s in (steps_res.data or [])]
        return RowRecord(run_data)

    def cleanup_abandoned_runs(self):
        res = execute_with_retry(
            self.client.table("agent_runs").select("id").eq("status", "Running")
        )
        for r in (res.data or []):
            steps = execute_with_retry(
                self.client.table("agent_steps").select("id").eq("run_id", r["id"])
            )
            if not steps.data:
                execute_with_retry(self.client.table("agent_runs").delete().eq("id", r["id"]))
            else:
                execute_with_retry(self.client.table("agent_runs").update({
                    "status": "Completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", r["id"]))