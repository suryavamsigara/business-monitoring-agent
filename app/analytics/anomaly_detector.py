"""
AnomalyDetector: deterministic anomaly detection. The LLM never decides
whether a KPI move is an anomaly - that decision is made entirely here.
"""
from dataclasses import dataclass, field
from typing import Optional
import numpy as np
import pandas as pd
from app.analytics.baseline_calculator import BaselineCalculator, Baseline


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
                metadata={"threshold_pct": threshold_pct * 100}, **entity,
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
                actual_value=actual, expected_value=round(baseline.expected, 2),
                deviation_pct=round(deviation * 100, 2),
                metadata={
                    "threshold_pct": threshold_pct * 100,
                    "baseline_sample_size": baseline.sample_size,
                    "sufficient_history": baseline.sufficient_history,
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
                actual_value=actual, expected_value=round(baseline.mean, 2),
                deviation_pct=round(deviation * 100, 2), z_score=round(z, 2),
                metadata={"z_threshold": z_threshold, "std": round(baseline.std, 3)},
                **entity,
            )
        return None

    def detect_threshold(self, kpi_name: str, actual: float, expected: float, ratio: float = 0.90, **entity) -> Optional[DetectedAnomaly]:
        """Simple threshold check: actual < expected * ratio."""
        if expected == 0:
            return None
        if actual < expected * ratio:
            deviation = (actual - expected) / expected
            return DetectedAnomaly(
                kpi_name=kpi_name, detection_method="threshold",
                actual_value=actual, expected_value=expected, deviation_pct=round(deviation * 100, 2),
                metadata={"ratio": ratio}, **entity,
            )
        return None

    def detect_compound_conversion_issue(self, traffic_change_pct: float, conversion_change_pct: float,
                                          orders_change_pct: float, **entity) -> Optional[DetectedAnomaly]:
        """Traffic stable/up + conversion sharply down + orders down."""
        if traffic_change_pct >= -3 and conversion_change_pct <= -10 and orders_change_pct < 0:
            return DetectedAnomaly(
                kpi_name="conversion_rate", detection_method="compound",
                actual_value=conversion_change_pct, expected_value=0, deviation_pct=conversion_change_pct,
                metadata={
                    "pattern": "conversion_issue",
                    "traffic_change_pct": traffic_change_pct,
                    "conversion_change_pct": conversion_change_pct,
                    "orders_change_pct": orders_change_pct,
                },
                **entity,
            )
        return None

    def detect_compound_inventory_risk(self, revenue_change_pct: float, traffic_change_pct: float,
                                        days_of_stock: Optional[float], **entity) -> Optional[DetectedAnomaly]:
        """Revenue down + traffic stable + inventory critical (<7 days)."""
        if revenue_change_pct <= -5 and abs(traffic_change_pct) <= 8 and days_of_stock is not None and days_of_stock < 7:
            return DetectedAnomaly(
                kpi_name="revenue", detection_method="compound",
                actual_value=revenue_change_pct, expected_value=0, deviation_pct=revenue_change_pct,
                metadata={
                    "pattern": "inventory_driven_risk",
                    "revenue_change_pct": revenue_change_pct,
                    "traffic_change_pct": traffic_change_pct,
                    "days_of_stock": days_of_stock,
                },
                **entity,
            )
        return None