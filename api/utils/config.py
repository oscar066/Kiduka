"""
Configuration settings for the agricultural prediction AP
"""
from typing import Dict, List

class AppConfig:
    """Application configuration constants"""
    
    # Define mappings for predictions
    FERTILITY_STATUS_MAP = {0: "MODERATELY HEALTHY", 1: "POOR", 2: "VERY POOR"}
    FERTILIZER_TYPE_MAP = {0: "NPK", 1: "TSP"}
    CROP_RECOMMENDATION1_MAP = {
        0: "ALVS",
        1: "ARROW ROOTS",
        2: "BANANA",
        3: "BEANS",
        4: "CASSAVA",
        5: "COTTON",
        6: "MAIZE",
        7: "MILLET",
        8: "PAWPAW",
        9: "PEANUT",
        10: "PINEAPPLE",
        11: "SESAME",
        12: "SORGHUM",
        13: "SOYBEAN",
        14: "SUNFLOWER",
    }
    CROP_RECOMMENDATION2_MAP = {
        0: "ALVS",
        1: "BANANA",
        2: "BEANS",
        3: "CASSAVA",
        4: "COTTON",
        5: "MAIZE",
        6: "MILLET",
        7: "PEANUT",
        8: "PINEAPPLE",
        9: "SESAME",
        10: "SORGHUM",
        11: "SOYBEAN",
    }
    
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

    CROP_RECOMMENDATION_FEATURE_COLUMNS = [
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
        'fertilizer_model': 'Fertilizers_xgb_Classifier_Model.joblib',
        'crop_recommender1_preprocessor': 'soil_crop_recommendation1_preprocessor.joblib',
        'crop_recommender1_model': 'Crop_recommendation_1_randomForest_Classifier_Model.joblib',
        'crop_recommender2_preprocessor': 'soil_crop_recommendation2_preprocessor.joblib',
        'crop_recommender2_model': 'Crop_recommendation_2_randomForest_Classifier_Model.joblib'
    }
    
    # Data file paths
    DATA_FILES = {
        'agrovet_data': 'agrovet_data_cleaned.csv'
    }