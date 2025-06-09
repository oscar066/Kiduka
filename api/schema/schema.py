from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, TypedDict

class SoilExplanation(BaseModel):
    """Structured soil analysis explanation"""
    summary: str = Field(description="Comprehensive summary of soil condition in farmer-friendly language")
    fertility_analysis: str = Field(description="Detailed explanation of fertility status")
    nutrient_analysis: str = Field(description="In-depth analysis of all nutrients")
    ph_analysis: str = Field(description="Detailed pH analysis")
    soil_texture_analysis: str = Field(description="Analysis of soil texture implications")
    overall_assessment: str = Field(description="Overall soil health assessment")

class Recommendation(BaseModel):
    """Individual recommendation with category and priority"""
    category: str = Field(description="Category of recommendation (fertilizer, soil_management, monitoring, etc.)")
    priority: str = Field(description="Priority level: high, medium, low")
    action: str = Field(description="Specific actionable recommendation")
    reasoning: str = Field(description="Brief explanation of why this recommendation is important")
    timeframe: str = Field(description="When to implement (immediate, within_week, monthly, seasonal)")

class SoilAnalysisResponse(BaseModel):
    """Complete structured response for soil analysis"""
    explanation: SoilExplanation
    recommendations: List[Recommendation] = Field(min_items=5, max_items=8)
    fertilizer_justification: str = Field(description="Comprehensive explanation of fertilizer recommendation")
    confidence_assessment: str = Field(description="Detailed assessment of prediction confidence")
    long_term_strategy: str = Field(description="Long-term soil improvement strategy")

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
    structured_response: Optional[SoilAnalysisResponse] = None  # New structured response format
    timestamp: str

# TypedDict for WorkflowState
class WorkflowState(TypedDict, total=False):
    # Core data
    soil_data: Dict[str, Any]
    app_components: Dict[str, Any]
    
    # Predictions
    fertility_prediction: Optional[str]
    fertility_confidence: Optional[float]
    fertilizer_prediction: Optional[str] 
    fertilizer_confidence: Optional[float]
    
    # Location-based data
    nearest_agrovets: List[Dict[str, Any]]
    
    # AI-generated content (backward compatibility)
    explanation: Optional[str]
    recommendations: List[str]
    
    # Structured response (new format)
    structured_response: Optional[SoilAnalysisResponse] = None

    # Detailed explanations (matching node output structure)
    detailed_explanation: Optional[Dict[str, str]]  # Keys: summary, fertility_analysis, etc.
    categorized_recommendations: Optional[List[Dict[str, str]]]  
    
    # Additional structured fields
    fertilizer_justification: Optional[str]
    confidence_assessment: Optional[str]
    long_term_strategy: Optional[str]

# Helper type for recommendation dictionary structure
class RecommendationDict(TypedDict):
    category: str
    priority: str
    action: str
    reasoning: str
    timeframe: str

# Updated detailed explanation structure
class DetailedExplanationDict(TypedDict):
    summary: str
    fertility_analysis: str
    nutrient_analysis: str
    ph_analysis: str
    soil_texture_analysis: str
    overall_assessment: str