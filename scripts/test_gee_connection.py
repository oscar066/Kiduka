import os
import sys
import logging
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from api.services.prediction.ml_predictor import MLPredictor
from api.utils.config import AppConfig

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_gee_connection():
    """Test GEE connectivity and a simple data fetch"""
    logger.info("Starting GEE connection test...")
    
    try:
        predictor = MLPredictor()
        predictor.initialize()
        
        if not predictor.is_initialized:
            logger.error("Predictor failed to initialize.")
            return False
            
        logger.info("Successfully connected to GEE.")
        
        # Test a simple terrain fetch (Mt. Kenya coordinates)
        lat, lon = -0.1521, 37.3084
        logger.info(f"Testing terrain fetch at ({lat}, {lon})...")
        
        import ee
        point = ee.Geometry.Point([lon, lat])
        elev, slope = predictor._fetch_terrain(point)
        
        logger.info(f"Result: Elevation={elev}m, Slope={slope} deg")
        
        if elev > 0:
            logger.info("GEE Data fetch successful!")
            return True
        else:
            logger.warning("GEE Data fetch returned unexpected values.")
            return False
            
    except Exception as e:
        logger.error(f"Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_gee_connection()
    sys.exit(0 if success else 1)
