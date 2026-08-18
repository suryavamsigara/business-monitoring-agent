"""
AssistantService: powers the lightweight "Agent Assistant" chat. Unlike
Part 1's Copilot, this is scoped to the Business Pulse Agent's own alerts,
anomalies, agent runs, and evidence - it answers questions ABOUT what the
agent has already detected/investigated, using the same tool architecture.
"""
import json
from sqlalchemy.orm import Session
from app.analytics.analytics_engine import AnalyticsEngine
from app.agent.tool_registry import build_investigation_registry
from app.agent.prompts import ASSISTANT_SYSTEM_PROMPT
from app.config.settings import settings
from app.repositories.alert_repository import AlertRepository
from app.repositories.agent_run_repository import AgentRunRepository


class AssistantService:
    def __init__(self, db: Session):
        self.db = db
        self.engine = AnalyticsEngine(db)
        self.alert_repo = AlertRepository(db)
        self.run_repo = AgentRunRepository(db)

    def _build_context(self, alert_id: int = None, run_id: int = None) -> str:
        parts = []
        if alert_id:
            alert = self.alert_repo.get(alert_id)
            if alert:
                parts.append("CURRENT ALERT:\n" + json.dumps({
                    "id": alert.id, "title": alert.title, "severity": alert.severity,
                    "status": alert.status, "kpi_name": alert.kpi_name,
                    "actual_value": alert.actual_value, "expected_value": alert.expected_value,
                    "deviation_pct": alert.deviation_pct, "estimated_impact": alert.estimated_impact,
                    "summary": alert.summary, "evidence": alert.evidence, "contributors": alert.contributors,
                    "recommendations": alert.recommendations, "confidence": alert.confidence,
                    "occurrence_count": alert.occurrence_count, "created_at": str(alert.created_at),
                }, default=str))
        if run_id:
            run = self.run_repo.get(run_id)
            if run:
                parts.append("AGENT RUN:\n" + json.dumps({
                    "id": run.id, "status": run.status, "kpis_checked": run.kpis_checked,
                    "anomalies_detected": run.anomalies_detected, "alerts_created": run.alerts_created,
                    "steps": [{"step": s.step_name, "status": s.status, "summary": s.output_summary} for s in run.steps],
                }, default=str))
        return "\n\n".join(parts)

    def chat(self, message: str, alert_id: int = None, run_id: int = None, history: list = None) -> dict:
        context = self._build_context(alert_id, run_id)

        if not settings.LLM_API_KEY:
            return self._fallback(message, alert_id, run_id)

        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.LLM_API_KEY)
            registry = build_investigation_registry(self.db, self.engine)

            messages = [{"role": "system", "content": ASSISTANT_SYSTEM_PROMPT}]
            if context:
                messages.append({"role": "system", "content": f"Relevant context:\n{context}"})
            for h in (history or [])[-6:]:
                messages.append({"role": h["role"], "content": h["content"]})
            messages.append({"role": "user", "content": message})

            tool_log = []
            for _ in range(4):
                resp = client.chat.completions.create(
                    model=settings.LLM_MODEL, messages=messages, tools=registry.schemas(),
                    tool_choice="auto", max_tokens=900,
                )
                msg = resp.choices[0].message
                if msg.tool_calls:
                    messages.append({"role": "assistant", "content": msg.content or "",
                                      "tool_calls": [tc.model_dump() for tc in msg.tool_calls]})
                    for tc in msg.tool_calls:
                        args = json.loads(tc.function.arguments or "{}")
                        result = registry.execute(tc.function.name, **args)
                        tool_log.append({"tool": tc.function.name, "args": args})
                        messages.append({"role": "tool", "tool_call_id": tc.id,
                                          "content": json.dumps(result, default=str)[:6000]})
                    continue
                return {"answer": msg.content, "mode": "llm", "tool_calls": tool_log}

            return {"answer": "I gathered context but couldn't finalize a response in time.", "mode": "llm", "tool_calls": tool_log}
        except Exception as e:
            fb = self._fallback(message, alert_id, run_id)
            fb["error"] = f"AI assistant unavailable ({type(e).__name__}); showing what's on record."
            return fb

    def _fallback(self, message: str, alert_id: int = None, run_id: int = None) -> dict:
        if alert_id:
            alert = self.alert_repo.get(alert_id)
            if alert:
                lines = [
                    f"**{alert.title}** — {alert.severity}, status: {alert.status}",
                    f"Actual: {alert.actual_value} vs Expected: {alert.expected_value} ({alert.deviation_pct:+.1f}%)",
                    f"Summary: {alert.summary}",
                ]
                if alert.evidence:
                    lines.append("Evidence: " + "; ".join(alert.evidence[:4]))
                if alert.recommendations:
                    recs = [r.get("action", "") for r in alert.recommendations]
                    lines.append("Recommendations: " + "; ".join(recs))
                return {"answer": "\n\n".join(lines), "mode": "fallback", "tool_calls": []}
        return {"answer": "AI assistant is unavailable and no alert context was provided. "
                           "Please check the Alerts page for on-record details.", "mode": "fallback", "tool_calls": []}