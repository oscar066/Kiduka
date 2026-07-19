"""
Application initialization utilities.

Handles startup tasks including:
- Loading ML models and the agrovet locator
"""
import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Import local modules
from api.utils.agrovet import AgrovetLocator
from api.services.prediction.ml_predictor import MLPredictor
from api.utils.soil_ph import get_soil_ph_locator
from api.utils.config import AppConfig
from api.utils.logging_config import setup_logger

# Setup logging
logger = setup_logger("init_app", level=logging.INFO, console_level=logging.INFO)

# Load environment variables
load_dotenv()

def initialize_agrovet_locator() -> Optional[AgrovetLocator]:
    """Initialize AgrovetLocator with data"""
    try:
        current_dir = Path(__file__).parent.parent
        # Ensure we have a valid path for data, default to "data/agrovets.csv" if config missing
        data_file = AppConfig.DATA_FILES.get('agrovet_data', 'agrovets.csv')
        data_path = current_dir / "data" / data_file
        
        # Check if file exists, if not, AgrovetLocator will generate sample data
        agrovet_locator = AgrovetLocator.load_from_csv(str(data_path))
        logger.info("AgrovetLocator initialized successfully")
        return agrovet_locator
    except Exception as e:
        logger.error(f"Error initializing AgrovetLocator: {e}")
        return None

def initialize_ml_predictor() -> Optional[MLPredictor]:
    """Initialize MLPredictor with optional service account credentials"""
    try:
        # Check for service account credentials in environment
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        use_sa = creds_path is not None and os.path.exists(creds_path)
        
        predictor = MLPredictor(use_service_account=use_sa, credentials_path=creds_path)
        
        # Eagerly initialize to load models and connect to GEE at startup
        logger.info("Initializing MLPredictor (loading models and connecting to GEE)...")
        predictor.initialize()
        
        return predictor
    except Exception as e:
        logger.error(f"Error initializing MLPredictor at startup: {e}")
        # We still return the instance if possible, or None if it failed fatally
        return None

def initialize_app_components() -> Dict[str, Any]:
    """Initialize all application components"""
    logger.info("Initializing application components...")
    
    components = {}
    
    # Initialize AgrovetLocator
    agrovet_locator = initialize_agrovet_locator()
    if agrovet_locator:
        components['agrovet_locator'] = agrovet_locator
        
    # Initialize MLPredictor
    ml_predictor = initialize_ml_predictor()
    if ml_predictor:
        components['ml_predictor'] = ml_predictor

    # Warm the soil pH locator cache so the first request isn't slowed by CSV parsing
    try:
        get_soil_ph_locator()
        logger.info("SoilPhLocator initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing SoilPhLocator: {e}")

    logger.debug(f"Initialized components: {list(components.keys())}")
    return components