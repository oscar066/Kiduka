import math
from typing import Any, Dict, Mapping, Sequence

import numpy as np


NUTRIENT_NAMES = ("N", "OC", "P", "K", "Ca", "Mg")
CLASS_NAMES = {1: "Very Poor", 2: "Poor", 3: "Moderately Healthy", 4: "Healthy"}


def _nonnegative_finite(value: Any) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0

    if not math.isfinite(numeric):
        return 0.0
    return max(0.0, numeric)


def _rounded_score(value: float) -> int:
    return int(np.clip(np.rint(value), 1, 4))


def build_ml_nutrients(nutrient_cont: Sequence[Sequence[float]] | Sequence[float]) -> Dict[str, Dict[str, Any]]:
    values = np.asarray(nutrient_cont, dtype=float)
    row = values[0] if values.ndim == 2 else values

    if len(row) != len(NUTRIENT_NAMES):
        raise ValueError(f"Expected {len(NUTRIENT_NAMES)} nutrient scores, got {len(row)}")

    nutrients: Dict[str, Dict[str, Any]] = {}
    for name, raw_value in zip(NUTRIENT_NAMES, row):
        continuous_score = _nonnegative_finite(raw_value)
        score = _rounded_score(continuous_score)
        nutrients[name] = {
            "score": score,
            "continuous_score": continuous_score,
            "label": CLASS_NAMES.get(score, "Unknown"),
        }
    return nutrients


def build_unified_nutrients(
    param_scores: Mapping[str, Any],
    nutrient_method: Mapping[str, str],
    ml_nutrients: Mapping[str, Mapping[str, Any]] | None = None,
) -> Dict[str, Dict[str, Any]]:
    unified: Dict[str, Dict[str, Any]] = {}
    ml_nutrients = ml_nutrients or {}

    for key, score_value in param_scores.items():
        if key == "pH":
            continue

        score = int(score_value)
        method = nutrient_method.get(key, "estimated")
        nutrient = {
            "score": score,
            "label": CLASS_NAMES.get(score, "Unknown"),
            "method": method,
        }

        if method == "estimated":
            continuous_score = ml_nutrients.get(key, {}).get("continuous_score")
            if continuous_score is not None:
                nutrient["continuous_score"] = _nonnegative_finite(continuous_score)

        unified[key] = nutrient

    return unified
