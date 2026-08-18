"""
AgentOrchestrator: the custom-built (no LangGraph/CrewAI/AutoGen) workflow
controller implementing OBSERVE -> DETECT -> INVESTIGATE -> REASON ->
PRIORITIZE -> ALERT.

The orchestrator controls the workflow and persists an auditable run/step
trail; all actual business logic lives in the injected service classes.
"""
import logging
from sqlalchemy.orm import Session
from app.agent.state import AgentState
from app.services.monitoring_service import MonitoringService
from app.services.investigation_service import InvestigationService
from app.services.alert_service import AlertService
from app.repositories.agent_run_repository import AgentRunRepository
from app.repositories.monitoring_rule_repository import MonitoringRuleRepository
from app.analytics.anomaly_detector import DetectedAnomaly

logger = logging.getLogger("business_pulse.orchestrator")

# Anomalies below this severity score are logged but do not warrant AI
# investigation or a high-priority alert (controls cost/latency).
MIN_SCORE_FOR_INVESTIGATION = 25.0
MAX_ANOMALIES_PER_RUN = 6


class AgentOrchestrator:
    def __init__(self, db: Session, trigger: str = "manual"):
        self.db = db
        self.trigger = trigger
        self.run_repo = AgentRunRepository(db)
        self.monitoring = MonitoringService(db)
        self.investigator = InvestigationService(db)
        self.alerts = AlertService(db)
        self.rule_repo = MonitoringRuleRepository(db)
        self.rule_repo.ensure_defaults()

    def run(self) -> dict:
        state = AgentState(trigger=self.trigger)
        run = self.run_repo.create_run(trigger=self.trigger)
        state.run_id = run.id
        self.db.commit()

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
                    was_created = self._alert(state, anomaly, investigation, ai_mode, tool_log)
                    if was_created:
                        alerts_created += 1
                    else:
                        alerts_updated += 1

            self.run_repo.complete_run(
                run, status="Completed", kpis_checked=len(state.metrics.get("summary", {})) or 8,
                anomalies_detected=len(state.anomalies), alerts_created=alerts_created,
            )
            state.status = "completed"
            state.alerts_created = alerts_created
            self.db.commit()
        except Exception as e:
            logger.exception("Agent run failed")
            self.run_repo.complete_run(run, status="Failed", error_message=str(e))
            state.status = "failed"
            self.db.commit()
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
        state.anomalies = [self._anomaly_to_dict(a) for a in anomalies]
        self.run_repo.complete_step(
            step, output_summary=f"{len(anomalies)} anomalies detected.",
            metadata={"count": len(anomalies)},
        )

    def _select_candidates(self, anomalies: list[dict]) -> list[dict]:
        """Only meaningful anomalies get AI investigation - this keeps cost
        and latency bounded and avoids calling the LLM for every KPI wobble.
        Compound anomalies always qualify (they're already multi-signal)."""
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

    # ---------- helpers ----------

    @staticmethod
    def _anomaly_to_dict(a: DetectedAnomaly) -> dict:
        return {
            "kpi_name": a.kpi_name, "detection_method": a.detection_method,
            "actual_value": a.actual_value, "expected_value": a.expected_value,
            "deviation_pct": a.deviation_pct, "z_score": a.z_score,
            "entity_type": a.entity_type, "entity_id": a.entity_id, "entity_name": a.entity_name,
            "marketplace_id": a.marketplace_id, "metadata": a.metadata,
        }

    @staticmethod
    def _dict_to_anomaly(d: dict) -> DetectedAnomaly:
        return DetectedAnomaly(**d)