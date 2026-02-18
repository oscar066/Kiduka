import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional, TypedDict

# Core Data Models
class SoilData(BaseModel):
    """Input soil data model"""
    ph: float = Field(..., description="Soil pH level", ge=0, le=14)
    n: float = Field(..., description="Nitrogen content", ge=0)
    p: float = Field(..., description="Phosphorus content", ge=0)
    k: float = Field(..., description="Potassium content", ge=0)
    organic_carbon: float = Field(..., description="Organic Carbon content (%)", ge=0)
    ca: float = Field(..., description="Calcium content", ge=0)
    mg: float = Field(..., description="Magnesium content", ge=0)
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

# Main Response Models
class PredictionResponse(BaseModel):
    """Complete prediction response"""
    model_config = ConfigDict(from_attributes=True)
    
    # Core health assessment
    soil_health_index: float
    initial_soil_fertility_status: str
    soil_fertility_status: str
    mentions: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    
    # Enhanced information
    nearest_agrovets: List[AgrovetInfo] = []
    
    # Metadata
    prediction_id: Optional[uuid.UUID] = None
    timestamp: datetime

class PredictionHistory(BaseModel):
    """Historical prediction record"""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    user_id: uuid.UUID
    
    # Input soil data (flattened for database storage)
    soil_ph: Optional[float]
    nitrogen: Optional[float]
    phosphorus: Optional[float]
    potassium: Optional[float]
    organic_carbon: Optional[float]
    calcium: Optional[float]
    magnesium: Optional[float]
    location_lat: Optional[float]
    location_lng: Optional[float]
    location_name: Optional[str]

    # Analysis results
    soil_health_index: float
    initial_soil_fertility_status: str
    soil_fertility_status: str
    mentions: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    
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


# Type aliases for better code clarity
RecommendationDict = Dict[str, str] 
DetailedExplanationDict = Dict[str, str]