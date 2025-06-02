"""Data processing utilities for soil data"""
import os
import sys
import logging
import pandas as pd
from typing import Dict, Any, List

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.utils.config import AppConfig
from api.utils.logging_config import setup_logger

# Setup logging
logger = setup_logger("my_app", level=logging.INFO, console_level=logging.INFO)

def prepare_soil_dataframe(soil_data: Dict[str, Any]) -> pd.DataFrame:
    """Convert soil data dictionary to DataFrame with proper column names"""
    logger.debug(f"Incoming soil_data: {soil_data}")
    
    # Map column names to match training data
    mapped_data = {}
    for k, v in soil_data.items():
        mapped_key = AppConfig.COLUMN_MAPPING.get(k, k)
        mapped_data[mapped_key] = v
        logger.debug(f"Mapped {k} -> {mapped_key}: {v}")
    
    df = pd.DataFrame([mapped_data])
    logger.debug(f"Created DataFrame with shape: {df.shape}")
    logger.debug(f"DataFrame columns: {df.columns.tolist()}")
    logger.debug(f"DataFrame dtypes:\n{df.dtypes}")
    logger.debug(f"DataFrame values:\n{df.to_string()}")
    
    return df

def validate_preprocessor_state(preprocessor, name: str) -> bool:
    """Validate preprocessor state and log details"""
    logger.info(f"Validating {name} preprocessor state:")
    logger.info(f"  Is fitted: {preprocessor.is_fitted}")
    logger.debug(f"  Label encoders: {list(preprocessor.label_encoders.keys()) if preprocessor.label_encoders else 'None'}")
    logger.debug(f"  Scaler: {type(preprocessor.scaler).__name__ if preprocessor.scaler else 'None'}")
    logger.debug(f"  Feature columns: {preprocessor.feature_columns}")
    
    if not preprocessor.is_fitted:
        logger.error(f"{name} preprocessor is not fitted!")
        return False
    return True

def check_feature_alignment(df_processed: pd.DataFrame, expected_features: List[str], model_type: str) -> List[str]:
    """Check feature alignment and return available features"""
    available_features = [col for col in expected_features if col in df_processed.columns]
    missing_features = [col for col in expected_features if col not in df_processed.columns]
    
    logger.debug(f"Expected {model_type} features: {expected_features}")
    logger.debug(f"Available {model_type} features: {available_features}")
    if missing_features:
        logger.warning(f"Missing {model_type} features: {missing_features}")
    
    if not available_features:
        raise ValueError(f"No expected features found in processed {model_type} data")
    
    return available_features