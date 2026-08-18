from datetime import datetime
from supabase import Client
from app.analytics.anomaly_detector import clean_num
from app.utils.record import RowRecord


class AlertRepository:
    def __init__(self, client: Client):
        self.client = client

    def create(self, **kwargs) -> RowRecord:
        cleaned = {k: clean_num(v) for k, v in kwargs.items()}
        if "id" not in cleaned:
            max_res = self.client.table("alerts").select("id").order("id", desc=True).limit(1).execute()
            next_id = (max_res.data[0]["id"] + 1) if (max_res.data and len(max_res.data) > 0) else 1
            cleaned["id"] = next_id

        now_iso = datetime.utcnow().isoformat()
        if "created_at" not in cleaned or not cleaned["created_at"]:
            cleaned["created_at"] = now_iso
        elif hasattr(cleaned["created_at"], "isoformat"):
            cleaned["created_at"] = cleaned["created_at"].isoformat()

        if "last_detected_at" not in cleaned or not cleaned["last_detected_at"]:
            cleaned["last_detected_at"] = now_iso
        elif hasattr(cleaned["last_detected_at"], "isoformat"):
            cleaned["last_detected_at"] = cleaned["last_detected_at"].isoformat()

        res = self.client.table("alerts").insert(cleaned).execute()
        return RowRecord(res.data[0] if res.data else cleaned)

    def get(self, alert_id: int) -> RowRecord | None:
        res = self.client.table("alerts").select("*").eq("id", alert_id).execute()
        return RowRecord(res.data[0]) if res.data else None

    def find_active_by_dedup_key(self, dedup_key: str) -> RowRecord | None:
        res = (
            self.client.table("alerts")
            .select("*")
            .eq("dedup_key", dedup_key)
            .not_.in_("status", ["Resolved", "Dismissed"])
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        return RowRecord(res.data[0]) if res.data else None

    def list(self, severity: str = None, kpi_name: str = None, marketplace_id: int = None,
             status: str = None, limit: int = 200) -> list[RowRecord]:
        q = self.client.table("alerts").select("*")
        if severity:
            q = q.eq("severity", severity)
        if kpi_name:
            q = q.eq("kpi_name", kpi_name)
        if marketplace_id:
            q = q.eq("marketplace_id", marketplace_id)
        if status:
            q = q.eq("status", status)
        res = q.order("id", desc=True).limit(limit).execute()
        return [RowRecord(r) for r in (res.data or [])]

    def update_status(self, alert_id: int, status: str) -> RowRecord | None:
        now_iso = datetime.utcnow().isoformat()
        payload = {"status": status}
        if status == "Acknowledged":
            payload["acknowledged_at"] = now_iso
        elif status == "Resolved":
            payload["resolved_at"] = now_iso
        elif status == "Dismissed":
            payload["dismissed_at"] = now_iso

        res = self.client.table("alerts").update(payload).eq("id", alert_id).execute()
        return RowRecord(res.data[0]) if res.data else None

    def touch(self, alert: RowRecord, **updates) -> RowRecord:
        cleaned = {k: clean_num(v) for k, v in updates.items()}
        cleaned["last_detected_at"] = datetime.utcnow().isoformat()
        cleaned["occurrence_count"] = (getattr(alert, "occurrence_count", 1) or 1) + 1

        res = self.client.table("alerts").update(cleaned).eq("id", alert.id).execute()
        return RowRecord(res.data[0] if res.data else {**alert.to_dict(), **cleaned})

    def counts_by_severity(self) -> dict:
        res = (
            self.client.table("alerts")
            .select("severity")
            .not_.in_("status", ["Resolved", "Dismissed"])
            .execute()
        )
        counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for a in (res.data or []):
            sev = a.get("severity")
            if sev in counts:
                counts[sev] += 1
        return counts