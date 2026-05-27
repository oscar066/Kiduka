from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    """
    Base model that forbids extra fields during validation.
    
    This ensures strict adherence to the schema, rejecting any incoming
    payloads that contain unexpected or undocumented fields.
    """
    model_config = ConfigDict(extra="forbid")


class LocationModel(StrictModel):
    """
    Schema for capturing geographic coordinates.
    
    Attributes:
        lat (float): Latitude in decimal degrees (must be between -90 and 90).
        lon (float): Longitude in decimal degrees (must be between -180 and 180).
    """
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude in decimal degrees.")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude in decimal degrees.")


class SoilInputModel(StrictModel):
    """
    Schema for providing soil test data to the optimization engine.
    
    This model supports two modes:
    - "direct": Passing the soil parameter values directly in the payload.
    - "history": Providing an ID for a previous analysis to be resolved upstream.
    
    Attributes:
        mode (Literal["direct", "history"]): The method of providing soil data.
        soil_analysis_id (Optional[str]): Database ID of a previous soil analysis.
        ph (Optional[float]): Soil pH level.
        soc_percent (Optional[float]): Soil Organic Carbon percentage.
        p_olsen_ppm (Optional[float]): Olsen Phosphorus concentration in parts per million.
        k_exchangeable_ppm (Optional[float]): Exchangeable Potassium in parts per million.
    """
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
        """
        Validates that required fields are present based on the selected mode.
        
        Raises:
            ValueError: If 'direct' mode is selected but any soil parameters are missing.
            ValueError: If 'history' mode is selected but the 'soil_analysis_id' is missing.
        """
        direct_values = (self.ph, self.soc_percent, self.p_olsen_ppm, self.k_exchangeable_ppm)
        if self.mode == "direct" and any(value is None for value in direct_values):
            raise ValueError("Direct soil input requires ph, soc_percent, p_olsen_ppm, and k_exchangeable_ppm.")
        if self.mode == "history" and not self.soil_analysis_id:
            raise ValueError("History soil input requires soil_analysis_id.")
        return self


class CropInputModel(StrictModel):
    """
    Schema representing a target crop for yield optimization.
    
    Attributes:
        crop (str): The name or supported alias of the crop.
        area_ha (Optional[float]): The planting area in hectares.
        area_ac (Optional[float]): The planting area in acres.
        grain_price_currency_per_kg (float): The expected farm-gate sale price per kg.
    """
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
        """
        Validates that exactly one area unit (hectares or acres) is provided.
        
        Raises:
            ValueError: If both area units are provided, or if neither are provided.
        """
        if (self.area_ha is None) == (self.area_ac is None):
            raise ValueError("Provide exactly one of area_ha or area_ac.")
        return self


class FertilizerInputModel(StrictModel):
    """
    Schema for defining an available fertilizer product.
    
    Allows specification of nutrient fractions (N, P, K) and price either directly
    per kg or based on a package weight and price.
    
    Attributes:
        product (str): Name of the fertilizer product.
        n_fraction (float): Mass fraction of Elemental Nitrogen (N).
        p_fraction (Optional[float]): Mass fraction of Elemental Phosphorus (P).
        p2o5_fraction (Optional[float]): Mass fraction of Phosphorus Pentoxide (P2O5).
        k_fraction (Optional[float]): Mass fraction of Elemental Potassium (K).
        k2o_fraction (Optional[float]): Mass fraction of Potassium Oxide (K2O).
        price_currency_per_kg (Optional[float]): Direct price per kg of the product.
        package_price_currency (Optional[float]): Price of an entire package.
        package_weight_kg (Optional[float]): Mass of the package in kg.
    """
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
        """
        Validates mutually exclusive nutrient fractions and price configurations.
        
        Raises:
            ValueError: If both P and P2O5 fractions are provided.
            ValueError: If both K and K2O fractions are provided.
            ValueError: If price is defined both directly per kg and via package dimensions.
            ValueError: If no valid price configuration is provided.
        """
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
    """
    Configuration schema for attainable-yield (Y_att) calculations.
    
    Allows selection between KEPHIS data or WOFOST models, along with their
    respective required parameters.
    
    Attributes:
        source (Literal["kephis", "wofost"]): The primary data source for attainable yield.
        wofost_sowing_date (str): Expected sowing date in ISO format (YYYY-MM-DD).
        wofost_elevation_m (Optional[float]): Elevation of the site in meters, required if using WOFOST.
        fallback_to_kephis (bool): If true, falls back to KEPHIS if WOFOST parameters are unavailable for a crop.
    """
    source: Literal["kephis", "wofost"] = Field("kephis", description="Attainable-yield source.")
    wofost_sowing_date: str = Field("2024-03-15", description="WOFOST sowing date, ISO YYYY-MM-DD.")
    wofost_elevation_m: float | None = Field(None, description="WOFOST site elevation in meters.")
    fallback_to_kephis: bool = Field(True, description="Fallback to KEPHIS for crops without WOFOST parameters.")


class SolverConfigModel(StrictModel):
    """
    Configuration schema for the mathematical optimization solver.
    
    Attributes:
        method (Literal["fd_oa"]): The algorithm method to use. Defaults to Feasible Finite-Difference Outer Approximation.
        time_limit_seconds (float): Maximum time in seconds the solver is allowed to run.
        max_iterations (int): Maximum number of iterations for the solver algorithm.
        no_improvement_limit (int): Early stopping criterion if no improvements occur for this many iterations.
    """
    method: Literal["fd_oa"] = Field("fd_oa", description="Feasible finite-difference OA solver.")
    time_limit_seconds: float = Field(10.0, gt=0.0)
    max_iterations: int = Field(20, gt=0)
    no_improvement_limit: int = Field(5, gt=0)


class ScenarioInputModel(StrictModel):
    """
    Schema tying together the high-level scenario parameters.
    
    Attributes:
        budget_currency (float): The maximum available budget for purchasing fertilizers.
        y_att (YAttConfigModel): Configuration for attainable yield calculations.
        solver (SolverConfigModel): Configuration for the optimization solver algorithm.
    """
    budget_currency: float = Field(..., ge=0.0, description="Total fertilizer budget in currency.")
    y_att: YAttConfigModel = Field(default_factory=YAttConfigModel)
    solver: SolverConfigModel = Field(default_factory=SolverConfigModel)


class OptimizationRequest(StrictModel):
    """
    Root schema for a fertilizer optimization API request payload.
    
    Attributes:
        location (Optional[LocationModel]): Geographic location, required if WOFOST is used.
        soil (SoilInputModel): The current soil nutrient levels.
        crops (list[CropInputModel]): A list of crops to be planted and optimized.
        fertilizers (list[FertilizerInputModel]): The available fertilizers to choose from.
        scenario (ScenarioInputModel): Scenario limits such as budget and solver configs.
    """
    location: LocationModel | None = Field(
        None,
        description="Required for WOFOST Y_att; ignored by KEPHIS.",
    )
    soil: SoilInputModel
    crops: list[CropInputModel]
    fertilizers: list[FertilizerInputModel]
    scenario: ScenarioInputModel


class ApplicationRow(BaseModel):
    """
    Schema for a specific recommended fertilizer application.
    
    Attributes:
        crop (str): The target crop for this application.
        fertilizer (str): The specific fertilizer product recommended.
        kg_product_per_ha (float): Recommended application rate in kg per hectare.
        kg_product_per_ac (float): Recommended application rate in kg per acre.
        kg_product_total (float): Total mass of fertilizer product required in kg.
        cost_total (float): Total cost of purchasing this fertilizer amount.
    """
    crop: str
    fertilizer: str
    kg_product_per_ha: float
    kg_product_per_ac: float
    kg_product_total: float
    cost_total: float


class CropScenarioRow(BaseModel):
    """
    Schema summarizing the financial and yield outcomes for a crop.
    
    Attributes:
        crop (str): The target crop.
        yield_kg_ha (float): Expected sale-weight yield in kg per hectare.
        yield_kg_ac (float): Expected sale-weight yield in kg per acre.
        revenue_total (float): Expected total revenue from selling the yield.
        fertilizer_cost_total (float): Total cost of the fertilizers applied to this crop.
        net_return_total (float): Total revenue minus total fertilizer costs.
    """
    crop: str
    yield_kg_ha: float = Field(..., description="Sale-weight market-product yield, kg/ha.")
    yield_kg_ac: float = Field(..., description="Sale-weight market-product yield, kg/ac.")
    revenue_total: float
    fertilizer_cost_total: float
    net_return_total: float


class OptimizationResponse(BaseModel):
    """
    Root schema for the API response after a successful optimization run.
    
    Attributes:
        status (str): The solver's final status (e.g., "optimal", "feasible", "timeout").
        application_rows (list[ApplicationRow]): Recommended fertilizer applications per crop.
        baseline_rows (list[CropScenarioRow]): Projected outcomes if zero fertilizer was applied.
        feasible_rows (list[CropScenarioRow]): Projected optimal outcomes under the recommended applications.
        summary_row (dict[str, Any]): High-level aggregated metrics across all crops.
        solver_log (list[dict[str, Any]]): Internal execution metrics and steps from the solver algorithm.
    """
    status: str
    application_rows: list[ApplicationRow]
    baseline_rows: list[CropScenarioRow]
    feasible_rows: list[CropScenarioRow]
    summary_row: dict[str, Any]
    solver_log: list[dict[str, Any]]
