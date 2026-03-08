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
    MODEL_PATH = os.getenv("MODEL_PATH", "ml_models/")
    
    CLASS_NAMES = {1: "Very Poor", 2: "Poor", 3: "Moderately Healthy", 4: "Healthy"}
    PH_TO_SCORE = [(4.5, 1), (5.5, 2), (7.0, 3), (float("inf"), 4)]

    # Known model accuracy per class (from test set evaluation)
    CLASS_ACCURACY = {
        "Very Poor":          {"accuracy": 0.50, "within_one": 0.88},
        "Poor":               {"accuracy": 0.62, "within_one": 0.91},
        "Moderately Healthy": {"accuracy": 0.55, "within_one": 0.84},
        "Healthy":            {"accuracy": 0.35, "within_one": 0.72},
    }

    # Per-nutrient model accuracy (from test set)
    NUTRIENT_ACCURACY = {
        "N":  {"r2": 0.197, "within_one": 0.953},
        "OC": {"r2": 0.188, "within_one": 0.960},
        "P":  {"r2": 0.161, "within_one": 0.854},
        "K":  {"r2": 0.165, "within_one": 0.935},
        "Ca": {"r2": 0.405, "within_one": 0.908},
        "Mg": {"r2": 0.247, "within_one": 0.934},
    }