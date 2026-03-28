import requests
import json

BASE_URL = "http://localhost:8000/predictions"

def test_prediction(payload, description):
    print(f"\n--- Testing Scenario: {description} ---")
    try:
        response = requests.post(f"{BASE_URL}/predict", json=payload)
        response.raise_for_status()
        result = response.json()
        print(f"Mode Used: {result.get('prediction_mode')}")
        print(f"Status: {result.get('soil_fertility_status')}")
        print(f"Mentions: {result.get('mentions')}")
        print("Nutrients Summary:")
        for k, v in result.get('nutrients', {}).items():
            print(f"  {k}: {v.get('score')} ({v.get('label')})")
        return result
    except Exception as e:
        print(f"Error: {e}")
        return None

# Scenario 1: Full Formula (All nutrients provided)
full_payload = {
    "ph": 6.5,
    "n": 0.22,
    "p": 35.0,
    "k": 120.0,
    "organic_carbon": 2.5,
    "ca": 1500.0,
    "mg": 250.0,
    "latitude": -1.286389,
    "longitude": 36.817223
}
test_prediction(full_payload, "Full Formula (All Nutrients)")

# Scenario 2: Hybrid (Some nutrients provided)
partial_payload = {
    "ph": 6.5,
    "n": 0.10, # Very Poor (should influence final result)
    "p": 45.0, # Healthy
    "latitude": -1.286389,
    "longitude": 36.817223
}
test_prediction(partial_payload, "Hybrid (Some Nutrients)")

# Scenario 3: Full ML (No nutrients provided)
ml_payload = {
    "ph": 6.5,
    "latitude": -1.286389,
    "longitude": 36.817223
}
test_prediction(ml_payload, "Full ML (No optional nutrients)")
