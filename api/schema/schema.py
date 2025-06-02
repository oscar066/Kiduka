from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, TypedDict

# Pydantic models
class SoilData(BaseModel):
    simplified_texture: str = Field(..., description="Simplified soil texture (Sandy, Loamy, Clay, etc.)")
    ph: float = Field(..., description="Soil pH level", ge=0, le=14)
    n: float = Field(..., description="Nitrogen content", ge=0)
    p: float = Field(..., description="Phosphorus content", ge=0)
    k: float = Field(..., description="Potassium content", ge=0)
    o: float = Field(..., description="Organic content", ge=0)
    ca: float = Field(..., description="Calcium content", ge=0)
    mg: float = Field(..., description="Magnesium content", ge=0)
    cu: float = Field(..., description="Copper content", ge=0)
    fe: float = Field(..., description="Iron content", ge=0)
    zn: float = Field(..., description="Zinc content", ge=0)
    latitude: float = Field(..., description="Location latitude", ge=-90, le=90)
    longitude: float = Field(..., description="Location longitude", ge=-180, le=180)

class PredictionResponse(BaseModel):
    soil_fertility_status: str
    soil_fertility_confidence: float
    fertilizer_recommendation: str
    fertilizer_confidence: float
    nearest_agrovets: List[Dict[str, Any]]
    explanation: str
    recommendations: List[str]
    timestamp: str

class WorkflowState(TypedDict):
    soil_data: Dict[str, Any]
    app_components: Dict[str, Any]  # Add this line!
    fertility_prediction: Optional[str]
    fertility_confidence: Optional[float]
    fertilizer_prediction: Optional[str]
    fertilizer_confidence: Optional[float]
    nearest_agrovets: List[Dict[str, Any]]
    explanation: Optional[str]
    recommendations: List[str]