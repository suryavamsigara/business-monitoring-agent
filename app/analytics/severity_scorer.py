"""
SeverityScorer: interpretable prioritization heuristic (NOT a machine
learning model).

Severity Score = 0.40 x magnitude + 0.35 x business_impact + 0.25 x confidence
Normalized 0-100.

80-100 = Critical
60-79  = High
40-59  = Medium
0-39   = Low
"""
from dataclasses import dataclass


@dataclass
class SeverityResult:
    score: float
    severity: str


class SeverityScorer:
    WEIGHTS = {"magnitude": 0.40, "impact": 0.35, "confidence": 0.25}

    def score(self, deviation_pct: float, estimated_impact_0_1: float, confidence_0_1: float) -> SeverityResult:
        magnitude = min(1.0, abs(deviation_pct) / 30.0)  # 30%+ deviation = max magnitude
        impact = max(0.0, min(1.0, estimated_impact_0_1))
        confidence = max(0.0, min(1.0, confidence_0_1))

        raw = (
            self.WEIGHTS["magnitude"] * magnitude
            + self.WEIGHTS["impact"] * impact
            + self.WEIGHTS["confidence"] * confidence
        )
        score = round(raw * 100, 1)
        return SeverityResult(score=score, severity=self._bucket(score))

    @staticmethod
    def _bucket(score: float) -> str:
        if score >= 80:
            return "Critical"
        if score >= 60:
            return "High"
        if score >= 40:
            return "Medium"
        return "Low"