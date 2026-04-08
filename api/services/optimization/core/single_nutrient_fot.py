from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from pulp import LpMaximize, LpProblem, LpStatus, LpVariable, PULP_CBC_CMD, lpSum, value

from .data import (
    ACRE_TO_HECTARE,
    WESTERN_LOWER_RESPONSES,
    SUPPORTED_CROPS,
    nutrient_order_for_crop,
    segment_gains_kg_per_ha,
)
from .common import (
    CropInput,
    FertilizerInput,
    ScenarioInput,
    SolveResult,
    load_inputs,
    print_console_summary,
    write_outputs,
)

def _baseline_rate_per_ha(crop_input: CropInput, nutrient: str) -> float:
    return crop_input.initial_nutrient_rates.get(nutrient, 0.0)

def _baseline_segment_completion(grid: tuple[float, ...], baseline_rate_per_ha: float) -> list[float]:
    if baseline_rate_per_ha < 0.0:
        raise ValueError("Baseline nutrient rate must be non-negative.")
    if baseline_rate_per_ha > grid[-1] + 1e-9:
        raise ValueError(
            f"Baseline nutrient rate {baseline_rate_per_ha:.3f} exceeds the piecewise grid upper bound {grid[-1]:.3f}."
        )
    completions: list[float] = []
    remaining = baseline_rate_per_ha
    for start, end in zip(grid[:-1], grid[1:]):
        segment_width = end - start
        filled = min(max(remaining, 0.0), segment_width)
        completions.append(filled / segment_width if segment_width > 0 else 0.0)
        remaining -= filled
    return completions

def solve(crops: dict[str, CropInput], fertilizers: dict[str, FertilizerInput], scenario: ScenarioInput) -> SolveResult:
    model = LpProblem("kenya_western_lower_single_nutrient_fot", LpMaximize)
    products = tuple(fertilizers.keys())

    product_vars = {
        (crop, product): LpVariable(f"x__{crop}__{product}", lowBound=0.0)
        for crop in SUPPORTED_CROPS
        for product in products
    }
    delta_vars = {}
    for crop in SUPPORTED_CROPS:
        for nutrient in nutrient_order_for_crop(crop):
            grid = WESTERN_LOWER_RESPONSES[crop][nutrient].grid
            for segment_index in range(1, len(grid)):
                delta_vars[(crop, nutrient, segment_index)] = LpVariable(
                    f"delta__{crop}__{nutrient}__{segment_index}",
                    lowBound=0.0,
                    upBound=1.0,
                )

    objective_terms = []
    for crop in SUPPORTED_CROPS:
        area_ha = crops[crop].area_ha
        price = crops[crop].grain_value_per_kg
        for nutrient in nutrient_order_for_crop(crop):
            gains = segment_gains_kg_per_ha(crop, nutrient)
            baseline_completions = _baseline_segment_completion(
                WESTERN_LOWER_RESPONSES[crop][nutrient].grid,
                _baseline_rate_per_ha(crops[crop], nutrient),
            )
            for segment_index, gain in enumerate(gains, start=1):
                objective_terms.append(
                    area_ha
                    * price
                    * gain
                    * (delta_vars[(crop, nutrient, segment_index)] - baseline_completions[segment_index - 1])
                )
    cost_terms = [
        fertilizers[product].price_per_kg * product_vars[(crop, product)]
        for crop in SUPPORTED_CROPS
        for product in products
    ]
    model += lpSum(objective_terms) - lpSum(cost_terms)

    for crop in SUPPORTED_CROPS:
        area_ha = crops[crop].area_ha
        for nutrient in nutrient_order_for_crop(crop):
            grid = WESTERN_LOWER_RESPONSES[crop][nutrient].grid
            baseline_rate_per_ha = _baseline_rate_per_ha(crops[crop], nutrient)
            nutrient_supply = lpSum(
                fertilizers[product].nutrient_fractions[nutrient] * product_vars[(crop, product)]
                for product in products
            )
            segment_total = lpSum(
                (grid[segment_index] - grid[segment_index - 1]) * delta_vars[(crop, nutrient, segment_index)]
                for segment_index in range(1, len(grid))
            )
            model += nutrient_supply == area_ha * (segment_total - baseline_rate_per_ha), f"balance__{crop}__{nutrient}"
            for segment_index in range(1, len(grid) - 1):
                model += (
                    delta_vars[(crop, nutrient, segment_index)]
                    >= delta_vars[(crop, nutrient, segment_index + 1)]
                ), f"monotone__{crop}__{nutrient}__{segment_index}"

    model += lpSum(cost_terms) <= scenario.budget, "budget"

    status_code = model.solve(PULP_CBC_CMD(msg=False))
    status = LpStatus[status_code]
    if status != "Optimal":
        raise RuntimeError(f"Optimization failed with status {status}.")

    application_rows: list[dict[str, Any]] = []
    effect_rows: list[dict[str, Any]] = []
    summary_row: dict[str, Any] = {
        "budget_currency": scenario.budget,
        "total_fertilizer_cost_currency": 0.0,
        "total_incremental_value_currency": 0.0,
        "total_net_returns_currency": 0.0,
    }
    delta_rows: list[dict[str, Any]] = []
    nutrient_balance_rows: list[dict[str, Any]] = []

    product_totals = {product: 0.0 for product in products}
    for crop in SUPPORTED_CROPS:
        crop_input = crops[crop]
        total_cost = 0.0
        for product in products:
            quantity_total = value(product_vars[(crop, product)])
            quantity_total = 0.0 if quantity_total is None else float(quantity_total)
            product_totals[product] += quantity_total
            total_cost += quantity_total * fertilizers[product].price_per_kg
            kg_per_ac = quantity_total / crop_input.area_ac if crop_input.area_ac > 0 else 0.0
            application_rows.append(
                {
                    "crop": crop,
                    "product": product,
                    "kg_per_ac": kg_per_ac,
                    "kg_total": quantity_total,
                }
            )

        yield_gain_kg_per_ha = 0.0
        for nutrient in nutrient_order_for_crop(crop):
            response = WESTERN_LOWER_RESPONSES[crop][nutrient]
            grid = response.grid
            baseline_rate_per_ha = _baseline_rate_per_ha(crop_input, nutrient)
            baseline_completions = _baseline_segment_completion(grid, baseline_rate_per_ha)
            delta_sum = 0.0
            for segment_index in range(1, len(grid)):
                delta_value = value(delta_vars[(crop, nutrient, segment_index)])
                delta_float = 0.0 if delta_value is None else float(delta_value)
                delta_sum += (grid[segment_index] - grid[segment_index - 1]) * delta_float
                delta_rows.append(
                    {
                        "crop": crop,
                        "nutrient": nutrient,
                        "segment_index": segment_index,
                        "segment_start": grid[segment_index - 1],
                        "segment_end": grid[segment_index],
                        "delta": delta_float,
                        "baseline_delta": baseline_completions[segment_index - 1],
                    }
                )
            baseline_yield_gain_kg_per_ha = sum(
                gain * baseline_completions[segment_index - 1]
                for segment_index, gain in enumerate(segment_gains_kg_per_ha(crop, nutrient), start=1)
            )
            total_yield_gain_kg_per_ha = sum(
                gain * float(value(delta_vars[(crop, nutrient, segment_index)]) or 0.0)
                for segment_index, gain in enumerate(segment_gains_kg_per_ha(crop, nutrient), start=1)
            )
            yield_gain_kg_per_ha += total_yield_gain_kg_per_ha - baseline_yield_gain_kg_per_ha
            lhs = sum(
                fertilizers[product].nutrient_fractions[nutrient] * float(value(product_vars[(crop, product)]) or 0.0)
                for product in products
            )
            rhs = crop_input.area_ha * (delta_sum - baseline_rate_per_ha)
            nutrient_balance_rows.append(
                {
                    "crop": crop,
                    "nutrient": nutrient,
                    "lhs_total_nutrient_kg": lhs,
                    "rhs_total_nutrient_kg": rhs,
                    "difference": lhs - rhs,
                }
            )

        total_incremental_value = crop_input.area_ha * crop_input.grain_value_per_kg * yield_gain_kg_per_ha
        total_net_returns = total_incremental_value - total_cost
        yield_increase_kg_per_ac = yield_gain_kg_per_ha * ACRE_TO_HECTARE
        fertilizer_cost_per_ac = total_cost / crop_input.area_ac if crop_input.area_ac > 0 else 0.0
        net_returns_per_ac = total_net_returns / crop_input.area_ac if crop_input.area_ac > 0 else 0.0
        effect_rows.append(
            {
                "crop": crop,
                "yield_increase_kg_per_ac": yield_increase_kg_per_ac,
                "fertilizer_cost_currency_per_ac": fertilizer_cost_per_ac,
                "net_returns_currency_per_ac": net_returns_per_ac,
            }
        )
        summary_row["total_fertilizer_cost_currency"] += total_cost
        summary_row["total_incremental_value_currency"] += total_incremental_value
        summary_row["total_net_returns_currency"] += total_net_returns

    for product, total_kg in product_totals.items():
        slug = (
            product.lower()
            .replace(",", "")
            .replace(" ", "_")
        )
        summary_row[f"total_{slug}_kg"] = total_kg

    return SolveResult(
        status=status,
        application_rows=application_rows,
        effect_rows=effect_rows,
        summary_row=summary_row,
        delta_rows=delta_rows,
        nutrient_balance_rows=nutrient_balance_rows,
    )

def solve_from_directory(input_dir: Path) -> SolveResult:
    crops, fertilizers, scenario = load_inputs(input_dir)
    return solve(crops, fertilizers, scenario)
