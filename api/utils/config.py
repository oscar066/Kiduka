"""
Configuration settings for the agricultural prediction API
"""
import os

class AppConfig:
    """Application configuration constants"""
    
    # Agrovet Search Configuration
    DEFAULT_AGROVET_COUNT = 5
    MAX_AGROVET_DISTANCE_KM = 500
    
    # Data file paths
    DATA_FILES = {
        'agrovet_data': 'agrovet_data_cleaned.csv'
    }

    # GEE Configuration
    GEE_PROJECT = os.getenv("GEE_PROJECT_ID")
    GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    
    # Model configuration
    MODEL_PATH = os.getenv("MODEL_PATH", "api/ml_models/")
    
    CLASS_NAMES = {1: "Very Poor", 2: "Poor", 3: "Moderately Healthy", 4: "Healthy"}
    PH_TO_SCORE = [(4.5, 1), (5.5, 2), (7.0, 3), (float("inf"), 4)]

    # Known model accuracy per class (from test set evaluation)
    CLASS_ACCURACY = {
        "Very Poor":          {"accuracy": 0.57, "within_one": 0.94},
        "Poor":               {"accuracy": 0.57, "within_one": 0.88},
        "Moderately Healthy": {"accuracy": 0.57, "within_one": 0.88},
        "Healthy":            {"accuracy": 0.57, "within_one": 0.88},
    }

    # Per-nutrient model accuracy (from test set)
    NUTRIENT_ACCURACY = {
        "N":  {"r2": 0.321, "within_one": 0.933},
        "OC": {"r2": 0.244, "within_one": 0.904},
        "P":  {"r2": 0.316, "within_one": 0.922},
        "K":  {"r2": 0.123, "within_one": 0.944},
        "Ca": {"r2": 0.212, "within_one": 0.889},
        "Mg": {"r2": 0.130, "within_one": 0.970},
    }