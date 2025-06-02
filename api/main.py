import os
import sys
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# FastAPI imports
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# LangGraph imports
from langgraph.graph import StateGraph, START, END

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import schemas
from api.schema.schema import SoilData, PredictionResponse, WorkflowState

# Import modularized components
from api.utils.config import AppConfig
from api.utils.initialization import initialize_app_components
from api.utils.logging_config import setup_logger
from api.nodes.fertility_node import predict_fertility_node
from api.nodes.fertilizer_node import predict_fertilizer_node  
from api.nodes.agrovet_search_node import find_nearest_agrovets_node
from api.nodes.generate_explanation_node import generate_explanation_node

# Load environment variables
load_dotenv()

# Setup logging
logger = setup_logger("API", level=logging.INFO, console_level=logging.INFO)

# Initialize FastAPI app
app = FastAPI(
    title="Agricultural Prediction API", 
    description="Soil fertility prediction and fertilizer recommendation system with AI explanations",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global components (will be initialized on startup)
app_components = {}

def create_workflow():
    """Create and compile LangGraph workflow"""
    logger.info("Creating workflow...")
    
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("predict_fertility", predict_fertility_node)
    workflow.add_node("predict_fertilizer", predict_fertilizer_node)
    workflow.add_node("find_nearest_agrovets", find_nearest_agrovets_node)
    workflow.add_node("generate_explanation", generate_explanation_node)
    
    # Define edges
    workflow.add_edge(START, "predict_fertility")
    workflow.add_edge("predict_fertility", "predict_fertilizer")
    workflow.add_edge("predict_fertilizer", "find_nearest_agrovets")
    workflow.add_edge("find_nearest_agrovets", "generate_explanation")
    workflow.add_edge("generate_explanation", END)
    
    logger.info("Workflow created successfully")
    return workflow.compile()

# Initialize on startup
logger.info("Initializing application...")
app_components = initialize_app_components()
prediction_workflow = create_workflow()
logger.info("Application initialization completed")

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {
        "message": "Agricultural Prediction API",
        "version": "1.0.0",
        "status": "running",
        "models_loaded": {
            "fertility_model": app_components.get('fertility_model') is not None,
            "fertility_preprocessor": app_components.get('fertility_preprocessor') is not None,
            "fertilizer_model": app_components.get('fertilizer_model') is not None,
            "fertilizer_preprocessor": app_components.get('fertilizer_preprocessor') is not None
        },
        "endpoints": {
            "predict": "/predict - POST soil data for predictions",
            "health": "/health - Health check",
            "docs": "/docs - API documentation"
        }
    }

@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed")
    
    health_status = {
        "status": "healthy" if all([
            app_components.get('fertility_model'),
            app_components.get('fertility_preprocessor'),
            app_components.get('fertilizer_model'),
            app_components.get('fertilizer_preprocessor')
        ]) else "degraded",
        "timestamp": datetime.now().isoformat(),
        "models_available": {
            "fertility_model": app_components.get('fertility_model') is not None,
            "fertility_preprocessor": (app_components.get('fertility_preprocessor') is not None and 
                                    app_components.get('fertility_preprocessor').is_fitted),
            "fertilizer_model": app_components.get('fertilizer_model') is not None,
            "fertilizer_preprocessor": (app_components.get('fertilizer_preprocessor') is not None and 
                                      app_components.get('fertilizer_preprocessor').is_fitted)
        },
        "llm_available": app_components.get('llm') is not None
    }
    
    logger.debug(f"Health status: {health_status}")
    return health_status

@app.post("/predict", response_model=PredictionResponse)
async def predict_soil_fertility(soil_data: SoilData):
    """Predict soil fertility status and fertilizer recommendations based on soil data"""
    logger.info("Prediction endpoint accessed")
    logger.debug(f"Received soil data: {soil_data.model_dump()}")
    
    # Check if models are loaded
    required_components = ['fertility_model', 'fertility_preprocessor', 'fertilizer_model', 'fertilizer_preprocessor']
    if not all(app_components.get(comp) for comp in required_components):
        logger.error("One or more models/preprocessors not loaded")
        raise HTTPException(status_code=500, detail="Models not properly loaded")
    
    try:
        # Initialize workflow state
        initial_state: WorkflowState = {
            "soil_data": soil_data.model_dump(),
            "fertility_prediction": None,
            "fertility_confidence": None,
            "fertilizer_prediction": None,
            "fertilizer_confidence": None,
            "nearest_agrovets": [],
            "explanation": None,
            "recommendations": [],
            "app_components": app_components
        }
        
        logger.debug(f"Initial workflow state: {initial_state}")
        
        # Run the workflow
        logger.info("Running prediction workflow...")
        result = prediction_workflow.invoke(initial_state)
        logger.debug(f"Workflow result keys: {result.keys()}")
        
        # Create response with proper None checks
        response = PredictionResponse(
            soil_fertility_status=result.get("fertility_prediction", "UNKNOWN"),
            soil_fertility_confidence=result.get("fertility_confidence", 0.0),
            fertilizer_recommendation=result.get("fertilizer_prediction", "UNKNOWN"), 
            fertilizer_confidence=result.get("fertilizer_confidence", 0.0),
            nearest_agrovets=result.get("nearest_agrovets", []),
            explanation=result.get("explanation", "Unable to generate explanation"),
            recommendations=result.get("recommendations", ["Consult with agricultural expert"]),
            timestamp=datetime.now().isoformat()
        )
        
        logger.info("Prediction completed successfully")
        logger.info(f"Results - Fertility: {response.soil_fertility_status} ({response.soil_fertility_confidence:.2f}), Fertilizer: {response.fertilizer_recommendation} ({response.fertilizer_confidence:.2f})")
        return response
        
    except Exception as e:
        logger.error(f"Error in prediction pipeline: {e}")
        logger.error(f"Exception details:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Use Heroku's PORT or default to 8000
    logger.info(f"Starting uvicorn server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")