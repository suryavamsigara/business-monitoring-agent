"""
InvestigationService: given a DetectedAnomaly, gathers evidence via agent
tools, invokes the LLM to reason about contributors/recommendations, and
validates the response against the InvestigationResult schema. Falls back
to a deterministic, evidence-only investigation if the LLM is unavailable.
"""
import json
from supabase import Client
from app.analytics.analytics_engine import AnalyticsEngine
from app.analytics.severity_scorer import SeverityScorer
from app.analytics.anomaly_detector import DetectedAnomaly
from app.agent.tools.tool_registry import build_investigation_registry
from app.agent.prompts import INVESTIGATION_SYSTEM_PROMPT
from app.agent.state import InvestigationResult
from app.config.settings import settings


class InvestigationService:
    def __init__(self, client: Client):
        self.client = client
        self.engine = AnalyticsEngine(client)
        self.scorer = SeverityScorer()

    def investigate(self, anomaly: DetectedAnomaly) -> tuple[InvestigationResult, list[dict], str]:
        """Returns (InvestigationResult, tool_call_log, mode)."""
        registry = build_investigation_registry(self.client, self.engine)

        if not settings.LLM_API_KEY:
            return self._deterministic_investigation(anomaly, registry), [], "fallback"

        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.LLM_API_KEY, base_url=settings.LLM_BASE_URL, timeout=15.0)

            question = self._build_prompt(anomaly)
            messages = [
                {"role": "system", "content": INVESTIGATION_SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ]
            tool_log = []

            for _ in range(5):
                resp = client.chat.completions.create(
                    model=settings.LLM_MODEL, messages=messages, tools=registry.schemas(),
                    tool_choice="auto", max_tokens=1200,
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

                structured = self._extract_structured(client, messages, msg.content or "")
                return structured, tool_log, "llm"

            return self._deterministic_investigation(anomaly, registry), tool_log, "fallback"
        except Exception:
            return self._deterministic_investigation(anomaly, registry), [], "fallback"

    def _build_prompt(self, anomaly: DetectedAnomaly) -> str:
        return (
            f"A deterministic anomaly was detected:\n"
            f"KPI: {anomaly.kpi_name}\n"
            f"Detection method: {anomaly.detection_method}\n"
            f"Actual: {anomaly.actual_value}\n"
            f"Expected: {anomaly.expected_value}\n"
            f"Deviation: {anomaly.deviation_pct}%\n"
            f"Entity: {anomaly.entity_type or 'business'} - {anomaly.entity_name or 'N/A'}\n"
            f"Metadata: {json.dumps(anomaly.metadata, default=str)}\n\n"
            "Investigate this anomaly using the available tools. Identify likely contributors, gather evidence, "
            "and produce your findings."
        )

    def _extract_structured(self, client, messages, fallback_text: str) -> InvestigationResult:
        schema_prompt = (
            "Based on the investigation above, respond with ONLY a JSON object (no markdown, no prose) "
            "matching this schema:\n"
            '{"summary": str, "key_findings": [str], "contributors": [str], "evidence": [str], '
            '"recommendations": [str], "estimated_impact": float|null, '
            '"severity": "low"|"medium"|"high"|"critical", "confidence": float (0-1), "alert_required": bool}'
        )
        messages = messages + [{"role": "user", "content": schema_prompt}]
        resp = client.chat.completions.create(
            model=settings.LLM_MODEL, messages=messages, max_tokens=800,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or "{}"
        try:
            data = json.loads(content)
            return InvestigationResult(**data)
        except Exception:
            return InvestigationResult(
                summary=fallback_text or "Investigation completed but structured output could not be parsed.",
                key_findings=[], contributors=[], evidence=[], recommendations=[],
                estimated_impact=None, severity="medium", confidence=0.4, alert_required=True,
            )

    def _deterministic_investigation(self, anomaly: DetectedAnomaly, registry) -> InvestigationResult:
        evidence = [f"{anomaly.kpi_name} deviated {anomaly.deviation_pct:+.1f}% vs expected "
                    f"({anomaly.actual_value} vs {anomaly.expected_value}), detected via {anomaly.detection_method}."]
        contributors = []

        if anomaly.entity_type == "product" and anomaly.entity_id:
            impact = registry.execute("estimate_revenue_impact", product_id=anomaly.entity_id)
            if isinstance(impact, dict) and "error" not in impact:
                evidence.append(f"Days of stock: {impact.get('days_of_stock')}, "
                                 f"sales velocity: {impact.get('sales_velocity')} units/day.")
                contributors.append(anomaly.entity_name or "Unknown product")
        else:
            contrib_data = registry.execute("get_product_contributors", limit=3)
            for c in contrib_data.get("contributors", [])[:3]:
                contributors.append(c["product"])
                evidence.append(f"{c['product']}: status {c['status']}, revenue at risk Rs.{c['revenue_at_risk']:,.0f}.")

        magnitude_impact = min(1.0, abs(anomaly.deviation_pct) / 25)
        severity_result = self.scorer.score(anomaly.deviation_pct, magnitude_impact, confidence_0_1=0.5)

        return InvestigationResult(
            summary=f"Deterministic anomaly detected on {anomaly.kpi_name} "
                    f"({anomaly.deviation_pct:+.1f}% vs expected). AI investigation unavailable - "
                    f"this is a deterministic, evidence-only assessment.",
            key_findings=evidence,
            contributors=contributors,
            evidence=evidence,
            recommendations=["Review the affected KPI and related products/marketplaces manually; "
                              "AI-generated recommendations were unavailable for this run."],
            estimated_impact=None,
            severity=severity_result.severity.lower(),
            confidence=0.4,
            alert_required=True,
        )