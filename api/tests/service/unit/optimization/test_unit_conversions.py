import pytest

from api.services.optimization.core.unit_conversions import (
    acres_to_hectares,
    k_ppm_to_mmol_kg,
    kg_per_ha_to_kg_per_ac,
    normalize_fraction,
    p_olsen_ppm_to_mg_kg,
    soc_percent_to_g_kg,
)


def test_soil_unit_conversions():
    assert soc_percent_to_g_kg(0.7) == pytest.approx(7.0)
    assert p_olsen_ppm_to_mg_kg(12.5) == pytest.approx(12.5)
    assert k_ppm_to_mmol_kg(39.0983) == pytest.approx(1.0)


def test_rate_unit_conversion():
    assert acres_to_hectares(1.0) == pytest.approx(0.40468564224)
    assert kg_per_ha_to_kg_per_ac(100.0) == pytest.approx(40.468564224)


def test_normalize_fraction_accepts_percent_or_fraction():
    assert normalize_fraction(23, "N") == pytest.approx(0.23)
    assert normalize_fraction(0.23, "N") == pytest.approx(0.23)
    with pytest.raises(ValueError):
        normalize_fraction(101, "N")
