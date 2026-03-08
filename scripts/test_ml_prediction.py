import requests
import json

def test_ml_prediction():
    url = "http://localhost:8000/predictions/predict"
    
    # Test case: Only coordinates and pH (ML should take over)
    # Using coordinates near Mt. Kenya for interesting results
    payload = {
        "ph": 6.5,
        "latitude": -0.1521,
        "longitude": 37.3084,
        "year": 2025
    }
    
    print(f"Sending ML prediction request to {url}...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        result = response.json()
        print("\nPrediction Successful!")
        print(f"Prediction Mode: {result.get('prediction_mode')}")
        print(f"Soil Fertility Status: {result.get('soil_fertility_status')}")
        print(f"Soil Health Index: {result.get('soil_health_index')}")
        
        print("\nNutrient Estimates (Detailed):")
        nutrients = result.get('nutrients', {})
        for nutrient, data in nutrients.items():
            print(f"  - {nutrient}: Score={data.get('score')}, Label={data.get('label')}")
            
        if result.get('confidence'):
            print("\nML Confidence Metrics:")
            print(json.dumps(result.get('confidence'), indent=2))
            
    except requests.exceptions.HTTPError as err:
        print(f"\nHTTP Error: {err}")
        try:
            print(f"Response: {err.response.json()}")
        except:
            print(f"Response: {err.response.text}")
    except Exception as e:
        print(f"\nError: {e}")

if __name__ == "__main__":
    test_ml_prediction()
