"""Fertility prediction node for the workflow"""
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

def predict_fertility_node(state: WorkflowState) -> WorkflowState:
    """Predict soil fertility status"""
    logger.info("Starting fertility prediction...")
    
    try:
        # Get components from state
        app_components = state.get("app_components", {})
        fertility_preprocessor = app_components.get('fertility_preprocessor')
        fertility_model = app_components.get('fertility_model')
        
        if not fertility_preprocessor or not fertility_model:
            raise ValueError("Fertility preprocessor or model not available")
        
        # Validate preprocessor
        if not validate_preprocessor_state(fertility_preprocessor, "Fertility"):
            raise ValueError("Fertility preprocessor is not properly fitted")
        
        df = prepare_soil_dataframe(state["soil_data"])
        logger.debug(f"Original DataFrame for fertility prediction:\n{df.to_string()}")
        
        # Apply preprocessing
        logger.debug("Applying fertility preprocessing...")
        df_processed = fertility_preprocessor.transform(df)
        
        # Check feature alignment
        available_features = check_feature_alignment(
            df_processed, 
            AppConfig.FERTILITY_FEATURE_COLUMNS, 
            "fertility"
        )
        
        df_for_prediction = df_processed[available_features].copy()
        logger.debug(f"Final prediction DataFrame shape: {df_for_prediction.shape}")
        logger.debug(f"Final prediction DataFrame:\n{df_for_prediction.to_string()}")
        
        # Make prediction
        logger.debug("Making fertility prediction...")
        prediction = fertility_model.predict(df_for_prediction)
        probabilities = fertility_model.predict_proba(df_for_prediction)
        
        logger.debug(f"Raw fertility prediction: {prediction}")
        logger.debug(f"Fertility prediction probabilities: {probabilities}")
        
        fertility_status = AppConfig.FERTILITY_STATUS_MAP.get(prediction[0], "UNKNOWN")
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