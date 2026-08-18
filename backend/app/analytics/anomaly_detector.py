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
    score: Optional[float] = None
    severity: Optional[str] = None
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
        if self.score is not None:
            self.score = float(self.score)
        if self.entity_id is not None:
            self.entity_id = int(self.entity_id)
        if self.marketplace_id is not None:
            self.marketplace_id = int(self.marketplace_id)
        if self.metadata is not None:
            self.metadata = clean_num(self.metadata)


class AnomalyDetector:
    def __init__(self):
        self.calc = BaselineCalculator()

    def detect_rolling_baseline(self, kpi_name: str, series: pd.Series, threshold_ratio: float,
                                  entity_type: str = None, entity_id: int = None,
                                  entity_name: str = None, marketplace_id: int = None) -> Optional[DetectedAnomaly]:
        if series.empty or len(series) < 8:
            return None
        b = self.calc.rolling_mean(series)
        if b.expected <= 0:
            return None
        dev_pct = b.deviation_pct
        if abs(dev_pct) >= threshold_ratio * 100:
            return DetectedAnomaly(
                kpi_name=kpi_name, detection_method="rolling_baseline", actual_value=b.actual,
                expected_value=b.expected, deviation_pct=dev_pct, entity_type=entity_type,
                entity_id=entity_id, entity_name=entity_name, marketplace_id=marketplace_id,
                metadata={"threshold_pct": threshold_ratio * 100, "window_days": b.window_days},
            )
        return None

    def detect_zscore(self, kpi_name: str, series: pd.Series, z_threshold: float = 2.0,
                      entity_type: str = None, entity_id: int = None,
                      entity_name: str = None, marketplace_id: int = None) -> Optional[DetectedAnomaly]:
        if series.empty or len(series) < 14:
            return None
        b = self.calc.z_score(series)
        if b.z_score is None:
            return None
        if abs(b.z_score) >= z_threshold:
            return DetectedAnomaly(
                kpi_name=kpi_name, detection_method="zscore", actual_value=b.actual,
                expected_value=b.expected, deviation_pct=b.deviation_pct, z_score=b.z_score,
                entity_type=entity_type, entity_id=entity_id, entity_name=entity_name,
                marketplace_id=marketplace_id, metadata={"z_threshold": z_threshold, "z_score": b.z_score},
            )
        return None

    def detect_threshold(self, kpi_name: str, actual: float, expected: float, ratio: float,
                         entity_type: str = None, entity_id: int = None,
                         entity_name: str = None, marketplace_id: int = None) -> Optional[DetectedAnomaly]:
        if expected <= 0:
            return None
        dev_pct = ((actual - expected) / expected) * 100
        if actual < expected * ratio:
            return DetectedAnomaly(
                kpi_name=kpi_name, detection_method="threshold", actual_value=actual,
                expected_value=expected, deviation_pct=dev_pct, entity_type=entity_type,
                entity_id=entity_id, entity_name=entity_name, marketplace_id=marketplace_id,
                metadata={"ratio": ratio},
            )
        return None

    def detect_compound_conversion_issue(self, traffic_change_pct: float, conversion_change_pct: float,
                                         orders_change_pct: float, entity_type: str = None,
                                         entity_id: int = None, entity_name: str = None,
                                         marketplace_id: int = None) -> Optional[DetectedAnomaly]:
        if traffic_change_pct >= -10 and conversion_change_pct <= -20 and orders_change_pct <= -15:
            return DetectedAnomaly(
                kpi_name="conversion_rate", detection_method="compound",
                actual_value=conversion_change_pct, expected_value=0.0,
                deviation_pct=conversion_change_pct, entity_type=entity_type,
                entity_id=entity_id, entity_name=entity_name, marketplace_id=marketplace_id,
                metadata={
                    "pattern": "traffic_sustained_conversion_dropped",
                    "traffic_change_pct": traffic_change_pct,
                    "conversion_change_pct": conversion_change_pct,
                    "orders_change_pct": orders_change_pct,
                    "suspected_cause": "Broken listing / pricing friction / bad reviews / OOS variants",
                },
            )
        return None

    def detect_compound_inventory_risk(self, revenue_change_pct: float, traffic_change_pct: float,
                                       days_of_stock: Optional[float], entity_type: str = None,
                                       entity_id: int = None, entity_name: str = None,
                                       marketplace_id: int = None) -> Optional[DetectedAnomaly]:
        if days_of_stock is not None and days_of_stock < 7 and traffic_change_pct >= -10:
            return DetectedAnomaly(
                kpi_name="inventory_days", detection_method="compound",
                actual_value=days_of_stock, expected_value=14.0,
                deviation_pct=((days_of_stock - 14.0) / 14.0) * 100,
                entity_type=entity_type, entity_id=entity_id, entity_name=entity_name,
                marketplace_id=marketplace_id,
                metadata={
                    "pattern": "high_demand_low_stock",
                    "days_of_stock": days_of_stock,
                    "traffic_change_pct": traffic_change_pct,
                    "suspected_cause": "Imminent stockout with high remaining demand",
                },
            )
        return None