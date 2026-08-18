"""
AlertService: creates/updates alerts from investigated anomalies, handling
deduplication and cooldown-based re-notification, and manages the alert
lifecycle (Acknowledge/Resolve/Dismiss) using Supabase.
"""
from datetime import datetime, timedelta
from supabase import Client
from app.repositories.alert_repository import AlertRepository
from app.repositories.anomaly_repository import AnomalyRepository
from app.analytics.anomaly_detector import DetectedAnomaly
from app.analytics.severity_scorer import SeverityScorer
from app.agent.state import InvestigationResult
from app.services.notification_service import NotificationService, InAppNotificationService
from app.config.settings import settings

SEVERITY_RANK = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}


class AlertService:
    def __init__(self, client: Client, notifier: NotificationService = None):
        self.client = client
        self.alerts = AlertRepository(client)
        self.anomalies = AnomalyRepository(client)
        self.scorer = SeverityScorer()
        self.notifier = notifier or InAppNotificationService()

    @staticmethod
    def build_dedup_key(anomaly: DetectedAnomaly) -> str:
        return f"{anomaly.kpi_name}:{anomaly.entity_type or 'business'}:{anomaly.entity_id or 0}:{anomaly.detection_method}"

    def create_or_update(self, anomaly: DetectedAnomaly, investigation: InvestigationResult,
                          ai_mode: str, run_id: int = None):
        severity_result = self.scorer.score(
            deviation_pct=anomaly.deviation_pct,
            estimated_impact_0_1=min(1.0, (investigation.estimated_impact or 0) / 100000) if investigation.estimated_impact else 0.3,
            confidence_0_1=investigation.confidence,
        )
        llm_rank = SEVERITY_RANK.get(investigation.severity.capitalize(), 1)
        det_rank = SEVERITY_RANK.get(severity_result.severity, 1)
        final_severity = severity_result.severity if det_rank >= llm_rank else investigation.severity.capitalize()

        anomaly_record = self.anomalies.create(
            kpi_name=anomaly.kpi_name, actual_value=anomaly.actual_value, expected_value=anomaly.expected_value,
            deviation_pct=anomaly.deviation_pct, score=severity_result.score, severity=final_severity,
            entity_type=anomaly.entity_type, entity_id=anomaly.entity_id, marketplace_id=anomaly.marketplace_id,
            detection_method=anomaly.detection_method, anomaly_metadata=anomaly.metadata,
        )

        dedup_key = self.build_dedup_key(anomaly)
        existing = self.alerts.find_active_by_dedup_key(dedup_key)

        title = self._build_title(anomaly)
        evidence = investigation.evidence or investigation.key_findings
        contributors = [{"name": c} for c in investigation.contributors]
        recommendations = [{"action": r, "priority": final_severity} for r in investigation.recommendations]

        if existing:
            last_ts = getattr(existing, "last_detected_at", None) or getattr(existing, "created_at", None)
            if isinstance(last_ts, str):
                try:
                    last_ts = datetime.fromisoformat(last_ts.replace("Z", ""))
                except Exception:
                    last_ts = datetime.utcnow() - timedelta(days=1)
            elif not last_ts:
                last_ts = datetime.utcnow() - timedelta(days=1)

            cooldown_elapsed = datetime.utcnow() - last_ts > timedelta(minutes=settings.ALERT_COOLDOWN_MINUTES)
            severity_worsened = SEVERITY_RANK.get(final_severity, 0) > SEVERITY_RANK.get(getattr(existing, "severity", "Low"), 0)

            updated = self.alerts.touch(
                existing, anomaly_id=anomaly_record.id, run_id=run_id, severity=final_severity,
                actual_value=anomaly.actual_value, expected_value=anomaly.expected_value,
                deviation_pct=anomaly.deviation_pct, summary=investigation.summary,
                evidence=evidence, contributors=contributors, recommendations=recommendations,
                confidence=investigation.confidence, ai_mode=ai_mode,
            )
            if cooldown_elapsed or severity_worsened:
                self.notifier.notify(updated, is_update=True)
            return updated, False

        alert = self.alerts.create(
            anomaly_id=anomaly_record.id, run_id=run_id, title=title, kpi_name=anomaly.kpi_name,
            entity_type=anomaly.entity_type, entity_name=anomaly.entity_name, marketplace_id=anomaly.marketplace_id,
            severity=final_severity, actual_value=anomaly.actual_value, expected_value=anomaly.expected_value,
            deviation_pct=anomaly.deviation_pct, estimated_impact=investigation.estimated_impact,
            summary=investigation.summary, evidence=evidence, contributors=contributors,
            recommendations=recommendations, confidence=investigation.confidence, ai_mode=ai_mode,
            status="New", dedup_key=dedup_key, occurrence_count=1,
        )
        self.notifier.notify(alert, is_update=False)
        return alert, True

    @staticmethod
    def _build_title(anomaly: DetectedAnomaly) -> str:
        entity = anomaly.entity_name or "Business-wide"
        kpi_label = anomaly.kpi_name.replace("_", " ").title()
        return f"{entity} {kpi_label} Anomaly"

    def acknowledge(self, alert_id: int):
        return self.alerts.update_status(alert_id, "Acknowledged")

    def resolve(self, alert_id: int):
        return self.alerts.update_status(alert_id, "Resolved")

    def dismiss(self, alert_id: int):
        return self.alerts.update_status(alert_id, "Dismissed")

    def set_status(self, alert_id: int, status: str):
        valid = {"New", "Investigating", "Acknowledged", "Resolved", "Dismissed"}
        if status not in valid:
            raise ValueError(f"Invalid status '{status}'")
        return self.alerts.update_status(alert_id, status)