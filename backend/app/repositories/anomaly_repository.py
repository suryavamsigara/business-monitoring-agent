from datetime import datetime
from supabase import Client
from app.analytics.anomaly_detector import clean_num
from app.utils.record import RowRecord


class AnomalyRepository:
    def __init__(self, client: Client):
        self.client = client

    def create(self, **kwargs) -> RowRecord:
        cleaned = {k: clean_num(v) for k, v in kwargs.items()}
        if "id" not in cleaned:
            max_res = self.client.table("anomalies").select("id").order("id", desc=True).limit(1).execute()
            next_id = (max_res.data[0]["id"] + 1) if (max_res.data and len(max_res.data) > 0) else 1
            cleaned["id"] = next_id

        if "detected_at" not in cleaned or not cleaned["detected_at"]:
            cleaned["detected_at"] = datetime.utcnow().isoformat()
        elif hasattr(cleaned["detected_at"], "isoformat"):
            cleaned["detected_at"] = cleaned["detected_at"].isoformat()

        res = self.client.table("anomalies").insert(cleaned).execute()
        return RowRecord(res.data[0] if res.data else cleaned)

    def get(self, anomaly_id: int) -> RowRecord | None:
        res = self.client.table("anomalies").select("*").eq("id", anomaly_id).execute()
        return RowRecord(res.data[0]) if res.data else None

    def list(self, kpi_name: str = None, limit: int = 100) -> list[RowRecord]:
        q = self.client.table("anomalies").select("*")
        if kpi_name:
            q = q.eq("kpi_name", kpi_name)
        res = q.order("id", desc=True).limit(limit).execute()
        return [RowRecord(r) for r in (res.data or [])]