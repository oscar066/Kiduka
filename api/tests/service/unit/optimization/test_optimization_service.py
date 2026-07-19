import math

import pytest

pytest.importorskip("scipy")

from api.schema.optimization_schema import OptimizationRequest
from api.services.optimization.core.contracts import NPKRate, YieldResult
from api.services.optimization.optimization_service import OptimizationService


class FakeYieldModel:
    def evaluate_batch(self, crop, soil, npk_rates: tuple[NPKRate, ...]):
        rows = []
        for rate in npk_rates:
            yield_kg_ha = min(
                crop.y_attainable_sale_weight_kg_ha,
                1000.0
                + 150.0 * math.sqrt(rate.n_kg_ha + 1.0)
                + 200.0 * math.sqrt(rate.p_kg_ha + 1.0)
                + 75.0 * math.sqrt(rate.k_kg_ha + 1.0),
            )
            rows.append(
                YieldResult(
                    crop=crop.crop,
                    n_kg_ha=rate.n_kg_ha,
                    p_kg_ha=rate.p_kg_ha,
                    k_kg_ha=rate.k_kg_ha,
                    yield_kg_ha=yield_kg_ha,
                )
            )
        return tuple(rows)


def test_optimization_service_builds_new_quefts_contract_from_api_request():
    request = OptimizationRequest.model_validate(
        {
            "soil": {
                "mode": "direct",
                "ph": 5.5,
                "soc_percent": 0.7,
                "p_olsen_ppm": 5.0,
                "k_exchangeable_ppm": 55.0,
            },
            "crops": [
                {
                    "crop": "Maize",
                    "area_ha": 0.2,
                    "grain_price_currency_per_kg": 58.5,
                }
            ],
            "fertilizers": [
                {
                    "product": "NPK 23:23:23",
                    "n_fraction": 0.23,
                    "p2o5_fraction": 0.23,
                    "k2o_fraction": 0.23,
                    "package_price_currency": 5750.0,
                    "package_weight_kg": 50.0,
                }
            ],
            "scenario": {
                "budget_currency": 1000.0,
                "solver": {
                    "method": "fd_oa",
                    "time_limit_seconds": 1.0,
                    "max_iterations": 2,
                    "no_improvement_limit": 1,
                },
            },
        }
    )

    response = OptimizationService.optimize(request, yield_model=FakeYieldModel())

    assert response.status == "Feasible"
    assert response.baseline_rows[0].crop == "Maize"
    assert response.summary_row["budget_currency"] == pytest.approx(1000.0)
    assert response.summary_row["budget_used"] <= 1000.0 + 1e-6


def _base_request_payload(soil_overrides: dict, location: dict | None = None) -> dict:
    payload = {
        "soil": {
            "mode": "direct",
            "soc_percent": 0.7,
            "p_olsen_ppm": 5.0,
            "k_exchangeable_ppm": 55.0,
            **soil_overrides,
        },
        "crops": [{"crop": "Maize", "area_ha": 0.2, "grain_price_currency_per_kg": 58.5}],
        "fertilizers": [
            {
                "product": "NPK 23:23:23",
                "n_fraction": 0.23,
                "p2o5_fraction": 0.23,
                "k2o_fraction": 0.23,
                "package_price_currency": 5750.0,
                "package_weight_kg": 50.0,
            }
        ],
        "scenario": {
            "budget_currency": 1000.0,
            "solver": {"method": "fd_oa", "time_limit_seconds": 1.0, "max_iterations": 2, "no_improvement_limit": 1},
        },
    }
    if location is not None:
        payload["location"] = location
    return payload


def test_optimization_service_resolves_ph_from_location_when_omitted():
    request = OptimizationRequest.model_validate(
        _base_request_payload({}, location={"lat": 0.46, "lon": 34.11})
    )

    response = OptimizationService.optimize(request, yield_model=FakeYieldModel())

    assert response.status == "Feasible"


def test_optimization_service_requires_location_when_ph_omitted():
    request = OptimizationRequest.model_validate(_base_request_payload({}))

    with pytest.raises(ValueError, match="soil.ph is required when location is not provided"):
        OptimizationService.optimize(request, yield_model=FakeYieldModel())


def test_optimization_service_keeps_history_soil_as_unwired_interface_boundary():
    request = OptimizationRequest.model_validate(
        {
            "soil": {"mode": "history", "soil_analysis_id": "soil-result-1"},
            "crops": [{"crop": "Maize", "area_ha": 0.2, "grain_price_currency_per_kg": 58.5}],
            "fertilizers": [{"product": "Urea", "n_fraction": 0.46, "price_currency_per_kg": 92.0}],
            "scenario": {"budget_currency": 1000.0},
        }
    )

    with pytest.raises(ValueError, match="no soil-analysis resolver is wired"):
        OptimizationService.optimize(request, yield_model=FakeYieldModel())
