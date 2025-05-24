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
    crop_type: str = Field(..., description="Intended crop type")

class PredictionResponse(BaseModel):
    soil_fertility_status: str
    soil_fertility_confidence: float
    fertilizer_recommendation: str
    fertilizer_confidence: float
    explanation: str
    recommendations: List[str]
    timestamp: str

# Mock trained models (replace with your actual trained models)
class MockRandomForestModel:
    def __init__(self, model_type="fertility"):
        self.model_type = model_type
        self.classes_ = {
            "fertility": ["Low", "Moderate", "High"],
            "fertilizer": ["NPK 10-10-10", "NPK 20-10-10", "NPK 15-15-15", "Organic Compost", "Urea", "Phosphate"]
        }
        # Texture encoding mapping
        self.texture_mapping = {
            "Sandy": 0, "Loamy": 1, "Clay": 2, "Silt": 3, 
            "Sandy Loam": 4, "Clay Loam": 5, "Silty Clay": 6, "Other": 7
        }
    
    def predict(self, X):
        # Mock prediction logic - replace with actual model.predict(X)
        if self.model_type == "fertility":
            # Simple logic based on NPK values and pH
            npk_sum = X[0][2] + X[0][3] + X[0][4]  # N + P + K
            ph = X[0][1]
            organic = X[0][5]  # O content
            
            # Calculate fertility score
            fertility_score = (npk_sum * 0.4) + (organic * 0.3) + (abs(7 - ph) * -5)
            
            if fertility_score < 30:
                return ["Low"]
            elif fertility_score < 70:
                return ["Moderate"]
            else:
                return ["High"]
        else:  # fertilizer
            # Mock fertilizer recommendation based on soil data and fertility
            ph = X[0][1]
            n = X[0][2]
            p = X[0][3]
            k = X[0][4]
            
            # Simple recommendation logic
            if n < 20:
                return ["Urea"]  # High nitrogen
            elif p < 15:
                return ["Phosphate"]  # High phosphorus
            elif ph < 6.0:
                return ["NPK 20-10-10"]  # Acidic soil
            elif ph > 8.0:
                return ["Organic Compost"]  # Alkaline soil
            else:
                return ["NPK 15-15-15"]  # Balanced
    
    def predict_proba(self, X):
        # Mock confidence scores
        if self.model_type == "fertility":
            return [[0.1, 0.2, 0.7]]  # Example probabilities for [Low, Moderate, High]
        else:
            return [[0.8, 0.1, 0.05, 0.03, 0.01, 0.01]]  # Example probabilities for fertilizers

# Initialize models
try:
    # Try to load saved models if they exist
    models_path = os.path.join(os.path.dirname(__file__), 'models')
    fertility_model_path = os.path.join(models_path, 'Soil_Status_randomForest_Classifier_Model.joblib')
    fertilizer_model_path = os.path.join(models_path, 'Fertilizers_xgb_Classifier_Model.joblib')
    
    if os.path.exists(fertility_model_path) and os.path.exists(fertilizer_model_path):
        fertility_model = joblib.load(fertility_model_path)
        fertilizer_model = joblib.load(fertilizer_model_path)
        logger.info("Trained models loaded successfully")
    else:
        logger.warning("Model files not found, using mock models")
        fertility_model = MockRandomForestModel("fertility")
        fertilizer_model = MockRandomForestModel("fertilizer")
except Exception as e:
    logger.warning(f"Error loading trained models: {e}. Using mock models instead.")
    fertility_model = MockRandomForestModel("fertility")
    fertilizer_model = MockRandomForestModel("fertilizer")

# Initialize OpenAI LLM (with error handling)
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
        logger.warning("OpenAI API key not found or invalid, using mock explanations")
        llm = None
except Exception as e:
    logger.warning(f"Error initializing OpenAI LLM: {e}. Using mock explanations.")
    llm = None

# LangGraph workflow state
class WorkflowState(BaseModel):
    soil_data: Dict[str, Any] = {}
    fertility_prediction: str = ""
    fertility_confidence: float = 0.0
    fertilizer_prediction: str = ""
    fertilizer_confidence: float = 0.0
    explanation: str = ""
    recommendations: List[str] = []

# Define workflow nodes
def predict_fertility_node(state: WorkflowState) -> WorkflowState:
    """Predict soil fertility status"""
    try:
        # Encode texture (you might need to adjust this based on your actual texture values)
        texture_encoded = fertility_model.texture_mapping.get(
            state.soil_data["simplified_texture"], 7  # Default to "Other"
        )
        
        # Prepare input for the model - match your dataset column order
        soil_features = [
            texture_encoded,                    # Simplified Texture (encoded)
            state.soil_data["ph"],             # pH
            state.soil_data["n"],              # N
            state.soil_data["p"],              # P
            state.soil_data["k"],              # K
            state.soil_data["o"],              # O
            state.soil_data["ca"],             # Ca
            state.soil_data["mg"],             # Mg
            state.soil_data["cu"],             # Cu
            state.soil_data["fe"],             # Fe
            state.soil_data["zn"]              # Zn
        ]
        
        # Make prediction
        fertility_pred = fertility_model.predict([soil_features])
        fertility_proba = fertility_model.predict_proba([soil_features])
        
        state.fertility_prediction = fertility_pred[0]
        state.fertility_confidence = float(np.max(fertility_proba))
        
        logger.info(f"Fertility prediction: {state.fertility_prediction} (confidence: {state.fertility_confidence:.2f})")
        return state
        
    except Exception as e:
        logger.error(f"Error in fertility prediction: {e}")
        raise HTTPException(status_code=500, detail="Error in fertility prediction")

def predict_fertilizer_node(state: WorkflowState) -> WorkflowState:
    """Predict fertilizer recommendation"""
    try:
        # Encode texture and fertility status
        texture_encoded = fertility_model.texture_mapping.get(
            state.soil_data["simplified_texture"], 7
        )
        fertility_encoded = {"Low": 0, "Moderate": 1, "High": 2}.get(state.fertility_prediction, 1)
        
        # Prepare input including soil features and fertility status
        fertilizer_features = [
            texture_encoded,                    # Simplified Texture (encoded)
            state.soil_data["ph"],             # pH
            state.soil_data["n"],              # N
            state.soil_data["p"],              # P
            state.soil_data["k"],              # K
            state.soil_data["o"],              # O
            state.soil_data["ca"],             # Ca
            state.soil_data["mg"],             # Mg
            state.soil_data["cu"],             # Cu
            state.soil_data["fe"],             # Fe
            state.soil_data["zn"],             # Zn
            fertility_encoded                   # Predicted fertility status
        ]
        
        # Make prediction
        fertilizer_pred = fertilizer_model.predict([fertilizer_features])
        fertilizer_proba = fertilizer_model.predict_proba([fertilizer_features])
        
        state.fertilizer_prediction = fertilizer_pred[0]
        state.fertilizer_confidence = float(np.max(fertilizer_proba))
        
        logger.info(f"Fertilizer prediction: {state.fertilizer_prediction} (confidence: {state.fertilizer_confidence:.2f})")
        return state
        
    except Exception as e:
        logger.error(f"Error in fertilizer prediction: {e}")
        raise HTTPException(status_code=500, detail="Error in fertilizer prediction")

def generate_explanation_node(state: WorkflowState) -> WorkflowState:
    """Generate AI explanation and recommendations"""
    try:
        if llm is None:
            # Fallback explanation when LLM is not available
            state.explanation = f"Your soil shows {state.fertility_prediction.lower()} fertility status with {state.fertility_confidence:.1%} confidence. The recommended fertilizer {state.fertilizer_prediction} will help improve nutrient availability for your {state.soil_data['crop_type']} crop based on the current nutrient levels (N: {state.soil_data['n']}, P: {state.soil_data['p']}, K: {state.soil_data['k']}) and pH: {state.soil_data['ph']}."
            state.recommendations = [
                f"Apply {state.fertilizer_prediction} according to package instructions",
                "Monitor soil pH and adjust if needed (optimal range: 6.0-7.0)",
                "Maintain proper soil moisture levels for optimal nutrient uptake",
                f"Consider adding organic matter to improve {state.soil_data['simplified_texture'].lower()} soil structure",
                f"Test soil nutrients again after 3-4 months to track improvement"
            ]
            return state
        
        # Create prompt for the LLM
        system_prompt = """You are an agricultural expert AI assistant. Your job is to explain soil analysis results and fertilizer recommendations in simple, farmer-friendly language. Provide practical advice and actionable recommendations."""
        
        human_prompt = f"""
        Based on the following soil analysis and predictions, provide a clear explanation and practical recommendations:
        
        Soil Data:
        - Soil Texture: {state.soil_data['simplified_texture']}
        - pH: {state.soil_data['ph']}
        - Nitrogen (N): {state.soil_data['n']}
        - Phosphorus (P): {state.soil_data['p']}
        - Potassium (K): {state.soil_data['k']}
        - Organic Content (O): {state.soil_data['o']}
        - Calcium (Ca): {state.soil_data['ca']}
        - Magnesium (Mg): {state.soil_data['mg']}
        - Copper (Cu): {state.soil_data['cu']}
        - Iron (Fe): {state.soil_data['fe']}
        - Zinc (Zn): {state.soil_data['zn']}
        - Intended Crop: {state.soil_data['crop_type']}
        
        Predictions:
        - Soil Fertility Status: {state.fertility_prediction} (Confidence: {state.fertility_confidence:.1%})
        - Recommended Fertilizer: {state.fertilizer_prediction} (Confidence: {state.fertilizer_confidence:.1%})
        
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
        
        state.explanation = ' '.join(explanation_lines) if explanation_lines else full_response
        state.recommendations = recommendations if recommendations else [
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
        # Provide fallback explanation
        state.explanation = f"Your soil shows {state.fertility_prediction.lower()} fertility status. The recommended fertilizer {state.fertilizer_prediction} will help improve nutrient availability for your {state.soil_data['crop_type']} crop."
        state.recommendations = [
            "Apply the recommended fertilizer according to package instructions",
            "Monitor soil pH and adjust if needed",
            "Maintain proper soil moisture levels",
            "Consider adding organic matter to improve soil health"
        ]
        return state

# Create LangGraph workflow
def create_workflow():
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("predict_fertility", predict_fertility_node)
    workflow.add_node("predict_fertilizer", predict_fertilizer_node)
    workflow.add_node("generate_explanation", generate_explanation_node)
    
    # Define edges using the new LangGraph API
    workflow.add_edge(START, "predict_fertility")
    workflow.add_edge("predict_fertility", "predict_fertilizer")
    workflow.add_edge("predict_fertilizer", "generate_explanation")
    workflow.add_edge("generate_explanation", END)
    
    return workflow.compile()

# Initialize workflow
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
        "models_loaded": True,
        "llm_available": llm is not None
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict_soil_fertility(soil_data: SoilData):
    """
    Predict soil fertility status and fertilizer recommendations based on soil data
    """
    try:
        # Initialize workflow state
        initial_state = WorkflowState(soil_data=soil_data.model_dump())
        
        # Run the workflow
        result = prediction_workflow.invoke(initial_state)
        
        # Create response
        response = PredictionResponse(
            soil_fertility_status=result.fertility_prediction,
            soil_fertility_confidence=result.fertility_confidence,
            fertilizer_recommendation=result.fertilizer_prediction,
            fertilizer_confidence=result.fertilizer_confidence,
            explanation=result.explanation,
            recommendations=result.recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Prediction completed successfully for crop: {soil_data.crop_type}")
        return response
        
    except Exception as e:
        logger.error(f"Error in prediction pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add a test endpoint for easier debugging
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
        crop_type="Corn"
    )
    return await predict_soil_fertility(sample_data)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)