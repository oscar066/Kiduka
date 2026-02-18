from pydantic import BaseModel, Field
from typing import List
import uuid

# Define the input model matching the expected columns
class SoilSample(BaseModel):
    pH: float = Field(..., ge=0, le=14, description="Soil pH level (0-14)")
    N: float = Field(..., ge=0, description="Nitrogen percentage (e.g., 0.25)")
    OC: float = Field(..., ge=0, description="Organic Carbon percentage (e.g., 1.5)")
    P: float = Field(..., ge=0, description="Phosphorus in ppm")
    K: float = Field(..., ge=0, description="Potassium in ppm")
    Ca: float = Field(..., ge=0, description="Calcium in ppm")
    Mg: float = Field(..., ge=0, description="Magnesium in ppm")
    
    # Optional id to track samples if needed, generate if missing
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class BatchSoilInput(BaseModel):
    samples: List[SoilSample]