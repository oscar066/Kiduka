import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional, TypedDict

# Core Data Models
class SoilData(BaseModel):
    """Input soil data model"""
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

class AgrovetInfo(BaseModel):
    """Agricultural supply store information"""
    model_config = ConfigDict(from_attributes=True)
    
    name: str = Field(..., description="Agrovet store name")
    latitude: float = Field(..., description="Store latitude")
    longitude: float = Field(..., description="Store longitude")
    products: List[str] = Field(default_factory=list, description="Available fertilizer products")
    prices: List[float] = Field(default_factory=list, description="Prices corresponding to products")
    distance_km: float = Field(..., description="Distance from user location in kilometers")
    
    # Optional fields that might be added later
    id: Optional[uuid.UUID] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    rating: Optional[float] = None
    services: Optional[List[str]] = None

# AI Response Models
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
    """Complete structured AI response for soil analysis"""
    explanation: SoilExplanation
    recommendations: List[Recommendation] = Field(min_items=5, max_items=8)
    fertilizer_justification: str = Field(description="Comprehensive explanation of fertilizer recommendation")
    confidence_assessment: str = Field(description="Detailed assessment of prediction confidence")
    long_term_strategy: str = Field(description="Long-term soil improvement strategy")

# Main Response Models
class PredictionResponse(BaseModel):
    """Complete prediction response"""
    model_config = ConfigDict(from_attributes=True)
    
    # Core predictions
    soil_fertility_status: str
    soil_fertility_confidence: float
    fertilizer_recommendation: str
    fertilizer_confidence: float
    
    # Enhanced information
    nearest_agrovets: List[AgrovetInfo] = []
    structured_response: Optional[SoilAnalysisResponse] = None
    
    # Metadata
    prediction_id: Optional[uuid.UUID] = None
    timestamp: datetime

class PredictionHistory(BaseModel):
    """Historical prediction record"""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    user_id: uuid.UUID
    
    # Input soil data (flattened for database storage)
    simplified_texture: Optional[str]
    soil_ph: Optional[float]
    nitrogen: Optional[float]
    phosphorus: Optional[float]
    potassium: Optional[float]
    organic_matter: Optional[float]
    calcium: Optional[float]
    magnesium: Optional[float]
    copper: Optional[float]
    iron: Optional[float]
    zinc: Optional[float]
    location_lat: Optional[float]
    location_lng: Optional[float]
    location_name: Optional[str]
    
    # Prediction results
    fertility_prediction: Optional[str]
    fertility_confidence: Optional[float]
    fertilizer_recommendation: Optional[str]
    fertilizer_confidence: Optional[float]
    
    # Structured AI response (stored as JSON)
    structured_response: Optional[Dict[str, Any]]
    
    # Associated agrovets
    agrovets: List[AgrovetInfo] = []
    
    # Timestamps
    created_at: datetime
    updated_at: datetime

class PredictionListResponse(BaseModel):
    """Paginated prediction list response"""
    predictions: List[PredictionHistory]
    total: int
    page: int
    size: int
    pages: int

# Workflow State (TypedDict for internal processing)
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
    
    # AI-generated content
    structured_response: Optional[SoilAnalysisResponse]
    
    # Legacy fields (for backward compatibility)
    explanation: Optional[str]
    recommendations: List[str]
    
    # Database related
    user_id: Optional[str]
    prediction_id: Optional[str]
    db_session: Optional[Any]

# Type aliases for better code clarity
RecommendationDict = Dict[str, str] 
DetailedExplanationDict = Dict[str, str]