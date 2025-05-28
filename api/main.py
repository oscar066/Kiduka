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

# Load environment variables
load_dotenv()

# Configure logging with more detailed formatting
logging.basicConfig(
    level=logging.DEBUG,  # Changed to DEBUG for more detailed logging
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

logger.info("Initializing model loader...")
loader = ModelLoader()

# Load fertility and fertilizer models
logger.info("Loading fertility model...")
fertility_model = loader.load_model('Soil_Status_randomForest_Classifier_Model.joblib')

logger.info("Loading fertilizer model...")
fertilizer_model = loader.load_model('Fertilizers_xgb_Classifier_Model.joblib')

# Define mappings for predictions
# 1. Fertility status mapping
FERTILITY_STATUS_MAP = {0: "MODERATELY HEALTHY", 1: "POOR", 2: "VERY POOR"}
# 2. Fertilizer type mapping
FERTILIZER_TYPE_MAP = {0: "NPK", 1: "TSP"}

COLUMN_MAPPING = {
    'simplified_texture': 'simpliedtexture(1)',
    'ph': 'ph', 'n': 'n', 'p': 'p', 'k': 'k', 'o': 'o',
    'ca': 'ca', 'mg': 'mg', 'cu': 'cu', 'fe': 'fe', 'zn': 'zn'
}

FEATURE_COLUMNS = ['simpliedtexture(1)', 'ph', 'n', 'p', 'k', 'o', 'ca', 'mg', 'cu', 'fe', 'zn']

logger.info(f"Fertility status mapping: {FERTILITY_STATUS_MAP}")
logger.info(f"Fertilizer type mapping: {FERTILIZER_TYPE_MAP}")
logger.info(f"Feature columns: {FEATURE_COLUMNS}")

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

def prepare_soil_dataframe(soil_data: Dict[str, Any]) -> pd.DataFrame:
    """Convert soil data dictionary to DataFrame with proper column names"""
    logger.debug(f"Incoming soil_data: {soil_data}")
    
    mapped_data = {COLUMN_MAPPING.get(k, k): v for k, v in soil_data.items()}
    logger.debug(f"Mapped data: {mapped_data}")
    
    df = pd.DataFrame([mapped_data])
    logger.debug(f"Created DataFrame with shape: {df.shape}")
    logger.debug(f"DataFrame columns: {df.columns.tolist()}")
    logger.debug(f"DataFrame values:\n{df.to_string()}")
    
    return df

def load_model_and_predict(model, df: pd.DataFrame, status_map: Dict[int, str]) -> tuple:
    """Generic function to load model and make predictions"""
    logger.debug(f"Input DataFrame for prediction:\n{df.to_string()}")
    logger.debug(f"DataFrame dtypes:\n{df.dtypes}")
    
    prediction = model.predict(df)
    probabilities = model.predict_proba(df)
    
    logger.debug(f"Raw prediction: {prediction}")
    logger.debug(f"Prediction probabilities: {probabilities}")
    
    status = status_map.get(prediction[0], "UNKNOWN")
    confidence = float(np.max(probabilities))
    
    logger.debug(f"Mapped status: {status}")
    logger.debug(f"Confidence: {confidence}")
    
    return status, confidence

def predict_fertility_node(state: WorkflowState) -> WorkflowState:
    """Predict soil fertility status"""
    logger.info("Starting fertility prediction...")
    
    try:
        df = prepare_soil_dataframe(state["soil_data"])
        logger.debug(f"Original DataFrame for fertility prediction:\n{df.to_string()}")
        
        # Apply preprocessing
        logger.debug("Applying preprocessing...")
        preprocessor = SoilDataPreprocessor()
        df_processed = preprocessor.fit_transform(df)
        
        logger.debug(f"Processed DataFrame shape: {df_processed.shape}")
        logger.debug(f"Processed DataFrame columns: {df_processed.columns.tolist()}")
        logger.debug(f"Processed DataFrame:\n{df_processed.to_string()}")
        
        # Check if all required columns are present
        missing_columns = [col for col in FEATURE_COLUMNS if col not in df_processed.columns]
        if missing_columns:
            logger.error(f"Missing required columns for fertility prediction: {missing_columns}")
            raise ValueError(f"Missing required columns: {missing_columns}")
            
        # Select feature columns for prediction
        df_for_prediction = df_processed[FEATURE_COLUMNS].copy()
        logger.debug(f"Final prediction DataFrame shape: {df_for_prediction.shape}")
        logger.debug(f"Final prediction DataFrame:\n{df_for_prediction.to_string()}")
        
        # Make prediction
        fertility_status, fertility_confidence = load_model_and_predict(
            fertility_model, df_for_prediction, FERTILITY_STATUS_MAP
        )
        
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

def predict_fertilizer_node(state: WorkflowState) -> WorkflowState:
    """Predict fertilizer recommendation"""
    logger.info("Starting fertilizer prediction...")
    
    try:
        df = prepare_soil_dataframe(state["soil_data"])
        
        if not state["fertility_prediction"]:
            raise ValueError("Fertility prediction is required for fertilizer recommendation")
            
        # Add fertility status to the dataframe
        df['soilfertilitystatus'] = state["fertility_prediction"]
        logger.debug(f"DataFrame with fertility status added:\n{df.to_string()}")
        
        # Apply preprocessing
        logger.debug("Applying preprocessing for fertilizer prediction...")
        preprocessor = SoilDataPreprocessor()
        df_processed = preprocessor.fit_transform(df)
        
        logger.debug(f"Processed DataFrame for fertilizer prediction:\n{df_processed.to_string()}")
        
        # Include fertility status in features
        feature_columns_with_status = FEATURE_COLUMNS + ['soilfertilitystatus']
        logger.debug(f"Required feature columns with status: {feature_columns_with_status}")
        
        # Check if all required columns are present
        missing_columns = [col for col in feature_columns_with_status if col not in df_processed.columns]
        if missing_columns:
            logger.error(f"Missing required columns for fertilizer prediction: {missing_columns}")
            raise ValueError(f"Missing required columns: {missing_columns}")
            
        df_for_prediction = df_processed[feature_columns_with_status].copy()
        logger.debug(f"Final fertilizer prediction DataFrame:\n{df_for_prediction.to_string()}")
        
        # Make prediction
        fertilizer_type, fertilizer_confidence = load_model_and_predict(
            fertilizer_model, df_for_prediction, FERTILIZER_TYPE_MAP
        )
        
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
        
        logger.debug(f"Sending prompt to LLM: {human_prompt}")
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        response = llm.invoke(messages)
        full_response = response.content
        #logger.debug(f"LLM response received: {full_response}")
        
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
        #logger.debug(f"Generated explanation: {state['explanation']}")
        #logger.debug(f"Generated recommendations: {state['recommendations']}")
        
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
    workflow.add_node("generate_explanation", generate_explanation_node)
    
    # Define edges
    workflow.add_edge(START, "predict_fertility")
    workflow.add_edge("predict_fertility", "predict_fertilizer")
    workflow.add_edge("predict_fertilizer", "generate_explanation")
    workflow.add_edge("generate_explanation", END)
    
    logger.info("Workflow created successfully")
    return workflow.compile()

# Initialize on startup
logger.info("Initializing application...")
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
        "endpoints": {
            "predict": "/predict - POST soil data for predictions",
            "health": "/health - Health check",
            "docs": "/docs - API documentation",
            "test-predict": "/test-predict - Test endpoint with sample data",
            "debug-input": "/debug-input - Debug endpoint to see input data"
        }
    }

@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed")
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_available": {
            "fertility_model": fertility_model is not None,
            "fertilizer_model": fertilizer_model is not None
        },
        "llm_available": llm is not None
    }
    
    logger.debug(f"Health status: {health_status}")
    return health_status

@app.post("/debug-input")
async def debug_input(soil_data: SoilData):
    """Debug endpoint to see what data is being received"""
    logger.info("Debug input endpoint accessed")
    
    debug_info = {
        "received_data": soil_data.model_dump(),
        "data_types": {k: type(v).__name__ for k, v in soil_data.model_dump().items()},
        "column_mapping": COLUMN_MAPPING,
        "feature_columns": FEATURE_COLUMNS
    }
    
    logger.debug(f"Debug info: {debug_info}")
    return debug_info

@app.post("/predict", response_model=PredictionResponse)
async def predict_soil_fertility(soil_data: SoilData):
    """Predict soil fertility status and fertilizer recommendations based on soil data"""
    logger.info("Prediction endpoint accessed")
    logger.debug(f"Received soil data: {soil_data.model_dump()}")
    
    try:
        # Initialize workflow state
        initial_state: WorkflowState = {
            "soil_data": soil_data.model_dump(),
            "fertility_prediction": None,
            "fertility_confidence": None,
            "fertilizer_prediction": None,
            "fertilizer_confidence": None,
            "explanation": None,
            "recommendations": []
        }
        
        logger.debug(f"Initial workflow state: {initial_state}")
        
        # Run the workflow
        logger.info("Running prediction workflow...")
        result = prediction_workflow.invoke(initial_state)
        logger.debug(f"Workflow result: {result}")
        
        # Create response with proper None checks
        response = PredictionResponse(
            soil_fertility_status=result.get("fertility_prediction", "UNKNOWN"),
            soil_fertility_confidence=result.get("fertility_confidence", 0.0),
            fertilizer_recommendation=result.get("fertilizer_prediction", "UNKNOWN"), 
            fertilizer_confidence=result.get("fertilizer_confidence", 0.0),
            explanation=result.get("explanation", "Unable to generate explanation"),
            recommendations=result.get("recommendations", ["Consult with agricultural expert"]),
            timestamp=datetime.now().isoformat()
        )
        
        logger.info("Prediction completed successfully")
        # logger.debug(f"Final response: {response.model_dump()}")
        return response
        
    except Exception as e:
        logger.error(f"Error in prediction pipeline: {e}")
        logger.error(f"Exception details:", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-predict")
async def test_predict():
    """Test endpoint with sample data that matches your working test scale"""
    logger.info("Test prediction endpoint accessed")
    
    # Using values similar to your working test data
    sample_data = SoilData(
        simplified_texture="LOAMY SOIL",  # Matches your test data format
        ph=6.2, 
        n=0.17,   # Using the same scale as your working test
        p=23.7, 
        k=0.27,   # Using the same scale as your working test
        o=1.1,    # Using the same scale as your working test
        ca=1.8,   # Using the same scale as your working test
        mg=2.1,   # Using the same scale as your working test
        cu=1.2, 
        fe=12.9, 
        zn=7.4
    )
    
    logger.debug(f"Test sample data: {sample_data.model_dump()}")
    return await predict_soil_fertility(sample_data)

@app.post("/test-predict-poor")
async def test_predict_poor():
    """Test endpoint with sample data expected to give POOR fertility"""
    logger.info("Test prediction (poor) endpoint accessed")
    
    # Using values from your test that gave prediction = 1 (POOR)
    sample_data = SoilData(
        simplified_texture="LOAMY SOIL",
        ph=5.7,
        n=0.18,
        p=27.2,
        k=0.72,
        o=0.9,
        ca=1.7,
        mg=1.5,
        cu=1.2,
        fe=12.7,
        zn=4.8
    )
    
    logger.debug(f"Test sample data (poor): {sample_data.model_dump()}")
    return await predict_soil_fertility(sample_data)

@app.post("/test-predict-very-poor")
async def test_predict_very_poor():
    """Test endpoint with sample data expected to give VERY POOR fertility"""
    logger.info("Test prediction (very poor) endpoint accessed")
    
    # Using values from your test that gave prediction = 2 (VERY POOR)
    sample_data = SoilData(
        simplified_texture="LOAMY SOIL",
        ph=4.8,
        n=0.12,
        p=19.8,
        k=1.07,
        o=1.4,
        ca=4.7,
        mg=1.9,
        cu=1.4,
        fe=11.9,
        zn=3.9
    )
    
    logger.debug(f"Test sample data (very poor): {sample_data.model_dump()}")
    return await predict_soil_fertility(sample_data)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting uvicorn server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")