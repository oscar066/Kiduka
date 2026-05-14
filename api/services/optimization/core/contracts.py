from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from .unit_conversions import (
    hectares_to_acres,
    k_ppm_to_mmol_kg,
    kg_per_ha_to_kg_per_ac,
    p_olsen_ppm_to_mg_kg,
    soc_percent_to_g_kg,
)


@dataclass(frozen=True)
class SoilInput:
    pH: float
    soc_percent: float
    p_olsen_ppm: float
    k_ppm: float

    @property
    def soc_g_kg(self) -> float:
        return soc_percent_to_g_kg(self.soc_percent)

    @property
    def p_olsen_mg_kg(self) -> float:
        return p_olsen_ppm_to_mg_kg(self.p_olsen_ppm)

    @property
    def kex_mmol_kg(self) -> float:
        return k_ppm_to_mmol_kg(self.k_ppm)


@dataclass(frozen=True)
class NPKRate:
    n_kg_ha: float
    p_kg_ha: float
    k_kg_ha: float

    def as_tuple(self) -> tuple[float, float, float]:
        return (self.n_kg_ha, self.p_kg_ha, self.k_kg_ha)


@dataclass(frozen=True)
class CropInput:
    crop: str
    area_ha: float
    price_currency_per_kg: float
    kephis_crop: str
    rquefts_crop: str
    y_attainable_kg_ha: float
    moisture_content: float

    @property
    def area_ac(self) -> float:
        return hectares_to_acres(self.area_ha)

    @property
    def dry_to_sale_weight_factor(self) -> float:
        return 1.0 / (1.0 - self.moisture_content)

    @property
    def y_attainable_sale_weight_kg_ha(self) -> float:
        return self.y_attainable_kg_ha * self.dry_to_sale_weight_factor

    def dry_yield_to_sale_weight_kg_ha(self, dry_yield_kg_ha: float) -> float:
        return float(dry_yield_kg_ha) * self.dry_to_sale_weight_factor


@dataclass(frozen=True)
class FertilizerInput:
    product: str
    n_fraction: float
    p_fraction: float
    k_fraction: float
    price_currency_per_kg: float

    @property
    def nutrient_fractions(self) -> tuple[float, float, float]:
        return (self.n_fraction, self.p_fraction, self.k_fraction)


@dataclass(frozen=True)
class OptimizationScenario:
    budget_currency: float
    time_limit_seconds: float = 10.0
    max_iterations: int = 20
    no_improvement_limit: int = 5
    status_label: str = "Feasible"


class YAttSource(str, Enum):
    KEPHIS = "kephis"
    WOFOST = "wofost"


@dataclass(frozen=True)
class GeoLocation:
    lat: float
    lon: float


@dataclass(frozen=True)
class YAttConfig:
    source: YAttSource = YAttSource.KEPHIS
    kephis_yield_basis: str = "average_lower"
    location: GeoLocation | None = None
    wofost_sowing_date: str = "2024-03-15"
    wofost_elevation_m: float | None = None
    wofost_service_root: Path | None = None
    wofost_fallback_to_kephis: bool = True


@dataclass(frozen=True)
class OptimizationProblem:
    soil: SoilInput
    crops: tuple[CropInput, ...]
    fertilizers: tuple[FertilizerInput, ...]
    scenario: OptimizationScenario


@dataclass(frozen=True)
class YieldResult:
    crop: str
    n_kg_ha: float
    p_kg_ha: float
    k_kg_ha: float
    yield_kg_ha: float
    n_gap_kg_ha: float | None = None
    p_gap_kg_ha: float | None = None
    k_gap_kg_ha: float | None = None
    soil_n_supply_kg_ha: float | None = None
    soil_p_supply_kg_ha: float | None = None
    soil_k_supply_kg_ha: float | None = None


@dataclass(frozen=True)
class CropScenarioRow:
    crop: str
    yield_kg_ha: float
    yield_kg_ac: float
    revenue_total: float
    fertilizer_cost_total: float
    net_return_total: float


def crop_scenario_row(
    crop: CropInput,
    yield_kg_ha: float,
    fertilizer_cost_total: float,
) -> CropScenarioRow:
    revenue_total = crop.area_ha * crop.price_currency_per_kg * yield_kg_ha
    return CropScenarioRow(
        crop=crop.crop,
        yield_kg_ha=float(yield_kg_ha),
        yield_kg_ac=kg_per_ha_to_kg_per_ac(yield_kg_ha),
        revenue_total=float(revenue_total),
        fertilizer_cost_total=float(fertilizer_cost_total),
        net_return_total=float(revenue_total - fertilizer_cost_total),
    )
