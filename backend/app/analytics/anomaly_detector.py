"""
AnomalyDetector: deterministic anomaly detection. The LLM never decides
whether a KPI move is an anomaly - that decision is made entirely here.
"""
from dataclasses import dataclass, field
from typing import Optional, Any
import numpy as np
import pandas as pd
from app.analytics.baseline_calculator import BaselineCalculator, Baseline


def clean_num(v: Any) -> Any:
    """Convert any NumPy types to pure standard Python primitives."""
    if v is None:
        return None
    if isinstance(v, (np.floating, float)):
        return float(v)
    if isinstance(v, (np.integer, int)):
        return int(v)
    if isinstance(v, (np.bool_, bool)):
        return bool(v)
    if isinstance(v, dict):
        return {str(k): clean_num(val) for k, val in v.items()}
    if isinstance(v, (list, tuple)):
        return [clean_num(x) for x in v]
    return v


@dataclass
class DetectedAnomaly:
    kpi_name: str
    detection_method: str
    actual_value: float
    expected_value: float
    deviation_pct: float
    z_score: Optional[float] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    marketplace_id: Optional[int] = None
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        self.actual_value = float(self.actual_value)
        self.expected_value = float(self.expected_value)
        self.deviation_pct = float(self.deviation_pct)
        if self.z_score is not None:
            self.z_score = float(self.z_score)
        if self.entity_id is not None:
            self.entity_id = int(self.entity_id)
        if self.marketplace_id is not None:
            self.marketplace_id = int(self.marketplace_id)
        self.metadata = clean_num(self.metadata) or {}


class AnomalyDetector:
    """Supports threshold, relative-change, rolling-baseline, z-score, and
    compound (multi-signal) anomaly detection."""

    def __init__(self):
        self.baseline_calc = BaselineCalculator()

    def detect_relative_change(self, kpi_name: str, series: pd.Series, threshold_pct: float, **entity) -> Optional[DetectedAnomaly]:
        if series is None or len(series) < 2:
            return None
        actual = float(series.iloc[-1])
        previous = float(series.iloc[-2])
        if previous == 0:
            return None
        deviation = (actual - previous) / previous
        if abs(deviation) >= threshold_pct:
            return DetectedAnomaly(
                kpi_name=kpi_name, detection_method="relative_change",
                actual_value=actual, expected_value=previous, deviation_pct=round(deviation * 100, 2),
                metadata={"threshold_pct": float(threshold_pct * 100)}, **entity,
            )
        return None

    def detect_rolling_baseline(self, kpi_name: str, series: pd.Series, threshold_pct: float, **entity) -> Optional[DetectedAnomaly]:
        if series is None or len(series) < 2:
            return None
        actual = float(series.iloc[-1])
        baseline: Baseline = self.baseline_calc.calculate(series, exclude_last_n=1)
        if baseline.expected == 0:
            return None
        deviation = (actual - baseline.expected) / baseline.expected
        if abs(deviation) >= threshold_pct:
            return DetectedAnomaly(
                kpi_name=kpi_name, detection_method="rolling_baseline",
                actual_value=actual, expected_value=round(float(baseline.expected), 2),
                deviation_pct=round(deviation * 100, 2),
                metadata={
                    "threshold_pct": float(threshold_pct * 100),
                    "baseline_sample_size": int(baseline.sample_size),
                    "sufficient_history": bool(baseline.sufficient_history),
                },
                **entity,
            )
        return None

    def detect_zscore(self, kpi_name: str, series: pd.Series, z_threshold: float = 2.0, **entity) -> Optional[DetectedAnomaly]:
        if series is None or len(series) < 2:
            return None
        actual = float(series.iloc[-1])
        baseline: Baseline = self.baseline_calc.calculate(series, exclude_last_n=1)
        if baseline.std == 0 or not baseline.sufficient_history:
            return None  # handle zero/unavailable std gracefully
        z = (actual - baseline.mean) / baseline.std
        if abs(z) > z_threshold:
            deviation = (actual - baseline.mean) / baseline.mean if baseline.mean else 0
            return DetectedAnomaly(
                kpi_name=kpi_name, detection_method="zscore",
                actual_value=actual, expected_value=round(float(baseline.mean), 2),
                deviation_pct=round(deviation * 100, 2), z_score=round(float(z), 2),
                metadata={"z_threshold": float(z_threshold), "std": round(float(baseline.std), 3)},
                **entity,
            )
        return None

    def detect_threshold(self, kpi_name: str, actual: float, expected: float, ratio: float = 0.90, **entity) -> Optional[DetectedAnomaly]:
        """Simple threshold check: actual < expected * ratio."""
        if expected == 0:
            return None
        actual_flt = float(actual)
        expected_flt = float(expected)
        if actual_flt < expected_flt * ratio:
            deviation = (actual_flt - expected_flt) / expected_flt
            return DetectedAnomaly(
                kpi_name=kpi_name, detection_method="threshold",
                actual_value=actual_flt, expected_value=expected_flt, deviation_pct=round(deviation * 100, 2),
                metadata={"ratio": float(ratio)}, **entity,
            )
        return None

    def detect_compound_conversion_issue(self, traffic_change_pct: float, conversion_change_pct: float,
                                          orders_change_pct: float, **entity) -> Optional[DetectedAnomaly]:
        """Traffic stable/up + conversion sharply down + orders down."""
        t = float(traffic_change_pct)
        c = float(conversion_change_pct)
        o = float(orders_change_pct)
        if t >= -3 and c <= -10 and o < 0:
            return DetectedAnomaly(
                kpi_name="conversion_rate", detection_method="compound",
                actual_value=c, expected_value=0.0, deviation_pct=c,
                metadata={
                    "pattern": "conversion_issue",
                    "traffic_change_pct": t,
                    "conversion_change_pct": c,
                    "orders_change_pct": o,
                },
                **entity,
            )
        return None

    def detect_compound_inventory_risk(self, revenue_change_pct: float, traffic_change_pct: float,
                                        days_of_stock: Optional[float], **entity) -> Optional[DetectedAnomaly]:
        """Revenue down + traffic stable + inventory critical (<7 days)."""
        r = float(revenue_change_pct)
        t = float(traffic_change_pct)
        dos = float(days_of_stock) if days_of_stock is not None else None
        if r <= -5 and abs(t) <= 8 and dos is not None and dos < 7:
            return DetectedAnomaly(
                kpi_name="revenue", detection_method="compound",
                actual_value=r, expected_value=0.0, deviation_pct=r,
                metadata={
                    "pattern": "inventory_driven_risk",
                    "revenue_change_pct": r,
                    "traffic_change_pct": t,
                    "days_of_stock": dos,
                },
                **entity,
            )
        return None