"""
AssistantService: powers the lightweight "Agent Assistant" chat scoped to
the Business Pulse Agent's own alerts, anomalies, agent runs, and evidence.
"""
import json
import logging
from supabase import Client
from app.analytics.analytics_engine import AnalyticsEngine
from app.agent.tools.tool_registry import build_investigation_registry
from app.agent.prompts import ASSISTANT_SYSTEM_PROMPT
from app.config.settings import settings
from app.repositories.alert_repository import AlertRepository
from app.repositories.agent_run_repository import AgentRunRepository

logger = logging.getLogger("business_pulse.assistant")


class AssistantService:
    def __init__(self, client: Client):
        self.client = client
        self.engine = AnalyticsEngine(client)
        self.alert_repo = AlertRepository(client)
        self.run_repo = AgentRunRepository(client)

    def _build_context(self, alert_id: int = None, run_id: int = None) -> str:
        parts = []

        # 1. Active Alerts Overview (Always present so assistant knows active incidents)
        active_alerts = self.alert_repo.list(limit=10)
        unresolved = [a for a in active_alerts if getattr(a, "status", "") not in ("Resolved", "Dismissed")]
        if unresolved:
            alerts_summary = [
                f"• Alert #{a.id}: '{a.title}' | Severity: {a.severity} | Status: {a.status} | "
                f"KPI: {a.kpi_name} ({a.deviation_pct:+.1f}% vs baseline) | Impact: ₹{getattr(a, 'estimated_impact', 0) or 0:,.0f}"
                for a in unresolved[:6]
            ]
            parts.append("ACTIVE BUSINESS ALERTS ON RECORD:\n" + "\n".join(alerts_summary))

        # 2. Specific Alert Details (if scoped)
        if alert_id:
            alert = self.alert_repo.get(alert_id)
            if alert:
                parts.append("FOCUSED ALERT DOSSIER:\n" + json.dumps({
                    "id": alert.id, "title": alert.title, "severity": alert.severity,
                    "status": alert.status, "kpi_name": alert.kpi_name,
                    "actual_value": alert.actual_value, "expected_value": alert.expected_value,
                    "deviation_pct": alert.deviation_pct, "estimated_impact": alert.estimated_impact,
                    "summary": alert.summary, "evidence": alert.evidence, "contributors": alert.contributors,
                    "recommendations": alert.recommendations, "confidence": alert.confidence,
                    "occurrence_count": alert.occurrence_count, "created_at": str(alert.created_at),
                }, default=str))

        # 3. Specific Agent Run Details (if scoped)
        if run_id:
            run = self.run_repo.get(run_id)
            if run:
                parts.append("FOCUSED AGENT RUN AUDIT:\n" + json.dumps({
                    "id": run.id, "status": run.status, "kpis_checked": run.kpis_checked,
                    "anomalies_detected": run.anomalies_detected, "alerts_created": run.alerts_created,
                    "steps": [{"step": s.step_name, "status": s.status, "summary": s.output_summary} for s in (run.steps or [])],
                }, default=str))

        return "\n\n".join(parts)

    def chat(self, message: str, alert_id: int = None, run_id: int = None, history: list = None) -> dict:
        context = self._build_context(alert_id, run_id)

        if not settings.LLM_API_KEY:
            return self._fallback(message, alert_id, run_id)

        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.LLM_API_KEY, base_url=settings.LLM_BASE_URL, timeout=20.0)
            registry = build_investigation_registry(self.client, self.engine)

            enhanced_system_prompt = (
                f"{ASSISTANT_SYSTEM_PROMPT}\n\n"
                "CONTEXT GUIDANCE:\n"
                "- If the user asks 'Why was this alert classified as Critical?' without selecting a specific alert, check the 'ACTIVE BUSINESS ALERTS ON RECORD' provided above. Identify the Critical alert(s) and explain its classification clearly, or clarify which alert they mean.\n"
                "- Always synthesize a clear, helpful direct answer in markdown with bullet points and concrete metrics.\n"
                "- Do NOT repeatedly call tools if the data is already present in the context."
            )

            messages = [{"role": "system", "content": enhanced_system_prompt}]
            if context:
                messages.append({"role": "system", "content": f"Live telemetry & on-record context:\n{context}"})
            for h in (history or [])[-6:]:
                messages.append({"role": h["role"], "content": h["content"]})
            messages.append({"role": "user", "content": message})

            tool_log = []
            
            # Step 1: Initial call with tool access
            resp = client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=messages,
                tools=registry.schemas(),
                tool_choice="auto",
                max_tokens=1500,
            )
            msg = resp.choices[0].message

            if msg.tool_calls:
                messages.append({
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [tc.model_dump() for tc in msg.tool_calls]
                })
                for tc in msg.tool_calls:
                    args = json.loads(tc.function.arguments or "{}")
                    result = registry.execute(tc.function.name, **args)
                    tool_log.append({"tool": tc.function.name, "args": args})
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, default=str)[:4000]
                    })

                # Step 2: Final response generation (force tool_choice='none' so LLM outputs a complete answer)
                final_resp = client.chat.completions.create(
                    model=settings.LLM_MODEL,
                    messages=messages,
                    max_tokens=1500,
                )
                final_content = final_resp.choices[0].message.content
                return {"answer": final_content or "Telemetry analysis complete.", "mode": "llm", "tool_calls": tool_log}

            return {"answer": msg.content or "No findings to report.", "mode": "llm", "tool_calls": tool_log}

        except Exception as e:
            logger.exception("Assistant chat encountered error, falling back to deterministic record.")
            fb = self._fallback(message, alert_id, run_id)
            fb["error"] = f"AI assistant fallback ({type(e).__name__}); showing on-record data."
            return fb

    def _fallback(self, message: str, alert_id: int = None, run_id: int = None) -> dict:
        if alert_id:
            alert = self.alert_repo.get(alert_id)
            if alert:
                lines = [
                    f"### {alert.title}",
                    f"**Severity:** {alert.severity} | **Status:** {alert.status}",
                    f"- **Actual vs Expected:** {alert.actual_value} vs {alert.expected_value} ({alert.deviation_pct:+.1f}%)",
                    f"- **Summary:** {alert.summary}",
                ]
                if alert.evidence:
                    lines.append("\n**Key Evidence Points:**\n" + "\n".join(f"- {e}" for e in alert.evidence[:4]))
                if alert.recommendations:
                    recs = [r.get("action", "") if isinstance(r, dict) else str(r) for r in alert.recommendations]
                    lines.append("\n**Prioritized Actions:**\n" + "\n".join(f"- {r}" for r in recs))
                return {"answer": "\n".join(lines), "mode": "fallback", "tool_calls": []}

        # Fallback listing all active alerts
        active = self.alert_repo.list(limit=5)
        if active:
            lines = ["### Active Business Alerts on Record:\n"]
            for a in active:
                lines.append(f"- **#{a.id} {a.title}** ({a.severity}): {a.summary}")
            lines.append("\n*Select an alert to drill down into root-cause diagnostics and recommendations.*")
            return {"answer": "\n".join(lines), "mode": "fallback", "tool_calls": []}

        return {
            "answer": "No active alert context is currently selected. Please choose an alert from the **Business Alerts** dashboard to review diagnostic evidence and operational action plans.",
            "mode": "fallback",
            "tool_calls": []
        }