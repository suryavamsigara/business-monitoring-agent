"""
InvestigationService: given a DetectedAnomaly, gathers evidence via agent
tools, invokes the LLM (DeepSeek / OpenAI) to reason about contributors and
recommendations, and synthesizes clean, executive-ready evidence statements.
"""
import json
import logging
from supabase import Client
from app.analytics.analytics_engine import AnalyticsEngine
from app.analytics.severity_scorer import SeverityScorer
from app.analytics.anomaly_detector import DetectedAnomaly
from app.agent.tools.tool_registry import build_investigation_registry
from app.agent.prompts import INVESTIGATION_SYSTEM_PROMPT
from app.agent.state import InvestigationResult
from app.config.settings import settings

logger = logging.getLogger("business_pulse.investigator")


class InvestigationService:
    def __init__(self, client: Client):
        self.client = client
        self.engine = AnalyticsEngine(client)
        self.scorer = SeverityScorer()

    def investigate(self, anomaly: DetectedAnomaly) -> tuple[InvestigationResult, list[dict], str]:
        """Returns (InvestigationResult, tool_call_log, mode)."""
        registry = build_investigation_registry(self.client, self.engine)

        # Pre-gather tool evidence in clean narrative form
        tool_log = []
        context_pieces = []

        if anomaly.entity_type == "product" and anomaly.entity_id:
            impact = registry.execute("estimate_revenue_impact", product_id=anomaly.entity_id)
            tool_log.append({"tool": "estimate_revenue_impact", "args": {"product_id": anomaly.entity_id}})
            if isinstance(impact, dict) and "error" not in impact:
                dos = impact.get("days_of_stock")
                vel = impact.get("sales_velocity", 0.0)
                risk = impact.get("revenue_at_risk", 0.0)
                dos_str = f"{dos:.1f} days" if dos is not None else "0 days (out of stock)"
                context_pieces.append(
                    f"Product Stock Analysis: '{anomaly.entity_name}' has {dos_str} of inventory remaining "
                    f"at a sales velocity of {vel:.1f} units/day, creating an estimated revenue at risk of ₹{risk:,.0f}."
                )
        else:
            contribs = registry.execute("get_product_contributors", limit=4)
            tool_log.append({"tool": "get_product_contributors", "args": {"limit": 4}})
            c_list = contribs.get("contributors", [])
            if c_list:
                c_texts = [f"{c['product']} ({c.get('status', 'Warning')}, ₹{c.get('revenue_at_risk', 0):,.0f} at risk)" for c in c_list[:3]]
                context_pieces.append(f"Top Product Contributors: {', '.join(c_texts)}.")

        perf = registry.execute("get_marketplace_performance")
        tool_log.append({"tool": "get_marketplace_performance", "args": {}})
        m_list = perf.get("marketplaces", [])
        if m_list:
            m_texts = [f"{m['marketplace']}: ₹{m['revenue']:,.0f} ({m['revenue_growth_pct']:+.1f}%)" for m in m_list if m.get("revenue", 0) > 0]
            if m_texts:
                context_pieces.append(f"Marketplace Channel Breakdown: {', '.join(m_texts)}.")

        if not settings.LLM_API_KEY:
            logger.info("No LLM_API_KEY found, using deterministic investigation.")
            return self._deterministic_investigation(anomaly, registry, context_pieces), tool_log, "fallback"

        try:
            from openai import OpenAI
            ai_client = OpenAI(
                api_key=settings.LLM_API_KEY,
                base_url=settings.LLM_BASE_URL,
                timeout=25.0
            )

            prompt = (
                f"A business KPI anomaly was detected:\n"
                f"KPI: {anomaly.kpi_name}\n"
                f"Detection method: {anomaly.detection_method}\n"
                f"Actual: {anomaly.actual_value} vs Expected: {anomaly.expected_value} ({anomaly.deviation_pct:+.1f}%)\n"
                f"Entity: {anomaly.entity_type or 'business'} - {anomaly.entity_name or 'Business-wide'}\n\n"
                f"Live Evidence Context:\n" + "\n".join(f"• {c}" for c in context_pieces) + "\n\n"
                "Synthesize your autonomous AI investigation findings into a JSON object matching this schema exactly.\n"
                "IMPORTANT: Every item in 'evidence', 'key_findings', 'contributors', and 'recommendations' MUST be a clean, human-readable sentence (never dump raw JSON strings).\n"
                "{\n"
                '  "summary": "Executive summary explaining root cause and business impact",\n'
                '  "key_findings": ["Clear finding 1", "Clear finding 2"],\n'
                '  "contributors": ["Affected Entity / Channel Name"],\n'
                '  "evidence": ["Synthesized narrative evidence point 1", "Synthesized narrative evidence point 2"],\n'
                '  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],\n'
                '  "estimated_impact": float|null,\n'
                '  "severity": "low"|"medium"|"high"|"critical",\n'
                '  "confidence": float (0.80 to 0.98),\n'
                '  "alert_required": true\n'
                "}"
            )

            resp = ai_client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": INVESTIGATION_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                response_format={"type": "json_object"}
            )

            raw_content = resp.choices[0].message.content or "{}"
            data = json.loads(raw_content)

            # Sanitize evidence to guarantee no raw JSON strings are displayed
            raw_evidence = data.get("evidence") or data.get("key_findings") or context_pieces
            clean_evidence = []
            for item in raw_evidence:
                item_str = str(item).strip()
                if item_str.startswith("{") or "{" in item_str and "}" in item_str:
                    # fallback to natural context piece
                    continue
                clean_evidence.append(item_str)
            if not clean_evidence:
                clean_evidence = context_pieces

            raw_contribs = data.get("contributors") or ([anomaly.entity_name] if anomaly.entity_name else ["Business Operations"])
            clean_contribs = [str(c) for c in raw_contribs if not str(c).startswith("{")]

            raw_recs = data.get("recommendations") or [f"Review {anomaly.kpi_name} inventory and demand replenishment on affected channels."]
            clean_recs = [str(r) for r in raw_recs if not str(r).startswith("{")]

            summary = data.get("summary") or f"AI investigation completed for {anomaly.kpi_name} on {anomaly.entity_name or 'catalog'}."

            result = InvestigationResult(
                summary=summary,
                key_findings=clean_evidence,
                contributors=clean_contribs or [anomaly.entity_name or "Catalog Operations"],
                evidence=clean_evidence,
                recommendations=clean_recs,
                estimated_impact=data.get("estimated_impact"),
                severity=str(data.get("severity", "medium")).lower(),
                confidence=float(data.get("confidence", 0.88)),
                alert_required=bool(data.get("alert_required", True)),
            )
            logger.info(f"LLM Investigation succeeded for {anomaly.kpi_name} ({anomaly.entity_name})")
            return result, tool_log, "llm"

        except Exception as e:
            logger.warning(f"LLM Investigation failed ({e}); falling back to deterministic reasoning.")
            return self._deterministic_investigation(anomaly, registry, context_pieces), tool_log, "fallback"

    def _deterministic_investigation(self, anomaly: DetectedAnomaly, registry, context_pieces: list = None) -> InvestigationResult:
        evidence = context_pieces or [
            f"{anomaly.kpi_name} deviated {anomaly.deviation_pct:+.1f}% vs expected "
            f"({anomaly.actual_value} vs {anomaly.expected_value}), detected via {anomaly.detection_method}."
        ]
        contributors = [anomaly.entity_name] if anomaly.entity_name else ["Business Operations"]

        magnitude_impact = min(1.0, abs(anomaly.deviation_pct) / 25)
        severity_result = self.scorer.score(anomaly.deviation_pct, magnitude_impact, confidence_0_1=0.5)

        return InvestigationResult(
            summary=f"Deterministic anomaly detected on {anomaly.kpi_name} ({anomaly.deviation_pct:+.1f}% vs expected).",
            key_findings=evidence,
            contributors=contributors,
            evidence=evidence,
            recommendations=["Review the affected KPI and related products/marketplaces manually."],
            estimated_impact=None,
            severity=severity_result.severity.lower(),
            confidence=0.5,
            alert_required=True,
        )