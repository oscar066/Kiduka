import math

import pytest

pytest.importorskip("scipy")

from api.schema.optimization_schema import OptimizationRequest
from api.services.optimization.core.contracts import (
    CropInput,
    FertilizerInput,
    NPKRate,
    OptimizationProblem,
    OptimizationScenario,
    SoilInput,
    YieldResult,
)
from api.services.optimization.optimization_service import OptimizationService
from api.services.optimization.solvers.fd_oa import FdOaSolver


class FlatYieldModel:
    def evaluate_batch(self, crop: CropInput, soil: SoilInput, npk_rates: tuple[NPKRate, ...]):
        _ = soil
        return tuple(
            YieldResult(
                crop=crop.crop,
                n_kg_ha=rate.n_kg_ha,
                p_kg_ha=rate.p_kg_ha,
                k_kg_ha=rate.k_kg_ha,
                yield_kg_ha=1000.0,
            )
            for rate in npk_rates
        )


class ResponsiveYieldModel:
    def evaluate_batch(self, crop: CropInput, soil: SoilInput, npk_rates: tuple[NPKRate, ...]):
        _ = soil
        return tuple(
            YieldResult(
                crop=crop.crop,
                n_kg_ha=rate.n_kg_ha,
                p_kg_ha=rate.p_kg_ha,
                k_kg_ha=rate.k_kg_ha,
                yield_kg_ha=min(
                    crop.y_attainable_sale_weight_kg_ha,
                    900.0 + 220.0 * math.sqrt(rate.n_kg_ha + 1.0),
                ),
            )
            for rate in npk_rates
        )


def maize_crop() -> CropInput:
    return CropInput(
        crop="Maize",
        area_ha=1.0,
        price_currency_per_kg=80.0,
        kephis_crop="maize",
        rquefts_crop="Maize",
        rquefts_leaf_ratio=0.46,
        rquefts_stem_ratio=0.56,
        y_attainable_kg_ha=9000.0,
        moisture_content=0.0,
    )


def base_problem(*, max_iterations: int = 10, no_improvement_limit: int = 5) -> OptimizationProblem:
    return OptimizationProblem(
        soil=SoilInput(pH=5.5, soc_percent=0.7, p_olsen_ppm=5.0, k_ppm=55.0),
        crops=(maize_crop(),),
        fertilizers=(
            FertilizerInput(
                "Urea",
                n_fraction=0.46,
                p_fraction=0.0,
                k_fraction=0.0,
                price_currency_per_kg=90.0,
            ),
        ),
        scenario=OptimizationScenario(
            budget_currency=5000.0,
            time_limit_seconds=2.0,
            max_iterations=max_iterations,
            no_improvement_limit=no_improvement_limit,
        ),
    )


def test_outcome_reports_no_economic_application_when_rates_are_zero():
    result = FdOaSolver(FlatYieldModel()).solve(base_problem())

    assert result.optimization_outcome["code"] == "no_economic_application"
    assert result.optimization_outcome["message"] == "No fertilizer is recommended at the current stage."


def test_outcome_reports_cost_effective_application_after_solver_converges():
    result = FdOaSolver(ResponsiveYieldModel()).solve(base_problem(no_improvement_limit=1))

    assert result.application_rows
    assert result.optimization_outcome["code"] == "cost_effective_application_found"
    assert result.optimization_outcome["message"] == "Recommended fertilizer rates found."


def test_outcome_reports_best_found_application_when_iteration_limit_is_reached():
    result = FdOaSolver(ResponsiveYieldModel()).solve(base_problem(max_iterations=3, no_improvement_limit=100))

    assert result.application_rows
    assert result.optimization_outcome["code"] == "best_application_with_solver_limit"
    assert result.optimization_outcome["message"] == "Best fertilizer rates found within the calculation limit."


def test_service_exposes_optimization_outcome_in_api_response():
    request = OptimizationRequest.model_validate(
        {
            "soil": {
                "mode": "direct",
                "ph": 5.5,
                "soc_percent": 0.7,
                "p_olsen_ppm": 5.0,
                "k_exchangeable_ppm": 55.0,
            },
            "crops": [{"crop": "Maize", "area_ha": 1.0, "grain_price_currency_per_kg": 80.0}],
            "fertilizers": [{"product": "Urea", "n_fraction": 0.46, "price_currency_per_kg": 90.0}],
            "scenario": {
                "budget_currency": 5000.0,
                "solver": {
                    "method": "fd_oa",
                    "time_limit_seconds": 2.0,
                    "max_iterations": 3,
                    "no_improvement_limit": 100,
                },
            },
        }
    )

    response = OptimizationService.optimize(request, yield_model=ResponsiveYieldModel())

    assert response.optimization_outcome.code == "best_application_with_solver_limit"
