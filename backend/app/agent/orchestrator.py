"""
AgentOrchestrator: workflow controller implementing OBSERVE -> DETECT ->
INVESTIGATE -> REASON -> PRIORITIZE -> ALERT using Supabase.
"""
import logging
from supabase import Client
from app.agent.state import AgentState
from app.services.monitoring_service import MonitoringService
from app.services.investigation_service import InvestigationService
from app.services.alert_service import AlertService
from app.repositories.agent_run_repository import AgentRunRepository
from app.repositories.anomaly_repository import AnomalyRepository
from app.repositories.monitoring_rule_repository import MonitoringRuleRepository
from app.analytics.anomaly_detector import DetectedAnomaly

logger = logging.getLogger("business_pulse.orchestrator")

MIN_SCORE_FOR_INVESTIGATION = 25.0
MAX_ANOMALIES_PER_RUN = 3


class AgentOrchestrator:
    def __init__(self, client: Client, trigger: str = "manual"):
        self.client = client
        self.trigger = trigger
        self.run_repo = AgentRunRepository(client)
        self.anomaly_repo = AnomalyRepository(client)
        self.monitoring = MonitoringService(client)
        self.investigator = InvestigationService(client)
        self.alerts = AlertService(client)
        self.rule_repo = MonitoringRuleRepository(client)
        self.rule_repo.ensure_defaults()

    def run(self) -> dict:
        state = AgentState(trigger=self.trigger)
        run = self.run_repo.create_run(trigger=self.trigger)
        state.run_id = run.id

        try:
            self._observe(state)
            self._detect(state)

            candidates = self._select_candidates(state.anomalies)
            alerts_created = 0
            alerts_updated = 0
            for anomaly_dict in candidates:
                anomaly = self._dict_to_anomaly(anomaly_dict)
                investigation, tool_log, ai_mode = self._investigate(state, anomaly)
                self._reason_and_prioritize(state, investigation)
                if investigation.alert_required:
                    alert, was_created = self._alert(state, anomaly, investigation, ai_mode, tool_log)
                    if was_created:
                        alerts_created += 1
                    else:
                        alerts_updated += 1

            total_alerts_evaluated = alerts_created + alerts_updated
            self.run_repo.complete_run(
                run, status="Completed", kpis_checked=len(state.metrics.get("summary", {})) or 8,
                anomalies_detected=len(state.anomalies), alerts_created=total_alerts_evaluated,
            )
            state.status = "completed"
            state.alerts_created = total_alerts_evaluated
        except Exception as e:
            logger.exception("Agent run failed")
            try:
                self.run_repo.complete_run(run, status="Failed", error_message=str(e))
            except Exception:
                pass
            state.status = "failed"
            raise

        return {
            "run_id": run.id, "status": state.status,
            "anomalies_detected": len(state.anomalies), "alerts_created": state.alerts_created,
        }

    # ---------- workflow steps ----------

    def _observe(self, state: AgentState):
        step = self.run_repo.add_step(state.run_id, "Observe")
        metrics = self.monitoring.collect_metrics()
        state.metrics = metrics
        self.run_repo.complete_step(step, output_summary=f"Collected KPI snapshot across "
                                     f"{len(metrics.get('marketplaces', []))} marketplaces.")

    def _detect(self, state: AgentState):
        step = self.run_repo.add_step(state.run_id, "Detect")
        anomalies = self.monitoring.detect_anomalies(state.metrics)
        
        # Persist all detected anomalies to the anomalies table
        saved_anomalies = []
        for a in anomalies:
            record = self.anomaly_repo.create(
                kpi_name=a.kpi_name,
                actual_value=a.actual_value,
                expected_value=a.expected_value,
                deviation_pct=a.deviation_pct,
                score=a.score or 0.0,
                severity=a.severity or "Medium",
                entity_type=a.entity_type,
                entity_id=a.entity_id,
                marketplace_id=a.marketplace_id,
                detection_method=a.detection_method,
                anomaly_metadata=a.metadata,
            )
            a_dict = self._anomaly_to_dict(a)
            a_dict["id"] = record.id
            saved_anomalies.append(a_dict)

        state.anomalies = saved_anomalies
        self.run_repo.complete_step(
            step, output_summary=f"{len(saved_anomalies)} anomalies detected.",
            metadata={"count": len(saved_anomalies)},
        )

    def _select_candidates(self, anomalies: list[dict]) -> list[dict]:
        meaningful = [
            a for a in anomalies
            if a["detection_method"] == "compound" or abs(a["deviation_pct"]) >= 8
        ]
        ranked = sorted(meaningful, key=lambda a: abs(a["deviation_pct"]), reverse=True)
        return ranked[:MAX_ANOMALIES_PER_RUN]

    def _investigate(self, state: AgentState, anomaly: DetectedAnomaly):
        step = self.run_repo.add_step(state.run_id, "Investigate")
        state.current_anomaly = self._anomaly_to_dict(anomaly)
        investigation, tool_log, ai_mode = self.investigator.investigate(anomaly)
        self.run_repo.complete_step(
            step, output_summary=investigation.summary[:300],
            metadata={"tool_calls": tool_log, "ai_mode": ai_mode},
        )
        return investigation, tool_log, ai_mode

    def _reason_and_prioritize(self, state: AgentState, investigation):
        step = self.run_repo.add_step(state.run_id, "Reason")
        state.evidence = investigation.evidence
        state.contributors = [{"name": c} for c in investigation.contributors]
        state.recommendations = [{"action": r} for r in investigation.recommendations]
        self.run_repo.complete_step(step, output_summary=f"{len(investigation.evidence)} evidence points, "
                                     f"{len(investigation.contributors)} contributors identified.")

        step2 = self.run_repo.add_step(state.run_id, "Prioritize")
        state.severity = investigation.severity
        state.confidence = investigation.confidence
        self.run_repo.complete_step(step2, output_summary=f"Severity: {investigation.severity}, "
                                     f"confidence: {investigation.confidence:.2f}")

    def _alert(self, state: AgentState, anomaly, investigation, ai_mode, tool_log):
        step = self.run_repo.add_step(state.run_id, "Alert")
        alert, created = self.alerts.create_or_update(anomaly, investigation, ai_mode, run_id=state.run_id)
        self.run_repo.complete_step(
            step, output_summary=f"Alert {'created' if created else 'updated (deduplicated)'}: {alert.title}",
            metadata={"alert_id": alert.id, "created": created},
        )
        return alert, created

    # ---------- helpers ----------

    @staticmethod
    def _anomaly_to_dict(a: DetectedAnomaly) -> dict:
        d = {
            "kpi_name": a.kpi_name, "detection_method": a.detection_method,
            "actual_value": a.actual_value, "expected_value": a.expected_value,
            "deviation_pct": a.deviation_pct, "z_score": a.z_score,
            "score": a.score, "severity": a.severity,
            "entity_type": a.entity_type, "entity_id": a.entity_id, "entity_name": a.entity_name,
            "marketplace_id": a.marketplace_id, "metadata": a.metadata,
        }
        if hasattr(a, "id") and a.id:
            d["id"] = a.id
        return d

    @staticmethod
    def _dict_to_anomaly(d: dict) -> DetectedAnomaly:
        clean_d = {k: v for k, v in d.items() if k != "id"}
        anomaly = DetectedAnomaly(**clean_d)
        if "id" in d:
            anomaly.id = d["id"]
        return anomaly