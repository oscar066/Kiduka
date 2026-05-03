import pytest

from api.services.optimization.yield_models.kephis_yatt import KephisYAttProvider


def test_kephis_alpha_001_reads_q_0_01_and_returns_kg_ha():
    provider = KephisYAttProvider(quantile=0.01)
    assert provider.get_y_attainable_kg_ha("Maize") == pytest.approx(4310.295)
    assert provider.get_y_attainable_kg_ha("Beans") == pytest.approx(1087.5)


def test_kephis_off_grid_quantile_interpolates():
    provider = KephisYAttProvider(quantile=0.105)
    expected_t_ha = 5.107825 + (5.134208 - 5.107825) * 0.5
    assert provider.get_y_attainable_kg_ha("maize") == pytest.approx(expected_t_ha * 1000.0)
