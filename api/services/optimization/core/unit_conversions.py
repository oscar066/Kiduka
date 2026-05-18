from __future__ import annotations

ACRE_TO_HECTARE = 0.40468564224
P2O5_TO_P = 0.437
K2O_TO_K = 0.830
K_ATOMIC_MASS_MG_PER_MMOL = 39.0983


def acres_to_hectares(area_ac: float) -> float:
    return float(area_ac) * ACRE_TO_HECTARE


def hectares_to_acres(area_ha: float) -> float:
    return float(area_ha) / ACRE_TO_HECTARE


def kg_per_ha_to_kg_per_ac(rate_kg_ha: float) -> float:
    return float(rate_kg_ha) * ACRE_TO_HECTARE


def soc_percent_to_g_kg(soc_percent: float) -> float:
    return float(soc_percent) * 10.0


def k_ppm_to_mmol_kg(k_ppm: float) -> float:
    return float(k_ppm) / K_ATOMIC_MASS_MG_PER_MMOL


def p_olsen_ppm_to_mg_kg(p_olsen_ppm: float) -> float:
    return float(p_olsen_ppm)


def normalize_fraction(raw_value: float | int | str | None, label: str) -> float:
    if raw_value is None:
        return 0.0
    raw_text = str(raw_value).strip()
    if raw_text in {"", "%"}:
        return 0.0
    value_float = float(raw_text)
    if value_float < 0:
        raise ValueError(f"{label} must be non-negative.")
    if value_float > 1.0:
        if value_float > 100.0:
            raise ValueError(f"{label} must be a fraction or percent in [0, 100].")
        return value_float / 100.0
    return value_float


def p2o5_fraction_to_p(p2o5_fraction: float) -> float:
    return float(p2o5_fraction) * P2O5_TO_P


def k2o_fraction_to_k(k2o_fraction: float) -> float:
    return float(k2o_fraction) * K2O_TO_K
