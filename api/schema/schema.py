import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional, TypedDict

# Core Data Models
class SoilData(BaseModel):
    """
    Schema for receiving soil test data from the client for prediction generation.
    
    This model supports both raw laboratory values and geographical coordinates 
    used for fetching satellite data or location-based features.
    
    Attributes:
        ph (float): Soil pH level, expected between 0 and 14.
        n (Optional[float]): Nitrogen content in parts per million (ppm).
        p (Optional[float]): Phosphorus content in ppm.
        k (Optional[float]): Potassium content in ppm.
        organic_carbon (Optional[float]): Organic Carbon content percentage.
        ca (Optional[float]): Calcium content in ppm.
        mg (Optional[float]): Magnesium content in ppm.
        ph_score (Optional[int]): Optional pre-computed pH score (1-4) for ML model inputs.
        year (Optional[int]): Target year for Earth Engine satellite data fetching. Defaults to 2025.
        latitude (float): Geographic latitude of the soil sample (-90 to 90).
        longitude (float): Geographic longitude of the soil sample (-180 to 180).
        location_name (Optional[str]): A human-readable name or address for the location.
    """
    ph: float = Field(..., description="Soil pH level", ge=0, le=14)
    n: Optional[float] = Field(None, description="Nitrogen content", ge=0)
    p: Optional[float] = Field(None, description="Phosphorus content", ge=0)
    k: Optional[float] = Field(None, description="Potassium content", ge=0)
    organic_carbon: Optional[float] = Field(None, description="Organic Carbon content (%)", ge=0)
    ca: Optional[float] = Field(None, description="Calcium content", ge=0)
    mg: Optional[float] = Field(None, description="Magnesium content", ge=0)
    ph_score: Optional[int] = Field(None, description="Optional pH score (1-4) for ML model", ge=1, le=4)
    year: Optional[int] = Field(2025, description="Year for Earth Engine satellite data fetch")
    latitude: float = Field(..., description="Location latitude", ge=-90, le=90)
    longitude: float = Field(..., description="Location longitude", ge=-180, le=180)
    location_name: Optional[str] = Field(None, description="Human-readable location name")

class AgrovetInfo(BaseModel):
    """
    Schema representing an agricultural supply store (Agrovet).
    
    Used to provide users with nearby locations to purchase recommended fertilizers.
    
    Attributes:
        name (str): The official name of the Agrovet store.
        latitude (float): Geographic latitude of the store.
        longitude (float): Geographic longitude of the store.
        products (List[str]): List of fertilizer products available at this store.
        prices (List[float]): Prices corresponding to the products available.
        distance_km (float): The calculated distance from the user's location to the store in kilometers.
        id (Optional[uuid.UUID]): Database identifier for the store.
        address (Optional[str]): Physical street address of the store.
        phone (Optional[str]): Contact phone number.
        email (Optional[str]): Contact email address.
        rating (Optional[float]): Average customer rating of the store.
        services (Optional[List[str]]): Additional agricultural services provided by the store.
    """
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
    """
    Schema representing the complete result of a soil fertility prediction.
    
    Attributes:
        soil_health_index (float): An aggregated numerical score representing overall soil health.
        initial_soil_fertility_status (str): The raw classification predicted by the model (e.g., "Low", "Optimal").
        soil_fertility_status (str): The final, human-readable fertility status.
        mentions (List[str]): Keywords or key nutrients highlighted by the LLM explanation.
        recommendations (List[str]): Actionable agricultural advice generated for the user.
        nearest_agrovets (List[AgrovetInfo]): List of nearby stores where recommended inputs can be bought.
        nutrients (Dict[str, Dict[str, Any]]): Detailed breakdown of individual nutrient scores and labels.
        prediction_mode (Optional[str]): Indicates whether a mathematical 'FORMULA' or 'ML' model was used.
        confidence (Optional[Dict[str, Any]]): Statistical confidence metrics from the ML model, if applicable.
        prediction_id (Optional[uuid.UUID]): The database identifier for this prediction record.
        location_name (Optional[str]): The resolved name of the tested location.
        timestamp (datetime): The exact time the prediction was generated.
    """
    model_config = ConfigDict(from_attributes=True)
    
    # Core health assessment
    soil_health_index: float
    initial_soil_fertility_status: str
    soil_fertility_status: str
    mentions: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    
    # Enhanced information
    nearest_agrovets: List[AgrovetInfo] = []
    nutrients: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Detailed nutrient scores (score and label)")
    
    # Metadata
    prediction_mode: Optional[str] = Field(None, description="Prediction method: 'FORMULA' or 'ML'")
    confidence: Optional[Dict[str, Any]] = Field(None, description="Confidence metrics for ML predictions")
    prediction_id: Optional[uuid.UUID] = None
    location_name: Optional[str] = None
    timestamp: datetime

class PredictionHistory(BaseModel):
    """
    Schema representing a historical record of a prediction for database retrieval.
    
    Attributes:
        id (uuid.UUID): The primary key identifier of the prediction.
        user_id (uuid.UUID): Identifier of the user who made the prediction.
        soil_ph (Optional[float]): Flattened input soil pH.
        nitrogen (Optional[float]): Flattened input nitrogen.
        phosphorus (Optional[float]): Flattened input phosphorus.
        potassium (Optional[float]): Flattened input potassium.
        organic_carbon (Optional[float]): Flattened input organic carbon.
        calcium (Optional[float]): Flattened input calcium.
        magnesium (Optional[float]): Flattened input magnesium.
        location_lat (Optional[float]): The latitude of the tested soil.
        location_lng (Optional[float]): The longitude of the tested soil.
        location_name (Optional[str]): Resolved name of the location.
        soil_health_index (float): Overall health score resulting from the prediction.
        initial_soil_fertility_status (Optional[str]): Initial model classification.
        soil_fertility_status (Optional[str]): Final classification provided to the user.
        mentions (List[str]): Highlighted keywords from the AI explanation.
        recommendations (List[str]): The stored agricultural advice.
        nutrients (Dict[str, Dict[str, Any]]): Detailed nutrient breakdown.
        prediction_mode (Optional[str]): Method used ('FORMULA' or 'ML').
        confidence_data (Optional[Dict[str, Any]]): Machine learning confidence metrics.
        agrovets (List[AgrovetInfo]): Saved nearby agrovet locations.
        created_at (datetime): Record creation timestamp.
        updated_at (datetime): Last modification timestamp.
    """
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
    initial_soil_fertility_status: Optional[str] = None
    soil_fertility_status: Optional[str] = None
    mentions: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    nutrients: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Detailed nutrient scores")
    
    
    # ML Metadata
    prediction_mode: Optional[str] = None
    confidence_data: Optional[Dict[str, Any]] = None
    
    # Associated agrovets
    agrovets: List[AgrovetInfo] = []
    
    # Timestamps
    created_at: datetime
    updated_at: datetime

class PredictionListResponse(BaseModel):
    """
    Paginated schema for listing user prediction histories.
    
    Attributes:
        predictions (List[PredictionHistory]): A list of past prediction records.
        total (int): Total number of predictions belonging to the user.
        page (int): Current page index.
        size (int): Number of items per page.
        pages (int): Total number of pages available.
    """
    predictions: List[PredictionHistory]
    total: int
    page: int
    size: int
    pages: int


# Type aliases for better code clarity
RecommendationDict = Dict[str, str] 
DetailedExplanationDict = Dict[str, str]