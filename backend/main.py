import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional

# Import the classifier and logger
from classifier.soil_classifier import SoilHealthClassifier
from utils.logger import setup_logger
from schema import SoilSample, BatchSoilInput

logger = setup_logger("FastAPI_Main")

app = FastAPI(title="Soil Health Classifier API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],
)

# Initialize the classifier
logger.info("Initializing SoilHealthClassifier...")
classifier = SoilHealthClassifier()


@app.post("/classify", response_model=List[Dict])
def classify_soil_samples(input_data: BatchSoilInput):
    """
    Classify a batch of soil samples.
    """
    results = []
    
    try:
        logger.info(f"Received request to classify {len(input_data.samples)} samples")
        
        for sample in input_data.samples:
            # Convert Pydantic model to dict
            row = sample.model_dump()
            
            # Process the row using the default mapping
            result = classifier.process_row(row)
            
            # Add sample ID if present to the result for correlation
            if sample.id:
                result["id"] = sample.id
                
            results.append(result)
            
        logger.info("Batch classification completed successfully")
        return results
    except Exception as e:
        logger.error(f"Error during batch classification: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/")
def read_root():
    logger.info("Root endpoint accessed")
    return {
        "message": "Welcome to the Soil Health Classifier API. Use POST /classify to analyze soil samples."
    }

if __name__ == "__main__":
    logger.info("Starting Soil Health Classifier API server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
