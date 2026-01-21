"""
Crop recommendation prediction node for the workflow
"""
import os
import sys
import logging
import numpy as np
from typing import Dict, Any

# Ensure parent directory is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from api.schema.schema import WorkflowState
from api.utils.config import AppConfig
from api.utils.data_processing import prepare_soil_dataframe, validate_preprocessor_state, check_feature_alignment

logger = logging.getLogger(__name__)

def predict_crop_recommendation_node(state: WorkflowState) -> WorkflowState:
    """Predict crop recommendations based on soil data and fertility status"""
    logger.info("Starting crop recommendation prediction...")
    
    try:
        # Get components from state
        app_components = state.get("app_components", {})
        
        # Crop 1 components
        preprocessor1 = app_components.get('crop_recommender1_preprocessor')
        model1 = app_components.get('crop_recommender1_model')
        
        # Crop 2 components
        preprocessor2 = app_components.get('crop_recommender2_preprocessor')
        model2 = app_components.get('crop_recommender2_model')
        
        if not all([preprocessor1, model1, preprocessor2, model2]):
            raise ValueError("Crop recommendation preprocessors or models not available")
            
        # Validate preprocessors
        if not validate_preprocessor_state(preprocessor1, "Crop1") or \
           not validate_preprocessor_state(preprocessor2, "Crop2"):
            raise ValueError("Crop preprocessors not properly fitted")

        df = prepare_soil_dataframe(state["soil_data"])
        
        # Add soilfertilitystatus (required for crop models)
        # Map string status back to integer
        fertility_status_str = state.get("fertility_prediction")
        
        # Reverse map fertility status
        reverse_fertility_map = {v: k for k, v in AppConfig.FERTILITY_STATUS_MAP.items()}
        fertility_status_int = reverse_fertility_map.get(fertility_status_str)
        
        if fertility_status_int is None:
            logger.warning(f"Unknown or missing fertility status: {fertility_status_str}, defaulting to 0 (MODERATELY HEALTHY)")
            fertility_status_int = 0
            
        df['soilfertilitystatus'] = fertility_status_int
        logger.debug(f"DataFrame for crop prediction (with fertility={fertility_status_int}):\n{df.to_string()}")
        
        # --- Predict Crop 1 ---
        logger.debug("Predicting Crop 1...")
        df_processed1 = preprocessor1.transform(df)
        
        features1 = check_feature_alignment(
            df_processed1,
            AppConfig.CROP_RECOMMENDATION_FEATURE_COLUMNS,
            "crop1"
        )
        df_pred1 = df_processed1[features1]
        
        pred1 = model1.predict(df_pred1)[0]
        prob1 = float(np.max(model1.predict_proba(df_pred1)))
        
        crop1_name = AppConfig.CROP_RECOMMENDATION1_MAP.get(pred1, f"UNKNOWN({pred1})")
        
        state["crop_recommendation1"] = crop1_name
        state["crop_recommendation1_confidence"] = prob1
        
        # --- Predict Crop 2 ---
        logger.debug("Predicting Crop 2...")
        df_processed2 = preprocessor2.transform(df)
        
        features2 = check_feature_alignment(
            df_processed2,
            AppConfig.CROP_RECOMMENDATION_FEATURE_COLUMNS,
            "crop2"
        )
        df_pred2 = df_processed2[features2]
        
        pred2 = model2.predict(df_pred2)[0]
        prob2 = float(np.max(model2.predict_proba(df_pred2)))
        
        crop2_name = AppConfig.CROP_RECOMMENDATION2_MAP.get(pred2, f"UNKNOWN({pred2})")
        
        state["crop_recommendation2"] = crop2_name
        state["crop_recommendation2_confidence"] = prob2
        
        logger.info(f"Crop predictions completed: Crop1={crop1_name} ({prob1:.2f}), Crop2={crop2_name} ({prob2:.2f})")
        
    except Exception as e:
        logger.error(f"Error in crop recommendation: {e}", exc_info=True)
        state["crop_recommendation1"] = "UNKNOWN"
        state["crop_recommendation1_confidence"] = 0.0
        state["crop_recommendation2"] = "UNKNOWN"
        state["crop_recommendation2_confidence"] = 0.0
        
    return state
