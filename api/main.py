from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import joblib
import numpy as np
import pandas as pd
from langgraph.graph import StateGraph, START, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
import os
from datetime import datetime
import logging
from dotenv import load_dotenv

# Import your preprocessing functions
from preprocessing import SoilDataPreprocessor

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Agricultural Prediction API",
    description="Soil fertility prediction and fertilizer recommendation system with AI explanations",
    version="1.0.0"
)

# Pydantic models for request/response
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

class PredictionResponse(BaseModel):
    soil_fertility_status: str
    soil_fertility_confidence: float
    fertilizer_recommendation: str
    fertilizer_confidence: float
    explanation: str
    recommendations: List[str]
    timestamp: str

# Global variables for models and preprocessors
fertility_model = None
fertilizer_model = None
fertility_preprocessor = None
fertilizer_preprocessor = None
llm = None

# Initialize models and preprocessors
def initialize_models():
    global fertility_model, fertilizer_model, fertility_preprocessor, fertilizer_preprocessor
    
    try:
        models_path = os.path.join(os.path.dirname(__file__), 'models')
        
        # Load fertility model
        fertility_model_path = os.path.join(models_path, 'Soil_Status_randomForest_Classifier_Model.joblib')
        if os.path.exists(fertility_model_path):
            fertility_model = joblib.load(fertility_model_path)
            logger.info("Fertility model loaded successfully")
        
        # Load fertilizer model
        fertilizer_model_path = os.path.join(models_path, 'Fertilizers_xgb_Classifier_Model.joblib')
        if os.path.exists(fertilizer_model_path):
            fertilizer_model = joblib.load(fertilizer_model_path)
            logger.info("Fertilizer model loaded successfully")
        
        # Load preprocessors
        fertility_preprocessor_path = os.path.join(models_path, 'fertility_preprocessor.joblib')
        fertilizer_preprocessor_path = os.path.join(models_path, 'fertilizer_preprocessor.joblib')
        
        if os.path.exists(fertility_preprocessor_path):
            fertility_preprocessor = SoilDataPreprocessor()
            fertility_preprocessor.load(fertility_preprocessor_path)
            logger.info("Fertility preprocessor loaded successfully")
        
        if os.path.exists(fertilizer_preprocessor_path):
            fertilizer_preprocessor = SoilDataPreprocessor()
            fertilizer_preprocessor.load(fertilizer_preprocessor_path)
            logger.info("Fertilizer preprocessor loaded successfully")
            
    except Exception as e:
        logger.warning(f"Error loading models/preprocessors: {e}")

# Initialize OpenAI LLM
def initialize_llm():
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
        logger.warning(f"Error initializing OpenAI LLM: {e}")

# LangGraph workflow state - use TypedDict instead of BaseModel
from typing_extensions import TypedDict

class WorkflowState(TypedDict):
    soil_data: Dict[str, Any]
    fertility_prediction: Optional[str]
    fertility_confidence: Optional[float]
    fertilizer_prediction: Optional[str]
    fertilizer_confidence: Optional[float]
    explanation: Optional[str]
    recommendations: List[str]

def prepare_soil_dataframe(soil_data: Dict[str, Any]) -> pd.DataFrame:
    """Convert soil data dictionary to DataFrame with proper column names"""
    # Map API field names to expected DataFrame column names (matching your actual dataset)
    column_mapping = {
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
    
    # Create DataFrame with proper column names
    mapped_data = {column_mapping.get(k, k): v for k, v in soil_data.items()}
    df = pd.DataFrame([mapped_data])
    
    return df

# Define workflow nodes
def predict_fertility_node(state: WorkflowState) -> WorkflowState:
    """Predict soil fertility status"""
    try:
        # Load the preprocessor model
        fertility_model = joblib.load("/Users/oscar/Desktop/data-project/Fertiliser_Modelling/models/Soil_Status_randomForest_Classifier_Model.joblib")        
        # Prepare input data
        df = prepare_soil_dataframe(state["soil_data"])

        fertility_preprocessor = SoilDataPreprocessor()
        
        # Apply preprocessing if preprocessor is available
        if fertility_preprocessor is not None:
            df_processed = fertility_preprocessor.fit_transform(df)
        else:
            # Basic preprocessing fallback
            logger.warning("Fertility preprocessor not available, using basic preprocessing")
            df_processed = df
        
        # Extract features (exclude non-feature columns) and convert to DataFrame with proper column names
        feature_columns = ['simpliedtexture(1)', 'ph', 'n', 'p', 'k', 'o', 'ca', 'mg', 'cu', 'fe', 'zn']
        df_for_prediction = pd.DataFrame(df_processed[feature_columns], columns=feature_columns)
        
        # Make prediction
        fertility_pred = fertility_model.predict(df_for_prediction)
        fertility_proba = fertility_model.predict_proba(df_for_prediction)
        
        # Map numeric predictions to status classes
        fertility_status_map = {
            0: "MODERATELY HEALTHY",
            1: "POOR",
            2: "VERY POOR"
        }
        
        # Convert numeric prediction to status class
        fertility_status = fertility_status_map.get(fertility_pred[0], "UNKNOWN")
        
        state["fertility_prediction"] = fertility_status
        state["fertility_confidence"] = float(np.max(fertility_proba))
        
        logger.info(f"Fertility prediction: {state['fertility_prediction']} (confidence: {state['fertility_confidence']:.2f})")
        return state
        
    except Exception as e:
        logger.error(f"Error in fertility prediction: {e}")
        return state

def predict_fertilizer_node(state: WorkflowState) -> WorkflowState:
    """Predict fertilizer recommendation"""
    try:
        # Load the preprocessor and model
        fertilizer_preprocessor = SoilDataPreprocessor()
        fertilizer_model = joblib.load("/Users/oscar/Desktop/data-project/Fertiliser_Modelling/models/Fertilizers_xgb_Classifier_Model.joblib")
        
        # Prepare input data including fertility prediction
        df = prepare_soil_dataframe(state["soil_data"])
        
        # Validate fertility prediction
        if state["fertility_prediction"] is None:
            raise ValueError("Fertility prediction is required for fertilizer recommendation")
            
        df['soilfertilitystatus'] = state["fertility_prediction"]
        
        # Apply preprocessing if preprocessor is available
        if fertilizer_preprocessor is not None:
            df_processed = fertilizer_preprocessor.fit_transform(df)
        else:
            # Basic preprocessing fallback
            logger.warning("Fertilizer preprocessor not available, using basic preprocessing")
            df_processed = df
        
        # Extract features and convert to DataFrame with proper column names
        feature_columns = ['simpliedtexture(1)', 'ph', 'n', 'p', 'k', 'o', 'ca', 'mg', 'cu', 'fe', 'zn', 'soilfertilitystatus']
        df_for_prediction = pd.DataFrame(df_processed[feature_columns], columns=feature_columns)
        
        # Make prediction
        fertilizer_pred = fertilizer_model.predict(df_for_prediction)
        fertilizer_proba = fertilizer_model.predict_proba(df_for_prediction)
        
        # Map numeric predictions to fertilizer types
        fertilizer_type_map = {
            0: "NPK",
            1: "TSP"
        }
        
        # Convert numeric prediction to fertilizer type
        fertilizer_type = fertilizer_type_map.get(fertilizer_pred[0], "UNKNOWN")
        
        state["fertilizer_prediction"] = fertilizer_type
        state["fertilizer_confidence"] = float(np.max(fertilizer_proba))
        
        logger.info(f"Fertilizer prediction: {state['fertilizer_prediction']} (confidence: {state['fertilizer_confidence']:.2f})")
        return state
        
    except Exception as e:
        logger.error(f"Error in fertilizer prediction: {e}")
        return state

def generate_explanation_node(state: WorkflowState) -> WorkflowState:
    """Generate AI explanation and recommendations"""
    try:
        if llm is None:
            # Fallback explanation when LLM is not available
            state["explanation"] = f"Your soil shows {state['fertility_prediction'].lower() if state['fertility_prediction'] else 'unknown'} fertility status with {state['fertility_confidence']:.1%} confidence. The recommended fertilizer {state['fertilizer_prediction']} will help improve nutrient availability based on the current nutrient levels (N: {state['soil_data']['n']}, P: {state['soil_data']['p']}, K: {state['soil_data']['k']}) and pH: {state['soil_data']['ph']}."
            state["recommendations"] = [
                f"Apply {state['fertilizer_prediction']} according to package instructions",
                "Monitor soil pH and adjust if needed (optimal range: 6.0-7.0)",
                "Maintain proper soil moisture levels for optimal nutrient uptake",
                f"Consider adding organic matter to improve {state['soil_data']['simplified_texture'].lower()} soil structure",
                "Test soil nutrients again after 3-4 months to track improvement"
            ]
            return state
        
        # Create prompt for the LLM
        system_prompt = """You are an agricultural expert AI assistant. Your job is to explain soil analysis results and fertilizer recommendations in simple, farmer-friendly language. Provide practical advice and actionable recommendations."""
        
        human_prompt = f"""
        Based on the following soil analysis and predictions, provide a clear explanation and practical recommendations:
        
        Soil Data:
        - Soil Texture: {state['soil_data']['simplified_texture']}
        - pH: {state['soil_data']['ph']}
        - Nitrogen (N): {state['soil_data']['n']}
        - Phosphorus (P): {state['soil_data']['p']}
        - Potassium (K): {state['soil_data']['k']}
        - Organic Content (O): {state['soil_data']['o']}
        - Calcium (Ca): {state['soil_data']['ca']}
        - Magnesium (Mg): {state['soil_data']['mg']}
        - Copper (Cu): {state['soil_data']['cu']}
        - Iron (Fe): {state['soil_data']['fe']}
        - Zinc (Zn): {state['soil_data']['zn']}
        
        Predictions:
        - Soil Fertility Status: {state['fertility_prediction']} (Confidence: {state['fertility_confidence']:.1%})
        - Recommended Fertilizer: {state['fertilizer_prediction']} (Confidence: {state['fertilizer_confidence']:.1%})
        
        Please provide:
        1. A simple explanation of what these results mean for the farmer
        2. Why this fertilizer was recommended based on the soil's nutrient profile
        3. 3-5 specific actionable recommendations for improving soil health and crop yield
        
        Keep the language simple and practical for farmers.
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt)
        ]
        
        response = llm.invoke(messages)
        full_response = response.content
        
        # Parse the response to extract explanation and recommendations
        lines = full_response.split('\n')
        explanation_lines = []
        recommendations = []
        
        in_recommendations = False
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            if 'recommendation' in line.lower() or line.lower().startswith(('1.', '2.', '3.', '4.', '5.', '-', '•')):
                in_recommendations = True
                if line.lower().startswith(('1.', '2.', '3.', '4.', '5.')):
                    recommendations.append(line)
                elif line.startswith(('-', '•')):
                    recommendations.append(line[1:].strip())
                elif not 'recommendation' in line.lower():
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
        # Provide fallback explanation with None checks
        fertility_status = state.get('fertility_prediction', 'unknown')
        fertilizer_type = state.get('fertilizer_prediction', 'unknown')
        state["explanation"] = f"Your soil shows {fertility_status.lower() if fertility_status else 'unknown'} fertility status. The recommended fertilizer {fertilizer_type} will help improve nutrient availability."
        state["recommendations"] = [
            "Monitor soil moisture regularly",
            "Test soil pH monthly", 
            "Apply organic matter to improve soil structure",
            "Follow recommended fertilizer application rates",
            "Consider crop rotation for soil health"
        ]
        return state

# Create LangGraph workflow
def create_workflow():
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
    
    return workflow.compile()

# Initialize everything on startup
initialize_models()
initialize_llm()
prediction_workflow = create_workflow()

@app.get("/")
async def root():
    return {
        "message": "Agricultural Prediction API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "predict": "/predict - POST soil data for predictions",
            "health": "/health - Health check",
            "docs": "/docs - API documentation"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models_loaded": {
            "fertility_model": fertility_model is not None,
            "fertilizer_model": fertilizer_model is not None,
            "fertility_preprocessor": fertility_preprocessor is not None,
            "fertilizer_preprocessor": fertilizer_preprocessor is not None
        },
        "llm_available": llm is not None
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_soil_fertility(soil_data: SoilData):
    """
    Predict soil fertility status and fertilizer recommendations based on soil data
    """
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
        
        # Run the workflow
        result = prediction_workflow.invoke(initial_state)
        
        # Access the result as a dictionary with proper None checks
        response = PredictionResponse(
            soil_fertility_status=result.get("fertility_prediction", "UNKNOWN"),
            soil_fertility_confidence=result.get("fertility_confidence", 0.0),
            fertilizer_recommendation=result.get("fertilizer_prediction", "UNKNOWN"),
            fertilizer_confidence=result.get("fertilizer_confidence", 0.0),
            explanation=result.get("explanation", "Unable to generate explanation"),
            recommendations=result.get("recommendations", ["Consult with agricultural expert"]),
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Prediction completed successfully")
        return response
        
    except Exception as e:
        logger.error(f"Error in prediction pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/test-predict")
async def test_predict():
    """Test endpoint with sample data"""
    sample_data = SoilData(
        simplified_texture="Loamy",
        ph=6.5,
        n=25.0,
        p=18.0,
        k=30.0,
        o=3.5,
        ca=120.0,
        mg=45.0,
        cu=2.5,
        fe=85.0,
        zn=5.2,
    )
    return await predict_soil_fertility(sample_data)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)