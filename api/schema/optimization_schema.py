from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class CropInputModel(BaseModel):
    crop: str = Field(..., description="Crop name, e.g., 'Maize HP >3t'")
    area_ac: float = Field(..., gt=0, description="Area in acres")
    grain_value_currency_per_kg: float = Field(..., gt=0, description="Grain value in currency per kg")
    initial_n_kg_per_ha: Optional[float] = Field(0.0, ge=0, description="Baseline N offset")
    initial_p_kg_per_ha: Optional[float] = Field(0.0, ge=0, description="Baseline P offset")
    initial_k_kg_per_ha: Optional[float] = Field(0.0, ge=0, description="Baseline K offset")

class FertilizerInputModel(BaseModel):
    product: str = Field(..., description="Fertilizer product name")
    n_pct: Optional[float] = Field(0.0, ge=0, description="Nitrogen fraction/percent")
    p_pct: Optional[float] = Field(0.0, ge=0, description="Phosphorus (elemental) fraction/percent")
    p2o5_pct: Optional[float] = Field(0.0, ge=0, description="P2O5 fraction/percent")
    k_pct: Optional[float] = Field(0.0, ge=0, description="Potassium (elemental) fraction/percent")
    k2o_pct: Optional[float] = Field(0.0, ge=0, description="K2O fraction/percent")
    price_currency_per_50kg: float = Field(..., gt=0, description="Price per 50kg bag")

class ScenarioInputModel(BaseModel):
    budget_currency: float = Field(..., ge=0, description="Total budget in currency")

class OptimizationRequest(BaseModel):
    crops: List[CropInputModel]
    fertilizers: List[FertilizerInputModel]
    scenario: ScenarioInputModel

class ApplicationRow(BaseModel):
    crop: str
    product: str
    kg_per_ac: float
    kg_total: float

class EffectRow(BaseModel):
    crop: str
    yield_increase_kg_per_ac: float
    fertilizer_cost_currency_per_ac: float
    net_returns_currency_per_ac: float

class OptimizationResponse(BaseModel):
    status: str
    application_rows: List[ApplicationRow]
    effect_rows: List[EffectRow]
    summary_row: Dict[str, Any]
    delta_rows: List[Dict[str, Any]]
    nutrient_balance_rows: List[Dict[str, Any]]
