"""
Application initialization utilities
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

def initialize_app_components() -> Dict[str, Any]:
    """Initialize all application components"""
    logger.info("Initializing application components...")
    
    components = {}
    
    # Initialize AgrovetLocator
    agrovet_locator = initialize_agrovet_locator()
    if agrovet_locator:
        components['agrovet_locator'] = agrovet_locator
    
    logger.debug(f"Initialized components: {list(components.keys())}")
    return components