"""
Configuration settings for the agricultural prediction API
"""

class AppConfig:
    """Application configuration constants"""
    
    # Agrovet Search Configuration
    DEFAULT_AGROVET_COUNT = 5
    MAX_AGROVET_DISTANCE_KM = 500
    
    # Data file paths
    DATA_FILES = {
        'agrovet_data': 'agrovet_data_cleaned.csv'
    }