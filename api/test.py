import requests
import json
from typing import Dict, Any

class AgriculturalAPIClient:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
    
    def predict_soil_fertility(self, soil_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send soil data to the API and get predictions
        """
        url = f"{self.base_url}/predict"
        response = requests.post(url, json=soil_data)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"API request failed: {response.status_code} - {response.text}")

    
    def health_check(self) -> Dict[str, Any]:
        """Check API health"""
        url = f"{self.base_url}/health"
        response = requests.get(url)
        return response.json()

def test_api():
    """Test the agricultural prediction API"""
    client = AgriculturalAPIClient()
    
    # Test health check
    print("=== Health Check ===")
    try:
        health = client.health_check()
        print(json.dumps(health, indent=2))
    except Exception as e:
        print(f"Health check failed: {e}")
        return
    
    # Test soil prediction with sample data
    print("\n=== Soil Fertility Prediction ===")
    
    # Sample soil data for testing
    sample_soil_data = {
        "simplified_texture": "Loamy",
        "ph": 6.8,
        "n": 85.5,
        "p": 45.2,
        "k": 120.8,
        "o": 4.2,
        "ca": 450.0,
        "mg": 85.0,
        "cu": 2.1,
        "fe": 25.3,
        "zn": 4.8,
        "crop_type": "Wheat"
    }
    
    try:
        prediction = client.predict_soil_fertility(sample_soil_data)
        print("Input Soil Data:")
        print(json.dumps(sample_soil_data, indent=2))
        print("\nPrediction Results:")
        print(json.dumps(prediction, indent=2))
        
        # Display results in a farmer-friendly format
        print("\n=== Farmer-Friendly Results ===")
        print(f"🌱 Soil Fertility Status: {prediction['soil_fertility_status']}")
        print(f"🔬 Confidence Level: {prediction['soil_fertility_confidence']:.1%}")
        print(f"🧪 Recommended Fertilizer: {prediction['fertilizer_recommendation']}")
        print(f"🎯 Recommendation Confidence: {prediction['fertilizer_confidence']:.1%}")
        print(f"\n📝 Explanation:")
        print(prediction['explanation'])
        print(f"\n✅ Recommendations:")
        for i, rec in enumerate(prediction['recommendations'], 1):
            print(f"   {i}. {rec}")
            
    except Exception as e:
        print(f"Prediction failed: {e}")

# Additional test scenarios
def test_different_scenarios():
    """Test with different soil conditions"""
    client = AgriculturalAPIClient()
    
    test_scenarios = [
        {
            "name": "Poor Soil - Low Nutrients",
            "data": {
                "simplified_texture": "Sandy",
                "ph": 5.2,
                "n": 25.0,
                "p": 15.0,
                "k": 40.0,
                "o": 1.8,
                "ca": 150.0,
                "mg": 25.0,
                "cu": 0.8,
                "fe": 8.5,
                "zn": 1.2,
                "crop_type": "Corn"
            }
        },
        {
            "name": "Rich Soil - High Nutrients",
            "data": {
                "simplified_texture": "Clay Loam",
                "ph": 7.2,
                "n": 180.0,
                "p": 90.0,
                "k": 250.0,
                "o": 6.5,
                "ca": 800.0,
                "mg": 120.0,
                "cu": 4.2,
                "fe": 45.0,
                "zn": 8.5,
                "crop_type": "Tomatoes"
            }
        },
        {
            "name": "Alkaline Clay Soil",
            "data": {
                "simplified_texture": "Clay",
                "ph": 8.5,
                "n": 70.0,
                "p": 35.0,
                "k": 110.0,
                "o": 3.2,
                "ca": 900.0,
                "mg": 180.0,
                "cu": 1.5,
                "fe": 15.0,
                "zn": 3.0,
                "crop_type": "Rice"
            }
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n{'='*50}")
        print(f"Testing: {scenario['name']}")
        print('='*50)
        
        try:
            result = client.predict_soil_fertility(scenario['data'])
            print(f"🌱 Fertility: {result['soil_fertility_status']}")
            print(f"🧪 Fertilizer: {result['fertilizer_recommendation']}")
            print(f"📝 Explanation: {result['explanation'][:200]}...")
        except Exception as e:
            print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    print("Testing Agricultural Prediction API")
    print("="*50)
    
    # Run basic tests
    test_api()
    
    # Run scenario tests
    print("\n" + "="*50)
    print("TESTING DIFFERENT SCENARIOS")
    test_different_scenarios()