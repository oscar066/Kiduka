from __future__ import annotations

from types import SimpleNamespace

import pytest

from api.services.optimization.core.contracts import CropInput, NPKRate, SoilInput
from api.services.optimization.yield_models.rquefts import RqueftsYieldModel


def test_rquefts_keeps_yatt_dry_and_returns_sale_weight_yield(monkeypatch):
    captured = {}

    def fake_run(args, capture_output, text, timeout, check):
        captured["args"] = args
        _ = capture_output, text, timeout, check
        return SimpleNamespace(
            returncode=0,
            stdout=(
                "N,P,K,yield_kg_ha,N_gap_kg_ha,P_gap_kg_ha,K_gap_kg_ha,"
                "soil_N_supply_kg_ha,soil_P_supply_kg_ha,soil_K_supply_kg_ha\n"
                "0,0,0,800,1,2,3,4,5,6\n"
            ),
            stderr="",
        )

    monkeypatch.setattr("api.services.optimization.yield_models.rquefts.subprocess.run", fake_run)
    crop = CropInput(
        crop="Maize",
        area_ha=1.0,
        price_currency_per_kg=50.0,
        kephis_crop="maize",
        rquefts_crop="Maize",
        rquefts_leaf_ratio=0.46,
        rquefts_stem_ratio=0.56,
        y_attainable_kg_ha=1000.0,
        moisture_content=0.2,
    )
    soil = SoilInput(pH=5.5, soc_percent=0.7, p_olsen_ppm=5.0, k_ppm=55.0)

    (result,) = RqueftsYieldModel().evaluate_batch(crop, soil, (NPKRate(0.0, 0.0, 0.0),))

    assert "yatt <- rep(1000.0" in captured["args"][2]
    assert result.yield_kg_ha == pytest.approx(1000.0)


def test_rquefts_uses_crop_specific_leaf_and_stem_ratios(monkeypatch):
    captured = {}

    def fake_run(args, capture_output, text, timeout, check):
        captured["args"] = args
        _ = capture_output, text, timeout, check
        return SimpleNamespace(
            returncode=0,
            stdout=(
                "N,P,K,yield_kg_ha,N_gap_kg_ha,P_gap_kg_ha,K_gap_kg_ha,"
                "soil_N_supply_kg_ha,soil_P_supply_kg_ha,soil_K_supply_kg_ha\n"
                "0,0,0,800,1,2,3,4,5,6\n"
            ),
            stderr="",
        )

    monkeypatch.setattr("api.services.optimization.yield_models.rquefts.subprocess.run", fake_run)
    crop = CropInput(
        crop="Soybeans",
        area_ha=1.0,
        price_currency_per_kg=50.0,
        kephis_crop="soybean",
        rquefts_crop="Soyabean",
        rquefts_leaf_ratio=1.0882,
        rquefts_stem_ratio=0.54,
        y_attainable_kg_ha=1000.0,
        moisture_content=0.2,
    )
    soil = SoilInput(pH=5.5, soc_percent=0.7, p_olsen_ppm=5.0, k_ppm=55.0)

    RqueftsYieldModel().evaluate_batch(crop, soil, (NPKRate(0.0, 0.0, 0.0),))

    assert "leaf_ratio = 1.0882" in captured["args"][2]
    assert "stem_ratio = 0.54" in captured["args"][2]
    assert "leaf_ratio = 0.46, stem_ratio = 0.56" not in captured["args"][2]
