import pytest

from api.services.optimization.yield_models.kephis_yatt import KephisYAttProvider


def test_kephis_defaults_to_average_lower_and_returns_kg_ha():
    provider = KephisYAttProvider()
    assert provider.get_y_attainable_kg_ha("Maize") == pytest.approx(5337.521)
    assert provider.get_y_attainable_kg_ha("Beans") == pytest.approx(1294.56)


def test_kephis_average_median_can_be_requested_for_diagnostics():
    provider = KephisYAttProvider(yield_basis="average_median")
    assert provider.get_y_attainable_kg_ha("maize") == pytest.approx(6091.88)


def test_kephis_reads_market_product_moisture_content():
    provider = KephisYAttProvider()
    assert provider.get_moisture_content("Maize") == pytest.approx(0.135)
    assert provider.get_moisture_content("Groundnuts") == pytest.approx(0.15)
