from __future__ import annotations

import math

import pytest

pytest.importorskip("scipy")

from api.services.optimization.core.contracts import (
    CropInput,
    FertilizerInput,
    NPKRate,
    OptimizationProblem,
    OptimizationScenario,
    SoilInput,
    YieldResult,
)
from api.services.optimization.solvers.fd_oa import FdOaSolver


class FakeConcaveYieldModel:
    def __init__(self):
        self.batch_sizes = []

    def evaluate_batch(self, crop: CropInput, soil: SoilInput, npk_rates: tuple[NPKRate, ...]):
        _ = soil
        self.batch_sizes.append(len(npk_rates))
        results = []
        for rate in npk_rates:
            yield_kg_ha = min(
                crop.y_attainable_sale_weight_kg_ha,
                1000.0
                + 180.0 * math.sqrt(rate.n_kg_ha + 1.0)
                + 260.0 * math.sqrt(rate.p_kg_ha + 1.0)
                + 90.0 * math.sqrt(rate.k_kg_ha + 1.0)
                - 530.0,
            )
            results.append(
                YieldResult(
                    crop=crop.crop,
                    n_kg_ha=rate.n_kg_ha,
                    p_kg_ha=rate.p_kg_ha,
                    k_kg_ha=rate.k_kg_ha,
                    yield_kg_ha=yield_kg_ha,
                )
            )
        return tuple(results)


def test_fd_oa_returns_budget_feasible_incumbent():
    problem = OptimizationProblem(
        soil=SoilInput(pH=5.5, soc_percent=0.7, p_olsen_ppm=5.0, k_ppm=55.0),
        crops=(
            CropInput(
                crop="Maize",
                area_ha=1.0,
                price_currency_per_kg=45.0,
                kephis_crop="maize",
                rquefts_crop="Maize",
                y_attainable_kg_ha=9000.0,
                moisture_content=0.0,
            ),
        ),
        fertilizers=(
            FertilizerInput("Urea", n_fraction=0.46, p_fraction=0.0, k_fraction=0.0, price_currency_per_kg=90.0),
            FertilizerInput("TSP", n_fraction=0.0, p_fraction=0.20, k_fraction=0.0, price_currency_per_kg=100.0),
            FertilizerInput("NPK", n_fraction=0.17, p_fraction=0.07429, k_fraction=0.1411, price_currency_per_kg=120.0),
        ),
        scenario=OptimizationScenario(
            budget_currency=5000.0,
            time_limit_seconds=2.0,
            max_iterations=8,
            no_improvement_limit=3,
        ),
    )

    yield_model = FakeConcaveYieldModel()
    result = FdOaSolver(yield_model).solve(problem)

    assert result.status == "Feasible"
    assert any(batch_size > 1 for batch_size in yield_model.batch_sizes)
    assert result.summary_row["budget_used"] <= problem.scenario.budget_currency + 1e-6
    assert result.summary_row["feasible_net_return_total"] >= result.summary_row["baseline_net_return_total"]
    assert result.summary_row["oa_iterations"] >= 1
    for row in result.application_rows:
        assert row["kg_product_per_ha"] >= 0.0
        assert row["kg_product_total"] >= 0.0
        assert row["cost_total"] >= 0.0
