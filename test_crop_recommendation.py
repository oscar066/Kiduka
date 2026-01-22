import sys
import os
import asyncio
from typing import Dict, Any

# Add project root to path
sys.path.insert(0, os.path.abspath("."))

from api.schema.schema import WorkflowState, SoilData
from api.workflow.prediction_workflow import create_prediction_workflow
from api.utils.initialization import initialize_app_components
from api.utils.config import AppConfig

async def test_workflow():
    print("Initializing components...")
    components = initialize_app_components()
    
    print("Creating workflow...")
    workflow = create_prediction_workflow()
    
    # Test Data from notebooks/crop-recommend.ipynb (example row)
    # 19	-1.314042	-0.062645	-0.425646	-2.831822	-0.184988	-0.779966	1.032378	-0.999140	-1.895471	-0.244818
    # Since inputs to api expect raw values (not scaled), let's use some dummy plausible raw values
    soil_data = {
        "simplified_texture": "clay", # Mapped to numeric in prep
        "ph": 6.5,
        "n": 20.0,
        "p": 15.0,
        "k": 30.0,
        "o": 2.5,
        "ca": 10.0,
        "mg": 5.0,
        "cu": 1.0,
        "fe": 2.0,
        "zn": 1.5,
        "latitude": 0.0,
        "longitude": 0.0
    }
    
    initial_state: WorkflowState = {
        "soil_data": soil_data,
        "app_components": components,
        # Initialize other fields
        "fertility_prediction": None,
        "nearest_agrovets": []
    }
    
    print("\nRunning workflow...")
    try:
        final_state = await workflow.ainvoke(initial_state)
        
        print("\n" + "="*50)
        print("PREDICTION RESULTS")
        print("="*50)
        print(f"Fertility Prediction: {final_state.get('fertility_prediction')} (Conf: {final_state.get('fertility_confidence'):.2f})")
        print(f"Fertilizer Prediction: {final_state.get('fertilizer_prediction')} (Conf: {final_state.get('fertilizer_confidence'):.2f})")
        print(f"Crop Recommendation 1: {final_state.get('crop_recommendation1')} (Conf: {final_state.get('crop_recommendation1_confidence'):.2f})")
        print(f"Crop Recommendation 2: {final_state.get('crop_recommendation2')} (Conf: {final_state.get('crop_recommendation2_confidence'):.2f})")
        print("="*50)
        
        if final_state.get('crop_recommendation1') and final_state.get('crop_recommendation2'):
            print("\nSUCCESS: Crop recommendations generated!")
        else:
            print("\nFAILURE: Crop recommendations missing.")
            
    except Exception as e:
        print(f"\nERROR running workflow: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_workflow())
