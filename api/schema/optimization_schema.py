from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LocationModel(StrictModel):
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees.")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees.")


class SoilInputModel(StrictModel):
    mode: Literal["direct", "history"] = Field(
        "direct",
        description="Use direct values now, or pass a history id for the repo owner to resolve upstream.",
    )
    soil_analysis_id: str | None = Field(
        None,
        description="External/database soil-analysis result id. Optimization service does not resolve it directly.",
    )
    ph: float | None = Field(None, gt=0.0, le=14.0, description="Soil pH.")
    soc_percent: float | None = Field(None, ge=0.0, description="Soil organic carbon, percent.")
    p_olsen_ppm: float | None = Field(None, ge=0.0, description="Olsen P, ppm = mg/kg.")
    k_exchangeable_ppm: float | None = Field(None, ge=0.0, description="Exchangeable K, ppm.")

    @model_validator(mode="after")
    def validate_source(self) -> "SoilInputModel":
        direct_values = (self.ph, self.soc_percent, self.p_olsen_ppm, self.k_exchangeable_ppm)
        if self.mode == "direct" and any(value is None for value in direct_values):
            raise ValueError("Direct soil input requires ph, soc_percent, p_olsen_ppm, and k_exchangeable_ppm.")
        if self.mode == "history" and not self.soil_analysis_id:
            raise ValueError("History soil input requires soil_analysis_id.")
        return self


class CropInputModel(StrictModel):
    crop: str = Field(..., min_length=1, description="Busia crop name or supported alias.")
    area_ha: float | None = Field(None, gt=0.0, description="Planting area in hectares.")
    area_ac: float | None = Field(None, gt=0.0, description="Planting area in acres.")
    grain_price_currency_per_kg: float = Field(
        ...,
        gt=0.0,
        description="Farm-gate market-product sale-weight price per kg.",
    )

    @model_validator(mode="after")
    def validate_area(self) -> "CropInputModel":
        if (self.area_ha is None) == (self.area_ac is None):
            raise ValueError("Provide exactly one of area_ha or area_ac.")
        return self


class FertilizerInputModel(StrictModel):
    product: str = Field(..., min_length=1, description="Fertilizer product name.")
    n_fraction: float = Field(0.0, ge=0.0, le=1.0, description="Elemental N fraction, kg N per kg product.")
    p_fraction: float | None = Field(None, ge=0.0, le=1.0, description="Elemental P fraction, kg P per kg product.")
    p2o5_fraction: float | None = Field(None, ge=0.0, le=1.0, description="P2O5 fraction, kg P2O5 per kg product.")
    k_fraction: float | None = Field(None, ge=0.0, le=1.0, description="Elemental K fraction, kg K per kg product.")
    k2o_fraction: float | None = Field(None, ge=0.0, le=1.0, description="K2O fraction, kg K2O per kg product.")
    price_currency_per_kg: float | None = Field(None, gt=0.0, description="Product price per kg product.")
    package_price_currency: float | None = Field(None, gt=0.0, description="Package price in currency.")
    package_weight_kg: float | None = Field(
        None,
        gt=0.0,
        description="Package product mass in kg. Convert volume externally before sending this field.",
    )

    @model_validator(mode="after")
    def validate_nutrients_and_price(self) -> "FertilizerInputModel":
        if self.p_fraction is not None and self.p2o5_fraction is not None:
            raise ValueError("Provide only one of p_fraction or p2o5_fraction.")
        if self.k_fraction is not None and self.k2o_fraction is not None:
            raise ValueError("Provide only one of k_fraction or k2o_fraction.")
        has_direct_price = self.price_currency_per_kg is not None
        has_package_price = self.package_price_currency is not None or self.package_weight_kg is not None
        if has_direct_price and has_package_price:
            raise ValueError("Provide either price_currency_per_kg or package_price_currency + package_weight_kg, not both.")
        if not has_direct_price and not (self.package_price_currency is not None and self.package_weight_kg is not None):
            raise ValueError("Provide price_currency_per_kg or both package_price_currency and package_weight_kg.")
        return self


class YAttConfigModel(StrictModel):
    source: Literal["kephis", "wofost"] = Field("kephis", description="Attainable-yield source.")
    wofost_sowing_date: str = Field("2024-03-15", description="WOFOST sowing date, ISO YYYY-MM-DD.")
    wofost_elevation_m: float | None = Field(None, description="WOFOST site elevation in meters.")
    fallback_to_kephis: bool = Field(True, description="Fallback to KEPHIS for crops without WOFOST parameters.")


class SolverConfigModel(StrictModel):
    method: Literal["fd_oa"] = Field("fd_oa", description="Feasible finite-difference OA solver.")
    time_limit_seconds: float = Field(10.0, gt=0.0)
    max_iterations: int = Field(20, gt=0)
    no_improvement_limit: int = Field(5, gt=0)


class ScenarioInputModel(StrictModel):
    budget_currency: float = Field(..., ge=0.0, description="Total fertilizer budget in currency.")
    y_att: YAttConfigModel = Field(default_factory=YAttConfigModel)
    solver: SolverConfigModel = Field(default_factory=SolverConfigModel)


class OptimizationRequest(StrictModel):
    location: LocationModel | None = Field(
        None,
        description="Required for WOFOST Y_att; ignored by KEPHIS.",
    )
    soil: SoilInputModel
    crops: list[CropInputModel]
    fertilizers: list[FertilizerInputModel]
    scenario: ScenarioInputModel


class ApplicationRow(BaseModel):
    crop: str
    fertilizer: str
    kg_product_per_ha: float
    kg_product_per_ac: float
    kg_product_total: float
    cost_total: float


class CropScenarioRow(BaseModel):
    crop: str
    yield_kg_ha: float = Field(..., description="Sale-weight market-product yield, kg/ha.")
    yield_kg_ac: float = Field(..., description="Sale-weight market-product yield, kg/ac.")
    revenue_total: float
    fertilizer_cost_total: float
    net_return_total: float


class OptimizationResponse(BaseModel):
    status: str
    application_rows: list[ApplicationRow]
    baseline_rows: list[CropScenarioRow]
    feasible_rows: list[CropScenarioRow]
    summary_row: dict[str, Any]
    solver_log: list[dict[str, Any]]
