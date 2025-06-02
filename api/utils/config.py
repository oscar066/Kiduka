"""Configuration settings for the agricultural prediction API"""

from typing import Dict, List

class AppConfig:
    """Application configuration constants"""
    
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
    
    # Expected feature columns after preprocessing
    FERTILITY_FEATURE_COLUMNS = [
        'simpliedtexture(1)', 'ph', 'n', 'p', 'k', 'o', 'ca', 'mg', 'cu', 'fe', 'zn'
    ]
    
    FERTILIZER_FEATURE_COLUMNS = [
        'simpliedtexture(1)', 'ph', 'n', 'p', 'k', 'o', 'ca', 'mg', 'cu', 'fe', 'zn', 'soilfertilitystatus'
    ]
    
    # OpenAI Configuration
    OPENAI_MODEL = "gpt-4o-mini"
    OPENAI_TEMPERATURE = 0.3
    
    # Agrovet Search Configuration
    DEFAULT_AGROVET_COUNT = 5
    MAX_AGROVET_DISTANCE_KM = 500
    
    # Model file names
    MODEL_FILES = {
        'fertility_preprocessor': 'soil_fertility_status_preprocessor.joblib',
        'fertility_model': 'Soil_Status_randomForest_Classifier_Model.joblib',
        'fertilizer_preprocessor': 'soil_fertilizer_recommendation_preprocessor.joblib',
        'fertilizer_model': 'Fertilizers_xgb_Classifier_Model.joblib'
    }
    
    # Data file paths
    DATA_FILES = {
        'agrovet_data': 'agrovet_data_cleaned.csv'
    }