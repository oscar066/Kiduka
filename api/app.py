import os
import sys
from pathlib import Path

# data processing imports
import numpy as np
import pandas as pd

# FastAPI imports
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional

# LangGraph and LangChain imports
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from datetime import datetime
import logging
from dotenv import load_dotenv
from typing_extensions import TypedDict

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from preprocessing import SoilDataPreprocessor
from schema import SoilData, PredictionResponse, WorkflowState
from models import ModelLoader
from agrovet import AgrovetLocator

# Load environment variables
load_dotenv()

# Configure logging with more detailed formatting
logging.basicConfig(
    level=logging.INFO,  
    format='%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
    handlers=[
        logging.StreamHandler(),
        #logging.FileHandler('agricultural_api.log')
    ]
)
logger = logging.getLogger(__name__)

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

# Global variables
llm = None
fertility_preprocessor = None
fertility_model = None
fertilizer_preprocessor = None
fertilizer_model = None
agrovet_locator = None

# Define mappings for predictions
FERTILITY_STATUS_MAP = {0: "MODERATELY HEALTHY", 1: "POOR", 2: "VERY POOR"}
FERTILIZER_TYPE_MAP = {0: "NPK", 1: "TSP"}

# Define column mappings to match training data
COLUMN_MAPPING = {
    'simplified_texture': 'simpliedtexture(1)', 
    'ph': 'ph', 
    'n': 'n', 
    'p': 'p', 
    'k': 'k', 
    'o': 'o',
    'ca': 'ca', 
    'mg': 'mg', 
    'cu': 'cu', 
    'fe': 'fe', 
    'zn': 'zn'
}

# Expected feature columns after preprocessing (adjust based on your training data)
FERTILITY_FEATURE_COLUMNS = ['simpliedtexture(1)', 'ph', 'n', 'p', 'k', 'o', 'ca', 'mg', 'cu', 'fe', 'zn']
FERTILIZER_FEATURE_COLUMNS = ['simpliedtexture(1)', 'ph', 'n', 'p', 'k', 'o', 'ca', 'mg', 'cu', 'fe', 'zn', 'soilfertilitystatus']

def initialize_models():
    """Initialize and load all models and preprocessors"""
    global fertility_preprocessor, fertility_model, fertilizer_preprocessor, fertilizer_model
    
    try:
        logger.info("Initializing model loader...")
        # Get the absolute path to the models directory
        current_dir = Path(__file__).parent
        models_dir = current_dir.parent / "models"
        
        # Create ModelLoader instance with specific models directory
        loader = ModelLoader(models_dir=str(models_dir))
        
        # List available models for debugging
        available_models = loader.list_available_models()
        logger.info(f"Available model files: {available_models}")
        
        if not available_models:
            logger.error(f"No model files found in {models_dir}")
            return False
        
        # Load fertility components
        logger.info("Loading fertility preprocessor...")
        fertility_preprocessor = loader.load_preprocessor('soil_fertility_status_preprocessor.joblib')
        logger.info(f"Fertility preprocessor loaded. Is fitted: {fertility_preprocessor.is_fitted}")
        logger.info(f"Fertility preprocessor encoders: {list(fertility_preprocessor.label_encoders.keys())}")
        logger.info(f"Fertility preprocessor feature columns: {fertility_preprocessor.feature_columns}")
        
        logger.info("Loading fertility model...")
        fertility_model = loader.load_model('Soil_Status_randomForest_Classifier_Model.joblib')
        logger.info(f"Fertility model loaded: {type(fertility_model)}")
        
        # Load fertilizer components
        logger.info("Loading fertilizer preprocessor...")
        fertilizer_preprocessor = loader.load_preprocessor('soil_fertilizer_recommendation_preprocessor.joblib')
        logger.info(f"Fertilizer preprocessor loaded. Is fitted: {fertilizer_preprocessor.is_fitted}")
        logger.info(f"Fertilizer preprocessor encoders: {list(fertilizer_preprocessor.label_encoders.keys())}")
        logger.info(f"Fertilizer preprocessor feature columns: {fertilizer_preprocessor.feature_columns}")
        
        logger.info("Loading fertilizer model...")
        fertilizer_model = loader.load_model('Fertilizers_xgb_Classifier_Model.joblib')
        logger.info(f"Fertilizer model loaded: {type(fertilizer_model)}")
        
        logger.info("All models and preprocessors loaded successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        logger.error(f"Exception details:", exc_info=True)
        return False

def initialize_llm():
    """Initialize OpenAI LLM"""
    global llm
    try:
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key and openai_api_key != "your-openai-api-key-here":
            llm = ChatOpenAI(
                model="gpt-4o-mini", 
                temperature=0.3, 
                api_key=openai_api_key
            )
            logger.info("OpenAI LLM initialized successfully")
        else:
            logger.warning("OpenAI API key not found or invalid")
    except Exception as e:
        logger.error(f"Error initializing OpenAI LLM: {e}")

def initialize_agrovet_locator():
    """Initialize AgrovetLocator with data"""
    global agrovet_locator
    try:
        current_dir = Path(__file__).parent
        data_path = current_dir.parent / "data" / "agrovet_data_cleaned.csv"
        agrovet_locator = AgrovetLocator.load_from_csv(str(data_path))
        logger.info("AgrovetLocator initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing AgrovetLocator: {e}")
        return False
    
def prepare_soil_dataframe(soil_data: Dict[str, Any]) -> pd.DataFrame:
    """Convert soil data dictionary to DataFrame with proper column names"""
    logger.debug(f"Incoming soil_data: {soil_data}")
    
    # Map column names to match training data
    mapped_data = {}
    for k, v in soil_data.items():
        mapped_key = COLUMN_MAPPING.get(k, k)
        mapped_data[mapped_key] = v
        logger.debug(f"Mapped {k} -> {mapped_key}: {v}")
    
    df = pd.DataFrame([mapped_data])
    logger.debug(f"Created DataFrame with shape: {df.shape}")
    logger.debug(f"DataFrame columns: {df.columns.tolist()}")
    logger.debug(f"DataFrame dtypes:\n{df.dtypes}")
    logger.debug(f"DataFrame values:\n{df.to_string()}")
    
    return df

def validate_preprocessor_state(preprocessor, name):
    """Validate preprocessor state and log details"""
    logger.info(f"Validating {name} preprocessor state:")
    logger.info(f"  Is fitted: {preprocessor.is_fitted}")
    logger.info(f"  Label encoders: {list(preprocessor.label_encoders.keys()) if preprocessor.label_encoders else 'None'}")
    logger.info(f"  Scaler: {type(preprocessor.scaler).__name__ if preprocessor.scaler else 'None'}")
    logger.info(f"  Feature columns: {preprocessor.feature_columns}")
    
    if not preprocessor.is_fitted:
        logger.error(f"{name} preprocessor is not fitted!")
        return False
    return True

# fertility prediction node
def predict_fertility_node(state: WorkflowState) -> WorkflowState:
    """Predict soil fertility status"""
    logger.info("Starting fertility prediction...")
    
    try:
        # Validate preprocessor
        if not validate_preprocessor_state(fertility_preprocessor, "Fertility"):
            raise ValueError("Fertility preprocessor is not properly fitted")
        
        df = prepare_soil_dataframe(state["soil_data"])
        logger.debug(f"Original DataFrame for fertility prediction:\n{df.to_string()}")
        
        # Apply preprocessing
        logger.debug("Applying fertility preprocessing...")
        df_processed = fertility_preprocessor.transform(df)
        
        # Check feature alignment
        expected_features = FERTILITY_FEATURE_COLUMNS
        available_features = [col for col in expected_features if col in df_processed.columns]
        missing_features = [col for col in expected_features if col not in df_processed.columns]
        
        logger.info(f"Expected features: {expected_features}")
        logger.info(f"Available features: {available_features}")
        if missing_features:
            logger.warning(f"Missing features: {missing_features}")
        
        # Use available features for prediction
        if not available_features:
            raise ValueError("No expected features found in processed data")
        
        df_for_prediction = df_processed[available_features].copy()
        logger.debug(f"Final prediction DataFrame shape: {df_for_prediction.shape}")
        logger.debug(f"Final prediction DataFrame:\n{df_for_prediction.to_string()}")
        
        # Make prediction
        logger.debug("Making fertility prediction...")
        prediction = fertility_model.predict(df_for_prediction)
        probabilities = fertility_model.predict_proba(df_for_prediction)
        
        logger.debug(f"Raw fertility prediction: {prediction}")
        logger.debug(f"Fertility prediction probabilities: {probabilities}")
        
        fertility_status = FERTILITY_STATUS_MAP.get(prediction[0], "UNKNOWN")
        fertility_confidence = float(np.max(probabilities))
        
        state["fertility_prediction"] = fertility_status
        state["fertility_confidence"] = fertility_confidence
        
        logger.info(f"Fertility prediction completed: {fertility_status} (confidence: {fertility_confidence:.2f})")
        return state
        
    except Exception as e:
        logger.error(f"Error in fertility prediction: {e}")
        logger.error(f"Exception details:", exc_info=True)
        state["fertility_prediction"] = "UNKNOWN"
        state["fertility_confidence"] = 0.0
        return state

# fertilizer prediction node
def predict_fertilizer_node(state: WorkflowState) -> WorkflowState:
    """Predict fertilizer recommendation"""
    logger.info("Starting fertilizer prediction...")
    
    try:
        # Validate preprocessor
        if not validate_preprocessor_state(fertilizer_preprocessor, "Fertilizer"):
            raise ValueError("Fertilizer preprocessor is not properly fitted")
        
        if not state["fertility_prediction"] or state["fertility_prediction"] == "UNKNOWN":
            raise ValueError("Valid fertility prediction is required for fertilizer recommendation")
        
        df = prepare_soil_dataframe(state["soil_data"])
        
        # Add fertility status to the dataframe
        df['soilfertilitystatus'] = state["fertility_prediction"]
        logger.debug(f"DataFrame with fertility status added:\n{df.to_string()}")
        
        # Apply preprocessing
        logger.debug("Applying fertilizer preprocessing...")
        df_processed = fertilizer_preprocessor.transform(df)
        
        logger.debug(f"Processed DataFrame for fertilizer prediction:\n{df_processed.to_string()}")
        
        # Check feature alignment
        expected_features = FERTILIZER_FEATURE_COLUMNS
        available_features = [col for col in expected_features if col in df_processed.columns]
        missing_features = [col for col in expected_features if col not in df_processed.columns]
        
        logger.info(f"Expected fertilizer features: {expected_features}")
        logger.info(f"Available fertilizer features: {available_features}")
        if missing_features:
            logger.warning(f"Missing fertilizer features: {missing_features}")
        
        # Use available features for prediction
        if not available_features:
            raise ValueError("No expected features found in processed fertilizer data")
        
        df_for_prediction = df_processed[available_features].copy()
        logger.debug(f"Final fertilizer prediction DataFrame:\n{df_for_prediction.to_string()}")
        
        # Make prediction
        logger.debug("Making fertilizer prediction...")
        prediction = fertilizer_model.predict(df_for_prediction)
        probabilities = fertilizer_model.predict_proba(df_for_prediction)
        
        logger.debug(f"Raw fertilizer prediction: {prediction}")
        logger.debug(f"Fertilizer prediction probabilities: {probabilities}")
        
        fertilizer_type = FERTILIZER_TYPE_MAP.get(prediction[0], "UNKNOWN")
        fertilizer_confidence = float(np.max(probabilities))
        
        state["fertilizer_prediction"] = fertilizer_type
        state["fertilizer_confidence"] = fertilizer_confidence
        
        logger.info(f"Fertilizer prediction completed: {fertilizer_type} (confidence: {fertilizer_confidence:.2f})")
        return state
        
    except Exception as e:
        logger.error(f"Error in fertilizer prediction: {e}")
        logger.error(f"Exception details:", exc_info=True)
        state["fertilizer_prediction"] = "UNKNOWN"
        state["fertilizer_confidence"] = 0.0
        return state

# nearest agrovets node
def find_nearest_agrovets_node(state: WorkflowState) -> WorkflowState:
    """Find nearest agrovets based on location data"""
    logger.info("Starting nearest agrovets search...")
    
    try:
        if agrovet_locator is None:
            raise ValueError("AgrovetLocator is not initialized")
            
        # Get location from soil data
        soil_data = state["soil_data"]
        if "latitude" not in soil_data or "longitude" not in soil_data:
            logger.warning("Location data not provided in soil data")
            state["nearest_agrovets"] = []
            return state
            
        user_lat = float(soil_data["latitude"])
        user_lon = float(soil_data["longitude"])
        
        # Find nearest agrovets
        nearest_agrovets = agrovet_locator.find_nearest_agrovets(
            user_lat=user_lat,
            user_lon=user_lon,
            top_k=5,  # Return top 5 nearest agrovets
            max_distance_km=500  # Search within 50km radius
        )
        
        # Add results to state
        state["nearest_agrovets"] = nearest_agrovets
        logger.info(f"Found {len(nearest_agrovets)} nearby agrovets")
        return state
        
    except Exception as e:
        logger.error(f"Error finding nearest agrovets: {e}")
        logger.error("Exception details:", exc_info=True)
        state["nearest_agrovets"] = []
        return state


def generate_fallback_response(state: WorkflowState) -> WorkflowState:
    """Generate fallback explanation when LLM is not available"""
    logger.info("Generating fallback response...")
    
    fertility_status = state.get('fertility_prediction', 'unknown')
    fertilizer_type = state.get('fertilizer_prediction', 'unknown')
    soil_data = state['soil_data']
    
    state["explanation"] = (
        f"Your soil shows {fertility_status.lower()} fertility status "
        f"with {state.get('fertility_confidence', 0):.1%} confidence. "
        f"The recommended fertilizer {fertilizer_type} will help improve nutrient availability "
        f"based on current levels (N: {soil_data['n']}, P: {soil_data['p']}, K: {soil_data['k']}) "
        f"and pH: {soil_data['ph']}."
    )
    
    state["recommendations"] = [
        f"Apply {fertilizer_type} according to package instructions",
        "Monitor soil pH and adjust if needed (optimal range: 6.0-7.0)",
        "Maintain proper soil moisture levels for optimal nutrient uptake",
        f"Consider adding organic matter to improve {soil_data['simplified_texture'].lower()} soil structure",
        "Test soil nutrients again after 3-4 months to track improvement"
    ]
    
    logger.debug(f"Fallback explanation generated: {state['explanation']}")
    return state

def generate_explanation_node(state: WorkflowState) -> WorkflowState:
    """Generate AI explanation and recommendations"""
    logger.info("Starting explanation generation...")
    
    try:
        if llm is None:
            logger.warning("LLM not available, using fallback response")
            return generate_fallback_response(state)
        
        # Create prompts
        system_prompt = """You are an agricultural expert AI assistant. Explain soil analysis results and fertilizer recommendations in simple, farmer-friendly language. Provide practical advice and actionable recommendations."""
        
        soil_data = state['soil_data']
        human_prompt = f"""
        Based on the following soil analysis and predictions, provide a clear explanation and practical recommendations:
        
        Soil Data:
        - Soil Texture: {soil_data['simplified_texture']}
        - pH: {soil_data['ph']}
        - Nitrogen (N): {soil_data['n']}, Phosphorus (P): {soil_data['p']}, Potassium (K): {soil_data['k']}
        - Organic Content (O): {soil_data['o']}
        - Calcium (Ca): {soil_data['ca']}, Magnesium (Mg): {soil_data['mg']}
        - Copper (Cu): {soil_data['cu']}, Iron (Fe): {soil_data['fe']}, Zinc (Zn): {soil_data['zn']}
        
        Predictions:
        - Soil Fertility Status: {state['fertility_prediction']} (Confidence: {state['fertility_confidence']:.1%})
        - Recommended Fertilizer: {state['fertilizer_prediction']} (Confidence: {state['fertilizer_confidence']:.1%})
        
        Please provide:
        1. A simple explanation of what these results mean for the farmer
        2. Why this fertilizer was recommended based on the soil's nutrient profile
        3. 3-5 specific actionable recommendations for improving soil health and crop yield
        
        Keep the language simple and practical for farmers.
        """
        
        logger.debug(f"Sending prompt to LLM")
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        response = llm.invoke(messages)
        full_response = response.content
        
        # Parse response to extract explanation and recommendations
        lines = [line.strip() for line in full_response.split('\n') if line.strip()]
        explanation_lines = []
        recommendations = []
        
        in_recommendations = False
        for line in lines:
            if any(keyword in line.lower() for keyword in ['recommendation', '1.', '2.', '3.', '4.', '5.']) or line.startswith(('-', '•')):
                in_recommendations = True
                if line.lower().startswith(('1.', '2.', '3.', '4.', '5.')):
                    recommendations.append(line)
                elif line.startswith(('-', '•')):
                    recommendations.append(line[1:].strip())
                elif 'recommendation' not in line.lower():
                    recommendations.append(line)
            elif not in_recommendations:
                explanation_lines.append(line)
        
        state["explanation"] = ' '.join(explanation_lines) if explanation_lines else full_response
        state["recommendations"] = recommendations if recommendations else [
            "Monitor soil moisture regularly",
            "Test soil pH monthly",
            "Apply organic matter to improve soil structure",
            "Follow recommended fertilizer application rates",
            "Consider crop rotation for soil health"
        ]
        
        logger.info("AI explanation generated successfully")
        return state
        
    except Exception as e:
        logger.error(f"Error generating explanation: {e}")
        logger.error(f"Exception details:", exc_info=True)
        return generate_fallback_response(state)

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
models_loaded = initialize_models()
if not models_loaded:
    logger.error("Failed to load models! Application may not work correctly.")
else:
    logger.info("Models loaded successfully")

agrovet_locator_loaded = initialize_agrovet_locator()
if not agrovet_locator_loaded:
    logger.error("Failed to initialize AgrovetLocator!")

initialize_llm()
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
            "fertility_model": fertility_model is not None,
            "fertility_preprocessor": fertility_preprocessor is not None,
            "fertilizer_model": fertilizer_model is not None,
            "fertilizer_preprocessor": fertilizer_preprocessor is not None
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
        "status": "healthy" if all([fertility_model, fertility_preprocessor, fertilizer_model, fertilizer_preprocessor]) else "degraded",
        "timestamp": datetime.now().isoformat(),
        "models_available": {
            "fertility_model": fertility_model is not None,
            "fertility_preprocessor": fertility_preprocessor is not None and fertility_preprocessor.is_fitted,
            "fertilizer_model": fertilizer_model is not None,
            "fertilizer_preprocessor": fertilizer_preprocessor is not None and fertilizer_preprocessor.is_fitted
        },
        "llm_available": llm is not None
    }
    
    logger.debug(f"Health status: {health_status}")
    return health_status


@app.post("/predict", response_model=PredictionResponse)
async def predict_soil_fertility(soil_data: SoilData):
    """Predict soil fertility status and fertilizer recommendations based on soil data"""
    logger.info("Prediction endpoint accessed")
    logger.debug(f"Received soil data: {soil_data.model_dump()}")
    
    # Check if models are loaded
    if not all([fertility_model, fertility_preprocessor, fertilizer_model, fertilizer_preprocessor]):
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
            "recommendations": []
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
    logger.info("Starting uvicorn server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")