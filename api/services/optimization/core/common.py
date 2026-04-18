from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .data import (
    ACRE_TO_HECTARE,
    K2O_TO_K,
    P2O5_TO_P,
    SUPPORTED_CROPS,
)

@dataclass(frozen=True)
class CropInput:
    crop: str
    area_ac: float
    grain_value_per_kg: float
    initial_n_kg_per_ha: float
    initial_p_kg_per_ha: float
    initial_k_kg_per_ha: float

    @property
    def area_ha(self) -> float:
        return self.area_ac * ACRE_TO_HECTARE

    @property
    def initial_nutrient_rates(self) -> dict[str, float]:
        return {
            "N": self.initial_n_kg_per_ha,
            "P": self.initial_p_kg_per_ha,
            "K": self.initial_k_kg_per_ha,
        }

@dataclass(frozen=True)
class FertilizerInput:
    product: str
    n_fraction: float
    p_fraction: float
    k_fraction: float
    price_per_50kg: float

    @property
    def price_per_kg(self) -> float:
        return self.price_per_50kg / 50.0

    @property
    def nutrient_fractions(self) -> dict[str, float]:
        return {"N": self.n_fraction, "P": self.p_fraction, "K": self.k_fraction}

@dataclass(frozen=True)
class ScenarioInput:
    budget: float

@dataclass
class SolveResult:
    status: str
    application_rows: list[dict[str, Any]]
    effect_rows: list[dict[str, Any]]
    summary_row: dict[str, Any]
    baseline_rows: list[dict[str, Any]]
    optimal_rows: list[dict[str, Any]]
    baseline_summary_row: dict[str, Any]
    optimal_summary_row: dict[str, Any]
    delta_rows: list[dict[str, Any]]
    nutrient_balance_rows: list[dict[str, Any]]

APPLICATION_RATE_FIELDS = ("crop", "product", "kg_per_ac", "kg_total")
EFFECT_FIELDS = (
    "crop",
    "yield_increase_kg_per_ac",
    "fertilizer_cost_currency_per_ac",
    "net_returns_currency_per_ac",
)

def normalize_fraction(raw_value: str, label: str) -> float:
    if raw_value is None:
        return 0.0
    raw_text = str(raw_value).strip()
    if raw_text in {"", "%"}:
        return 0.0
    value_float = float(raw_text)
    if value_float < 0:
        raise ValueError(f"{label} must be non-negative.")
    if value_float > 1.0:
        if value_float > 100.0:
            raise ValueError(f"{label} must be a fraction or percent in [0, 100].")
        return value_float / 100.0
    return value_float

def normalize_nonnegative_float(raw_value: str | None, label: str) -> float:
    if raw_value is None:
        return 0.0
    raw_text = str(raw_value).strip()
    if raw_text == "":
        return 0.0
    value_float = float(raw_text)
    if value_float < 0:
        raise ValueError(f"{label} must be non-negative.")
    return value_float

def read_required_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"Missing input file: {path}")
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    if not rows:
        raise ValueError(f"{path} is empty.")
    return rows

def read_optional_rows(path: Path | None) -> list[dict[str, str]]:
    if path is None:
        return []
    if not path.exists():
        raise FileNotFoundError(f"Missing optional input file: {path}")
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader)

def validate_exact_keys(filename: str, found: tuple[str, ...], expected: tuple[str, ...]) -> None:
    found_set = set(found)
    expected_set = set(expected)
    if found_set != expected_set:
        missing = sorted(expected_set - found_set)
        extra = sorted(found_set - expected_set)
        raise ValueError(
            f"{filename} must contain exactly the supported names. "
            f"Missing: {missing or 'none'}. Extra: {extra or 'none'}."
        )

def get_required_value(row: dict[str, str], primary_key: str, aliases: tuple[str, ...] = ()) -> str:
    for key in (primary_key, *aliases):
        if key in row:
            return row[key]
    raise ValueError(f"Missing required column: {primary_key}")

def _optional_fraction(row: dict[str, str], key: str, product: str) -> float:
    if key not in row:
        return 0.0
    return normalize_fraction(row[key], f"{product} {key}")

def _resolve_phosphorus_fraction(row: dict[str, str], product: str) -> float:
    p_fraction = _optional_fraction(row, "p_pct", product)
    p2o5_fraction = _optional_fraction(row, "p2o5_pct", product)
    if p_fraction > 0.0 and p2o5_fraction > 0.0:
        raise ValueError(f"{product} cannot provide both p_pct and p2o5_pct.")
    if p_fraction > 0.0:
        return p_fraction
    return p2o5_fraction * P2O5_TO_P

def _resolve_potassium_fraction(row: dict[str, str], product: str) -> float:
    k_fraction = _optional_fraction(row, "k_pct", product)
    k2o_fraction = _optional_fraction(row, "k2o_pct", product)
    if k_fraction > 0.0 and k2o_fraction > 0.0:
        raise ValueError(f"{product} cannot provide both k_pct and k2o_pct.")
    if k_fraction > 0.0:
        return k_fraction
    return k2o_fraction * K2O_TO_K

def load_inputs(input_dir: Path) -> tuple[dict[str, CropInput], dict[str, FertilizerInput], ScenarioInput]:
    crop_rows = read_required_rows(input_dir / "crops.csv")
    fertilizer_rows = read_required_rows(input_dir / "fertilizers.csv")
    scenario_rows = read_required_rows(input_dir / "scenario.csv")

    crops: dict[str, CropInput] = {}
    for row in crop_rows:
        crop = row["crop"].strip()
        crops[crop] = CropInput(
            crop=crop,
            area_ac=float(get_required_value(row, "area_ac")),
            grain_value_per_kg=float(get_required_value(row, "grain_value_currency_per_kg", ("grain_value_per_kg",))),
            initial_n_kg_per_ha=normalize_nonnegative_float(row.get("initial_n_kg_per_ha"), f"{crop} initial_n_kg_per_ha"),
            initial_p_kg_per_ha=normalize_nonnegative_float(row.get("initial_p_kg_per_ha"), f"{crop} initial_p_kg_per_ha"),
            initial_k_kg_per_ha=normalize_nonnegative_float(row.get("initial_k_kg_per_ha"), f"{crop} initial_k_kg_per_ha"),
        )
    validate_exact_keys("crops.csv", tuple(crops.keys()), SUPPORTED_CROPS)

    fertilizers: dict[str, FertilizerInput] = {}
    for row in fertilizer_rows:
        product = row["product"].strip()
        if not product:
            raise ValueError("fertilizers.csv contains an empty product name.")
        if product in fertilizers:
            raise ValueError(f"Duplicate fertilizer product in fertilizers.csv: {product}")
        fertilizers[product] = FertilizerInput(
            product=product,
            n_fraction=normalize_fraction(get_required_value(row, "n_pct"), f"{product} n_pct"),
            p_fraction=_resolve_phosphorus_fraction(row, product),
            k_fraction=_resolve_potassium_fraction(row, product),
            price_per_50kg=float(get_required_value(row, "price_currency_per_50kg", ("price_per_50kg",))),
        )
    if not fertilizers:
        raise ValueError("fertilizers.csv must contain at least one fertilizer product.")

    if len(scenario_rows) != 1:
        raise ValueError("scenario.csv must contain exactly one data row.")
    scenario = ScenarioInput(
        budget=float(get_required_value(scenario_rows[0], "budget_currency", ("budget",))),
    )
    return crops, fertilizers, scenario

def write_outputs(result: SolveResult, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    write_csv(
        output_dir / "application_rates.csv",
        result.application_rows,
        APPLICATION_RATE_FIELDS,
    )
    write_csv(
        output_dir / "effects.csv",
        result.effect_rows,
        EFFECT_FIELDS,
    )
    write_csv(output_dir / "summary.csv", [result.summary_row], list(result.summary_row.keys()))

def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: tuple[str, ...] | list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

def print_console_summary(result: SolveResult) -> None:
    print("Optimized Application Rates")
    for row in result.application_rows:
        print(
            f"{row['crop']}: {row['product']} = "
            f"{row['kg_per_ac']:.3f} kg/ac ({row['kg_total']:.3f} kg total)"
        )
    print()
    print("Expected Average Effects per Acre")
    for row in result.effect_rows:
        print(
            f"{row['crop']}: yield increase {row['yield_increase_kg_per_ac']:.3f} kg/ac, "
            f"fertilizer cost {row['fertilizer_cost_currency_per_ac']:.3f} currency/ac, "
            f"net returns {row['net_returns_currency_per_ac']:.3f} currency/ac"
        )
    print()
    print("Summary")
    print(f"Budget: {result.summary_row['budget_currency']:.3f} currency")
    print(f"Total fertilizer cost: {result.summary_row['total_fertilizer_cost_currency']:.3f} currency")
    print(f"Total incremental value: {result.summary_row['total_incremental_value_currency']:.3f} currency")
    print(f"Total net returns: {result.summary_row['total_net_returns_currency']:.3f} currency")
