"""Fertilizer prediction node for the workflow"""
import os
import sys
import logging
import numpy as np
from typing import Dict, Any

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.schema.schema import WorkflowState
from api.utils.config import AppConfig
from api.utils.data_processing import prepare_soil_dataframe, validate_preprocessor_state, check_feature_alignment

logger = logging.getLogger(__name__)

def predict_fertilizer_node(state: WorkflowState) -> WorkflowState:
    """Predict fertilizer recommendation"""
    logger.info("Starting fertilizer prediction...")
    
    try:
        # Get components from state
        app_components = state.get("app_components", {})
        fertilizer_preprocessor = app_components.get('fertilizer_preprocessor')
        fertilizer_model = app_components.get('fertilizer_model')
        
        if not fertilizer_preprocessor or not fertilizer_model:
            raise ValueError("Fertilizer preprocessor or model not available")
        
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
        available_features = check_feature_alignment(
            df_processed, 
            AppConfig.FERTILIZER_FEATURE_COLUMNS, 
            "fertilizer"
        )
        
        df_for_prediction = df_processed[available_features].copy()
        logger.debug(f"Final fertilizer prediction DataFrame:\n{df_for_prediction.to_string()}")
        
        # Make prediction
        logger.debug("Making fertilizer prediction...")
        prediction = fertilizer_model.predict(df_for_prediction)
        probabilities = fertilizer_model.predict_proba(df_for_prediction)
        
        logger.debug(f"Raw fertilizer prediction: {prediction}")
        logger.debug(f"Fertilizer prediction probabilities: {probabilities}")
        
        fertilizer_type = AppConfig.FERTILIZER_TYPE_MAP.get(prediction[0], "UNKNOWN")
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