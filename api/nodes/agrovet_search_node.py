"""Agrovet search node for the workflow"""
import os
import sys
import logging
from typing import Dict, Any

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.utils.config import AppConfig
from api.schema.schema import WorkflowState

logger = logging.getLogger(__name__)

def find_nearest_agrovets_node(state: WorkflowState) -> WorkflowState:
    """Find nearest agrovets based on location data"""
    logger.info("Starting nearest agrovets search...")
    
    try:
        # Get components from state
        app_components = state.get("app_components", {})
        agrovet_locator = app_components.get('agrovet_locator')
        
        if agrovet_locator is None:
            raise ValueError("AgrovetLocator is not initialized")
            
        # Get location from soil data
        soil_data = state["soil_data"]
        if "latitude" not in soil_data or "longitude" not in soil_data:
            logger.warning("Location data not provided in soil data")
            state["nearest_agrovets"] = []
            return state
            
        user_lat = float(soil_data["latitude"])
        user_lon = float(soil_data["longitude"])
        
        # Find nearest agrovets
        nearest_agrovets = agrovet_locator.find_nearest_agrovets(
            user_lat=user_lat,
            user_lon=user_lon,
            top_k=AppConfig.DEFAULT_AGROVET_COUNT,
            max_distance_km=AppConfig.MAX_AGROVET_DISTANCE_KM
        )
        
        # Add results to state
        state["nearest_agrovets"] = nearest_agrovets
        logger.info(f"Found {len(nearest_agrovets)} nearby agrovets")
        return state
        
    except Exception as e:
        logger.error(f"Error finding nearest agrovets: {e}")
        logger.error("Exception details:", exc_info=True)
        state["nearest_agrovets"] = []
        return state