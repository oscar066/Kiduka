from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, OptimizeResult, minimize

from .data import ACRE_TO_HECTARE, WESTERN_LOWER_RESPONSES, SUPPORTED_CROPS, nutrient_order_for_crop
from .common import (
    CropInput,
    FertilizerInput,
    ScenarioInput,
    SolveResult,
    load_inputs,
    print_console_summary,
    write_outputs,
)

@dataclass
class NonlinearSolveArtifacts:
    optimizer_result: OptimizeResult
    decoded_vector: dict[tuple[str, str], float]
    result: SolveResult

ZERO_TOLERANCE = 1e-8
OUTPUT_DECIMALS = 3

def _baseline_rate_per_ha(crop_input: CropInput, nutrient: str) -> float:
    return crop_input.initial_nutrient_rates.get(nutrient, 0.0)

def _index_map(products: tuple[str, ...]) -> dict[tuple[str, str], int]:
    return {
        (crop, product): idx
        for idx, (crop, product) in enumerate(
            (pair for crop in SUPPORTED_CROPS for pair in ((crop, product) for product in products))
        )
    }

def _decode_decision_vector(x: np.ndarray, products: tuple[str, ...]) -> dict[tuple[str, str], float]:
    mapping = _index_map(products)
    return {key: float(x[idx]) for key, idx in mapping.items()}

def _clean_value(value: float, tolerance: float = ZERO_TOLERANCE) -> float:
    return 0.0 if abs(value) <= tolerance else value

def _clean_vector(x: np.ndarray, tolerance: float = ZERO_TOLERANCE) -> np.ndarray:
    return np.where(np.abs(x) <= tolerance, 0.0, x)

def _round_output_value(value: float, decimals: int = OUTPUT_DECIMALS) -> float:
    return round(float(value), decimals)

def _round_output_structure(value: object) -> object:
    if isinstance(value, dict):
        return {key: _round_output_structure(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_round_output_structure(item) for item in value]
    if isinstance(value, (float, np.floating, int, np.integer)) and not isinstance(value, bool):
        return _round_output_value(value)
    return value

def _budget_value(x: np.ndarray, fertilizers: dict[str, FertilizerInput], products: tuple[str, ...]) -> float:
    decoded = _decode_decision_vector(x, products)
    return sum(
        decoded[(crop, product)] * fertilizers[product].price_per_kg
        for crop in SUPPORTED_CROPS
        for product in products
    )

def _crop_nutrient_rate_per_ha(
    crop: str,
    nutrient: str,
    decoded: dict[tuple[str, str], float],
    crops: dict[str, CropInput],
    fertilizers: dict[str, FertilizerInput],
    products: tuple[str, ...],
) -> float:
    area_ha = crops[crop].area_ha
    if area_ha <= 0:
        return _baseline_rate_per_ha(crops[crop], nutrient)
    nutrient_total = sum(
        decoded[(crop, product)] * fertilizers[product].nutrient_fractions[nutrient]
        for product in products
    )
    return _baseline_rate_per_ha(crops[crop], nutrient) + (nutrient_total / area_ha)

def _total_net_return(
    x: np.ndarray,
    crops: dict[str, CropInput],
    fertilizers: dict[str, FertilizerInput],
    products: tuple[str, ...],
) -> float:
    decoded = _decode_decision_vector(x, products)
    total_value = 0.0
    total_cost = 0.0
    for crop in SUPPORTED_CROPS:
        crop_input = crops[crop]
        area_ha = crop_input.area_ha
        total_cost += sum(
            decoded[(crop, product)] * fertilizers[product].price_per_kg
            for product in products
        )
        for nutrient in nutrient_order_for_crop(crop):
            response = WESTERN_LOWER_RESPONSES[crop][nutrient]
            baseline_rate = _baseline_rate_per_ha(crop_input, nutrient)
            total_rate = _crop_nutrient_rate_per_ha(crop, nutrient, decoded, crops, fertilizers, products)
            incremental_yield_gain_kg_per_ha = 1000.0 * response.b * ((response.c ** baseline_rate) - (response.c ** total_rate))
            total_value += area_ha * crop_input.grain_value_per_kg * incremental_yield_gain_kg_per_ha
    return total_value - total_cost

def _objective(
    x: np.ndarray,
    crops: dict[str, CropInput],
    fertilizers: dict[str, FertilizerInput],
    products: tuple[str, ...],
) -> float:
    return -_total_net_return(x, crops, fertilizers, products)

def _crop_modeled_yield_kg_per_ha(
    crop: str,
    rates_per_ha: dict[str, float],
) -> float:
    total_yield_kg_per_ha = 0.0
    for nutrient in nutrient_order_for_crop(crop):
        response = WESTERN_LOWER_RESPONSES[crop][nutrient]
        rate = rates_per_ha[nutrient]
        total_yield_kg_per_ha += 1000.0 * (response.a - (response.b * (response.c ** rate)))
    return total_yield_kg_per_ha

def _build_scenario_row(
    crop: str,
    crop_input: CropInput,
    expected_yield_kg_per_ha: float,
    fertilizer_cost_currency: float,
) -> dict[str, float | str]:
    expected_revenue_currency = crop_input.area_ha * crop_input.grain_value_per_kg * expected_yield_kg_per_ha
    net_returns_currency = expected_revenue_currency - fertilizer_cost_currency
    return {
        "crop": crop,
        "expected_yield_kg_per_ac": expected_yield_kg_per_ha * ACRE_TO_HECTARE if crop_input.area_ac > 0 else 0.0,
        "expected_revenue_currency": expected_revenue_currency,
        "expected_revenue_currency_per_ac": expected_revenue_currency / crop_input.area_ac if crop_input.area_ac > 0 else 0.0,
        "fertilizer_cost_currency": fertilizer_cost_currency,
        "fertilizer_cost_currency_per_ac": fertilizer_cost_currency / crop_input.area_ac if crop_input.area_ac > 0 else 0.0,
        "net_returns_currency": net_returns_currency,
        "net_returns_currency_per_ac": net_returns_currency / crop_input.area_ac if crop_input.area_ac > 0 else 0.0,
    }

def _empty_summary_row() -> dict[str, float]:
    return {
        "total_expected_revenue_currency": 0.0,
        "total_fertilizer_cost_currency": 0.0,
        "total_net_returns_currency": 0.0,
    }

def _cost_vector(
    fertilizers: dict[str, FertilizerInput],
    products: tuple[str, ...],
) -> np.ndarray:
    mapping = _index_map(products)
    costs = np.zeros(len(mapping))
    for (crop, product), idx in mapping.items():
        _ = crop
        costs[idx] = fertilizers[product].price_per_kg
    return costs

def _equal_budget_start(
    crops: dict[str, CropInput],
    fertilizers: dict[str, FertilizerInput],
    scenario: ScenarioInput,
    products: tuple[str, ...],
) -> np.ndarray:
    mapping = _index_map(products)
    x0 = np.zeros(len(mapping))

    active_pairs = [
        (crop, product)
        for crop in SUPPORTED_CROPS
        if crops[crop].area_ac > 0
        for product in products
        if fertilizers[product].price_per_kg > 0
    ]
    if not active_pairs or scenario.budget <= 0:
        return x0

    allocation_per_pair = scenario.budget / len(active_pairs)
    for crop, product in active_pairs:
        x0[mapping[(crop, product)]] = allocation_per_pair / fertilizers[product].price_per_kg
    return x0

def _is_acceptable_result(
    result: OptimizeResult,
    cost_vector: np.ndarray,
    scenario: ScenarioInput,
) -> bool:
    if not result.success:
        return False
    if not np.all(np.isfinite(result.x)):
        return False
    if not np.isfinite(result.fun):
        return False
    if np.any(result.x < -1e-6):
        return False
    if float(np.dot(cost_vector, result.x)) > scenario.budget + 1e-6:
        return False
    return True

def _build_result(
    status: str,
    x: np.ndarray,
    crops: dict[str, CropInput],
    fertilizers: dict[str, FertilizerInput],
    scenario: ScenarioInput,
    products: tuple[str, ...],
) -> SolveResult:
    decoded = {
        key: _clean_value(value)
        for key, value in _decode_decision_vector(x, products).items()
    }
    application_rows = []
    effect_rows = []
    baseline_rows = []
    optimal_rows = []
    nutrient_balance_rows = []
    summary_row = {
        "budget_currency": scenario.budget,
        "total_fertilizer_cost_currency": 0.0,
        "total_incremental_value_currency": 0.0,
        "total_net_returns_currency": 0.0,
    }
    baseline_summary_row = _empty_summary_row()
    optimal_summary_row = _empty_summary_row()
    product_totals = {product: 0.0 for product in products}

    for crop in SUPPORTED_CROPS:
        crop_input = crops[crop]
        crop_cost = 0.0
        crop_incremental_value = 0.0
        crop_yield_gain_kg_per_ha = 0.0
        baseline_rates = crop_input.initial_nutrient_rates.copy()
        optimal_rates = crop_input.initial_nutrient_rates.copy()

        for product in products:
            quantity_total = decoded[(crop, product)]
            product_totals[product] += quantity_total
            crop_cost += quantity_total * fertilizers[product].price_per_kg
            application_rows.append(
                {
                    "crop": crop,
                    "product": product,
                    "kg_per_ac": quantity_total / crop_input.area_ac if crop_input.area_ac > 0 else 0.0,
                    "kg_total": quantity_total,
                }
            )

        for nutrient in nutrient_order_for_crop(crop):
            response = WESTERN_LOWER_RESPONSES[crop][nutrient]
            baseline_rate = _baseline_rate_per_ha(crop_input, nutrient)
            total_rate = _crop_nutrient_rate_per_ha(crop, nutrient, decoded, crops, fertilizers, products)
            baseline_rates[nutrient] = baseline_rate
            optimal_rates[nutrient] = total_rate
            yield_gain_kg_per_ha = 1000.0 * response.b * ((response.c ** baseline_rate) - (response.c ** total_rate))
            nutrient_total = _clean_value(sum(
                decoded[(crop, product)] * fertilizers[product].nutrient_fractions[nutrient]
                for product in products
            ))
            nutrient_rhs = _clean_value(crop_input.area_ha * (total_rate - baseline_rate))
            nutrient_balance_rows.append(
                {
                    "crop": crop,
                    "nutrient": nutrient,
                    "lhs_total_nutrient_kg": nutrient_total,
                    "rhs_total_nutrient_kg": nutrient_rhs,
                    "difference": _clean_value(nutrient_total - nutrient_rhs),
                }
            )
            crop_yield_gain_kg_per_ha += yield_gain_kg_per_ha
            crop_incremental_value += crop_input.area_ha * crop_input.grain_value_per_kg * yield_gain_kg_per_ha

        baseline_yield_kg_per_ha = _crop_modeled_yield_kg_per_ha(crop, baseline_rates)
        optimal_yield_kg_per_ha = _crop_modeled_yield_kg_per_ha(crop, optimal_rates)
        baseline_row = _build_scenario_row(crop, crop_input, baseline_yield_kg_per_ha, 0.0)
        optimal_row = _build_scenario_row(crop, crop_input, optimal_yield_kg_per_ha, crop_cost)
        baseline_rows.append(baseline_row)
        optimal_rows.append(optimal_row)

        crop_net_return = crop_incremental_value - crop_cost
        effect_rows.append(
            {
                "crop": crop,
                "yield_increase_kg_per_ac": crop_yield_gain_kg_per_ha * ACRE_TO_HECTARE,
                "fertilizer_cost_currency_per_ac": crop_cost / crop_input.area_ac if crop_input.area_ac > 0 else 0.0,
                "net_returns_currency_per_ac": crop_net_return / crop_input.area_ac if crop_input.area_ac > 0 else 0.0,
            }
        )
        baseline_summary_row["total_expected_revenue_currency"] += float(baseline_row["expected_revenue_currency"])
        baseline_summary_row["total_fertilizer_cost_currency"] += float(baseline_row["fertilizer_cost_currency"])
        baseline_summary_row["total_net_returns_currency"] += float(baseline_row["net_returns_currency"])
        optimal_summary_row["total_expected_revenue_currency"] += float(optimal_row["expected_revenue_currency"])
        optimal_summary_row["total_fertilizer_cost_currency"] += float(optimal_row["fertilizer_cost_currency"])
        optimal_summary_row["total_net_returns_currency"] += float(optimal_row["net_returns_currency"])
        summary_row["total_fertilizer_cost_currency"] += crop_cost
        summary_row["total_incremental_value_currency"] += crop_incremental_value
        summary_row["total_net_returns_currency"] += crop_net_return

    for product, total_kg in product_totals.items():
        slug = product.lower().replace(",", "").replace(" ", "_")
        summary_row[f"total_{slug}_kg"] = total_kg

    return SolveResult(
        status=status,
        application_rows=_round_output_structure(application_rows),
        effect_rows=_round_output_structure(effect_rows),
        summary_row=_round_output_structure(summary_row),
        baseline_rows=_round_output_structure(baseline_rows),
        optimal_rows=_round_output_structure(optimal_rows),
        baseline_summary_row=_round_output_structure(baseline_summary_row),
        optimal_summary_row=_round_output_structure(optimal_summary_row),
        delta_rows=[],
        nutrient_balance_rows=_round_output_structure(nutrient_balance_rows),
    )

def solve_nonlinear(
    crops: dict[str, CropInput],
    fertilizers: dict[str, FertilizerInput],
    scenario: ScenarioInput,
) -> NonlinearSolveArtifacts:
    products = tuple(fertilizers.keys())
    variable_count = len(SUPPORTED_CROPS) * len(products)
    zero_start = np.zeros(variable_count)
    heuristic_start = _equal_budget_start(crops, fertilizers, scenario, products)
    starts = [zero_start]
    if not np.allclose(heuristic_start, zero_start):
        starts.append(heuristic_start)

    cost_vector = _cost_vector(fertilizers, products)
    bounds = Bounds(np.zeros(variable_count), np.full(variable_count, np.inf))
    constraints = [
        LinearConstraint(cost_vector.reshape(1, -1), -np.inf, scenario.budget),
    ]

    best_result: OptimizeResult | None = None
    for start in starts:
        result = minimize(
            _objective,
            start,
            args=(crops, fertilizers, products),
            method="trust-constr",
            bounds=bounds,
            constraints=constraints,
            options={
                "maxiter": 1000,
                "gtol": 1e-8,
                "xtol": 1e-8,
                "barrier_tol": 1e-8,
                "verbose": 0,
            },
        )
        if not _is_acceptable_result(result, cost_vector, scenario):
            continue
        if best_result is None or result.fun < best_result.fun:
            best_result = result

    if best_result is None:
        raise RuntimeError("Nonlinear optimization failed for all starting points.")

    best_x = _clean_vector(np.maximum(best_result.x, 0.0))
    decoded = {
        key: _clean_value(value)
        for key, value in _decode_decision_vector(best_x, products).items()
    }
    solve_result = _build_result("Optimal", best_x, crops, fertilizers, scenario, products)
    return NonlinearSolveArtifacts(
        optimizer_result=best_result,
        decoded_vector=decoded,
        result=solve_result,
    )

def solve_from_directory(
    input_dir: Path,
) -> SolveResult:
    crops, fertilizers, scenario = load_inputs(input_dir)
    return solve_nonlinear(crops, fertilizers, scenario).result
