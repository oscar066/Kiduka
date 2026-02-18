import sys
import os
import asyncio
from unittest.mock import AsyncMock, MagicMock

# Add project root to path
sys.path.append(os.getcwd())

# Test imports first to catch syntax errors
print("Importing api.main...")
import api.main
print("Importing prediction logic...")
from api.schema.schema import SoilData
from api.services.prediction.prediction_service import PredictionService
from api.utils.dependencies import dependency_manager

async def test_prediction():
    print("Setting up dependencies...")
    # Mock dependency manager components
    mock_agrovet = MagicMock()
    mock_agrovet.find_nearest_agrovets.return_value = [{
        "name": "Test Agrovet", 
        "distance_km": 5.0,
        "latitude": 0.0,
        "longitude": 0.0,
        "products": [],
        "prices": []
    }]
    mock_session_manager = MagicMock()
    
    dependency_manager.set_components({
        'agrovet_locator': mock_agrovet
    })
    dependency_manager.set_session_manager(mock_session_manager)
    
    # Mock DB session
    mock_db = AsyncMock()
    
    service = PredictionService(mock_db)
    
    # Create sample soil data
    soil_data = SoilData(
        ph=6.5,
        n=0.2, # Healthy range
        p=30,  # Healthy range
        k=100, # Healthy range
        organic_carbon=2.5, # Moderately Healthy OC
        ca=1500,
        mg=200,
        latitude=0.0, longitude=0.0
    )
    
    print("Running prediction...")
    response = await service.create_prediction(soil_data, user=None)
    
    print("\n--- Prediction Result ---")
    print(f"Index: {response.soil_health_index}")
    print(f"Initial Status: {response.initial_soil_fertility_status}")
    print(f"Final Status: {response.soil_fertility_status}")
    print(f"Recommendations: {response.recommendations}")
    print(f"Mentions: {response.mentions}")
    
    # Assertion
    assert response.soil_fertility_status in ["Healthy", "Moderately Healthy", "Poor", "Very Poor"]
    assert isinstance(response.recommendations, list)
    assert len(response.recommendations) > 0
    
    print("\nTest PASSED!")

if __name__ == "__main__":
    asyncio.run(test_prediction())
