import requests

url = "http://localhost:8000/predict"
payload = {
    "ph": 6.0,
    "latitude": -1.2921,
    "longitude": 36.8219,
    "n": 0.20,
    "p": 15.0
    # k, organic_carbon, ca, mg are missing
}

try:
    response = requests.post(url, json=payload)
    response.raise_for_status()
    result = response.json()
    print("Mode Used:", result.get("prediction_mode"))
    print("Final Status:", result.get("soil_fertility_status"))
    print(result)
except Exception as e:
    print("Error:", e)
