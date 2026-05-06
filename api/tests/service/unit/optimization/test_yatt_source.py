from dataclasses import dataclass
from pathlib import Path

import pytest

from api.services.optimization.core.contracts import GeoLocation, YAttConfig, YAttSource
from api.services.optimization.yield_models.kephis_yatt import KephisYAttProvider
from api.services.optimization.yield_models.wofost_yatt import WofostYAttProvider
from api.services.optimization.yield_models.yatt import build_yatt_provider, wofost_yatt_config


@dataclass(frozen=True)
class FakeWofostResult:
    water_limited_yield_kg_ha: float


@dataclass(frozen=True)
class FakeFallbackProvider:
    value: float

    def get_y_attainable_kg_ha(self, crop: str) -> float:
        return self.value


def test_yatt_provider_defaults_to_kephis():
    provider = build_yatt_provider()
    assert isinstance(provider, KephisYAttProvider)
    assert provider.get_y_attainable_kg_ha("Maize") == pytest.approx(5337.521)


def test_yatt_provider_rejects_wofost_without_location():
    with pytest.raises(ValueError, match="requires a GeoLocation"):
        build_yatt_provider(YAttConfig(source=YAttSource.WOFOST))


def test_yatt_provider_uses_kephis_fallback_for_unsupported_wofost_crop_by_default():
    provider = build_yatt_provider(
        YAttConfig(source=YAttSource.WOFOST, location=GeoLocation(lat=0.46, lon=34.12))
    )

    assert provider.get_y_attainable_kg_ha("Sesame (Sim sim)") == pytest.approx(1275.0)


def test_wofost_provider_passes_location_and_crop_mapping_to_service_func():
    calls = []

    def fake_service(**kwargs):
        calls.append(kwargs)
        return FakeWofostResult(water_limited_yield_kg_ha=2431.25)

    provider = WofostYAttProvider(
        location=GeoLocation(lat=0.46, lon=34.12),
        sowing_date="2024-03-15",
        elevation_m=1220.0,
        service_func=fake_service,
    )

    assert provider.get_y_attainable_kg_ha("Maize") == pytest.approx(2431.25)
    assert calls == [
        {
            "lat": 0.46,
            "lon": 34.12,
            "crop": "maize",
            "sowing_date": "2024-03-15",
            "elevation_m": 1220.0,
        }
    ]


def test_wofost_provider_falls_back_for_crops_without_wofost_parameters():
    def fake_service(**kwargs):
        raise AssertionError("WOFOST service should not be called for unsupported crops.")

    provider = WofostYAttProvider(
        location=GeoLocation(lat=0.46, lon=34.12),
        service_func=fake_service,
        fallback_provider=FakeFallbackProvider(value=1234.5),
    )

    assert provider.get_y_attainable_kg_ha("Sesame (Sim sim)") == pytest.approx(1234.5)
    assert provider.get_y_attainable_kg_ha("Beans") == pytest.approx(1234.5)


def test_wofost_provider_can_reject_crops_without_fallback():
    provider = WofostYAttProvider(location=GeoLocation(lat=0.46, lon=34.12))

    with pytest.raises(ValueError, match="not available"):
        provider.get_y_attainable_kg_ha("Sesame (Sim sim)")


def test_wofost_config_helper_carries_location_and_service_root():
    config = wofost_yatt_config(
        lat=0.46,
        lon=34.12,
        sowing_date="2024-04-01",
        elevation_m=1210.0,
        service_root="/tmp/wofost",
    )

    assert config.source == YAttSource.WOFOST
    assert config.location == GeoLocation(lat=0.46, lon=34.12)
    assert config.wofost_sowing_date == "2024-04-01"
    assert config.wofost_elevation_m == pytest.approx(1210.0)
    assert config.wofost_service_root == Path("/tmp/wofost")
    assert config.wofost_fallback_to_kephis is True
