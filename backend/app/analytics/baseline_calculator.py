"""
BaselineCalculator: computes an "expected value" for a KPI from historical
data, using a rolling-average strategy. Handles insufficient-history cases
gracefully instead of raising.
"""
from dataclasses import dataclass
from typing import Optional
import pandas as pd


@dataclass
class Baseline:
    expected: float
    mean: float
    std: float
    sample_size: int
    sufficient_history: bool
    actual: Optional[float] = None
    deviation_pct: Optional[float] = None
    z_score: Optional[float] = None
    window_days: Optional[int] = None


class BaselineCalculator:
    MIN_SAMPLES = 7

    def calculate(self, series: pd.Series, exclude_last_n: int = 1) -> Baseline:
        """`series` is a date-indexed daily series, most recent last.
        We exclude the most recent `exclude_last_n` points (the value(s)
        being evaluated) from the baseline window."""
        if series is None or len(series) <= exclude_last_n:
            return Baseline(
                expected=0.0,
                mean=0.0,
                std=0.0,
                sample_size=0,
                sufficient_history=False,
                actual=0.0,
                deviation_pct=0.0,
                z_score=None,
                window_days=0,
            )

        history = series.iloc[:-exclude_last_n] if exclude_last_n > 0 else series
        history = history.dropna()
        actual = float(series.iloc[-1])

        if len(history) < self.MIN_SAMPLES:
            mean = float(history.mean()) if len(history) else 0.0
            std = float(history.std()) if len(history) > 1 else 0.0
            dev_pct = ((actual - mean) / mean * 100) if mean else 0.0
            return Baseline(
                expected=mean,
                mean=mean,
                std=std,
                sample_size=len(history),
                sufficient_history=False,
                actual=actual,
                deviation_pct=dev_pct,
                z_score=None,
                window_days=len(history),
            )

        mean = float(history.mean())
        std = float(history.std()) if len(history) > 1 else 0.0
        dev_pct = ((actual - mean) / mean * 100) if mean else 0.0
        z = ((actual - mean) / std) if std > 0 else None

        return Baseline(
            expected=mean,
            mean=mean,
            std=std,
            sample_size=len(history),
            sufficient_history=True,
            actual=actual,
            deviation_pct=dev_pct,
            z_score=z,
            window_days=len(history),
        )

    def rolling_mean(self, series: pd.Series, window_days: int = 30) -> Baseline:
        return self.calculate(series, exclude_last_n=1)

    def z_score(self, series: pd.Series, window_days: int = 30) -> Baseline:
        return self.calculate(series, exclude_last_n=1)