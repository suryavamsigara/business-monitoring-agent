"""
BaselineCalculator: computes an "expected value" for a KPI from historical
data, using a rolling-average strategy. Handles insufficient-history cases
gracefully instead of raising.
"""
import pandas as pd
from dataclasses import dataclass


@dataclass
class Baseline:
    expected: float
    mean: float
    std: float
    sample_size: int
    sufficient_history: bool


class BaselineCalculator:
    MIN_SAMPLES = 7

    def calculate(self, series: pd.Series, exclude_last_n: int = 1) -> Baseline:
        """`series` is a date-indexed daily series, most recent last.
        We exclude the most recent `exclude_last_n` points (the value(s)
        being evaluated) from the baseline window."""
        if series is None or len(series) <= exclude_last_n:
            return Baseline(expected=0.0, mean=0.0, std=0.0, sample_size=0, sufficient_history=False)

        history = series.iloc[:-exclude_last_n] if exclude_last_n > 0 else series
        history = history.dropna()

        if len(history) < self.MIN_SAMPLES:
            # Not enough history for a confident baseline - fall back to
            # whatever we have, but flag it as insufficient.
            mean = float(history.mean()) if len(history) else 0.0
            std = float(history.std()) if len(history) > 1 else 0.0
            return Baseline(expected=mean, mean=mean, std=std, sample_size=len(history), sufficient_history=False)

        mean = float(history.mean())
        std = float(history.std()) if len(history) > 1 else 0.0
        return Baseline(expected=mean, mean=mean, std=std, sample_size=len(history), sufficient_history=True)