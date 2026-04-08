from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from scipy.optimize import OptimizeResult, minimize

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
from .single_nutrient_fot import solve as solve_piecewise

@dataclass
class NonlinearSolveArtifacts:
    optimizer_result: OptimizeResult
    decoded_vector: dict[tuple[str, str], float]
    result: SolveResult

def _baseline_rate_per_ha(crop_input: CropInput, nutrient: str) -> float:
    return crop_input.initial_nutrient_rates.get(nutrient, 0.0)

def _index_map(products: tuple[str, ...]) -> dict[tuple[str, str], int]:
    return {
        (crop, product): idx
        for idx, (crop, product) in enumerate(
            (pair for crop in SUPPORTED_CROPS for pair in ((crop, product) for product in products))
        )
    }

def _flatten_decision_vector(vector_map: dict[tuple[str, str], float], products: tuple[str, ...]) -> np.ndarray:
    mapping = _index_map(products)
    x = np.zeros(len(mapping))
    for key, idx in mapping.items():
        x[idx] = vector_map.get(key, 0.0)
    return x

def _decode_decision_vector(x: np.ndarray, products: tuple[str, ...]) -> dict[tuple[str, str], float]:
    mapping = _index_map(products)
    return {key: float(x[idx]) for key, idx in mapping.items()}

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

def _build_result(
    status: str,
    x: np.ndarray,
    crops: dict[str, CropInput],
    fertilizers: dict[str, FertilizerInput],
    scenario: ScenarioInput,
    products: tuple[str, ...],
) -> SolveResult:
    decoded = _decode_decision_vector(x, products)
    application_rows = []
    effect_rows = []
    nutrient_balance_rows = []
    summary_row = {
        "budget_currency": scenario.budget,
        "total_fertilizer_cost_currency": 0.0,
        "total_incremental_value_currency": 0.0,
        "total_net_returns_currency": 0.0,
    }
    product_totals = {product: 0.0 for product in products}

    for crop in SUPPORTED_CROPS:
        crop_input = crops[crop]
        crop_cost = 0.0
        crop_value = 0.0
        crop_yield_gain_kg_per_ha = 0.0

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
            yield_gain_kg_per_ha = 1000.0 * response.b * ((response.c ** baseline_rate) - (response.c ** total_rate))
            nutrient_total = sum(
                decoded[(crop, product)] * fertilizers[product].nutrient_fractions[nutrient]
                for product in products
            )
            nutrient_balance_rows.append(
                {
                    "crop": crop,
                    "nutrient": nutrient,
                    "lhs_total_nutrient_kg": nutrient_total,
                    "rhs_total_nutrient_kg": crop_input.area_ha * (total_rate - baseline_rate),
                    "difference": nutrient_total - crop_input.area_ha * (total_rate - baseline_rate),
                }
            )
            crop_yield_gain_kg_per_ha += yield_gain_kg_per_ha
            crop_value += crop_input.area_ha * crop_input.grain_value_per_kg * yield_gain_kg_per_ha

        crop_net_return = crop_value - crop_cost
        effect_rows.append(
            {
                "crop": crop,
                "yield_increase_kg_per_ac": crop_yield_gain_kg_per_ha * ACRE_TO_HECTARE,
                "fertilizer_cost_currency_per_ac": crop_cost / crop_input.area_ac if crop_input.area_ac > 0 else 0.0,
                "net_returns_currency_per_ac": crop_net_return / crop_input.area_ac if crop_input.area_ac > 0 else 0.0,
            }
        )
        summary_row["total_fertilizer_cost_currency"] += crop_cost
        summary_row["total_incremental_value_currency"] += crop_value
        summary_row["total_net_returns_currency"] += crop_net_return

    for product, total_kg in product_totals.items():
        slug = product.lower().replace(",", "").replace(" ", "_")
        summary_row[f"total_{slug}_kg"] = total_kg

    return SolveResult(
        status=status,
        application_rows=application_rows,
        effect_rows=effect_rows,
        summary_row=summary_row,
        delta_rows=[],
        nutrient_balance_rows=nutrient_balance_rows,
    )

def solve_nonlinear(
    crops: dict[str, CropInput],
    fertilizers: dict[str, FertilizerInput],
    scenario: ScenarioInput,
) -> NonlinearSolveArtifacts:
    products = tuple(fertilizers.keys())
    variable_count = len(SUPPORTED_CROPS) * len(products)
    zero_start = np.zeros(variable_count)

    starts = [zero_start]
    try:
        piecewise_result = solve_piecewise(crops, fertilizers, scenario)
        starts.append(
            _flatten_decision_vector(
                {
                    (row["crop"], row["product"]): row["kg_total"]
                    for row in piecewise_result.application_rows
                },
                products,
            )
        )
    except Exception:
        pass

    bounds = [(0.0, None)] * variable_count
    constraints: list[dict[str, object]] = [{
        "type": "ineq",
        "fun": lambda x: scenario.budget - _budget_value(x, fertilizers, products),
    }]

    best_result: OptimizeResult | None = None
    for start in starts:
        result = minimize(
            _objective,
            start,
            args=(crops, fertilizers, products),
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 1000, "ftol": 1e-9, "disp": False},
        )
        if not result.success:
            continue
        if best_result is None or result.fun < best_result.fun:
            best_result = result

    if best_result is None:
        raise RuntimeError("Nonlinear optimization failed for all starting points.")

    decoded = _decode_decision_vector(best_result.x, products)
    solve_result = _build_result("Optimal", best_result.x, crops, fertilizers, scenario, products)
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
