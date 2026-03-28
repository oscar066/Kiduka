import warnings
warnings.filterwarnings("ignore")

import os
import ee
import joblib
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional
from api.utils.config import AppConfig


logger = logging.getLogger(__name__)

class MLPredictor:
    """
    Handles Google Earth Engine data fetching and ML model predictions for soil health.
    """
    
    def __init__(self, use_service_account: bool = False, credentials_path: Optional[str] = None):
        self.models = {}
        self.is_initialized = False
        self.use_service_account = use_service_account
        self.credentials_path = credentials_path

    def initialize(self):
        """Initialize GEE and load models"""
        if self.is_initialized:
            return
            
        logger.info("Initializing ML Predictor...")
        self._initialize_gee()
        self._load_models()
        self.is_initialized = True
        logger.info("ML Predictor initialized successfully.")

    def _initialize_gee(self):
        logger.info("Connecting to Google Earth Engine...")
        try:
            # Check for service account credentials in AppConfig or provided path
            creds_path = self.credentials_path or AppConfig.GOOGLE_APPLICATION_CREDENTIALS
            logger.debug(f"Resolved creds_path: {creds_path}")
            
            # Robust path resolution for both local and Docker environments
            if creds_path and not os.path.exists(creds_path) and creds_path.startswith("api/"):
                alt_path = creds_path.replace("api/", "", 1)
                logger.debug(f"Path not found, trying alt_path: {alt_path}")
                if os.path.exists(alt_path):
                    logger.info(f"Found credentials at alternative path: {alt_path}")
                    creds_path = alt_path
            
            if creds_path and os.path.exists(creds_path):
                logger.info(f"Using service account from {creds_path}")
                from google.oauth2 import service_account
                
                credentials = service_account.Credentials.from_service_account_file(
                    creds_path,
                    scopes=['https://www.googleapis.com/auth/earthengine']
                )
                ee.Initialize(credentials=credentials, project=AppConfig.GEE_PROJECT)
            else:
                # Fallback to default credentials
                logger.info("Using default Google application credentials...")
                ee.Initialize(project=AppConfig.GEE_PROJECT)
            
            logger.info("  Connected to GEE!")
        except Exception as e:
            logger.error(f"  GEE initialization fatal error: {e}")
            self.is_initialized = False
            return

    def _load_models(self):
        logger.info("Loading saved ML models...")
        base_path = os.path.abspath(AppConfig.MODEL_PATH)
        if not base_path.endswith('/'):
            base_path += '/'
            
        required_models = ["nutrient_model", "class_model", "imputer", "scaler"]
        for name in required_models:
            file_path = f"{base_path}{name}.pkl"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Missing model file: {file_path}")
            self.models[name] = joblib.load(file_path)
            
        features_path = f"{base_path}input_features.json"
        if not os.path.exists(features_path):
            raise FileNotFoundError(f"Missing features file: {features_path}")
        with open(features_path) as f:
            self.models["features"] = json.load(f)
        logger.info("  ML Models loaded!")

    # GEE Data Fetching Methods
    def _fetch_terrain(self, point: ee.Geometry.Point) -> Tuple[float, float]:
        srtm = ee.Image("USGS/SRTMGL1_003")
        elevation = srtm.select("elevation").rename("elev_m")
        slope = ee.Terrain.slope(srtm).rename("slope_deg")
        terrain = elevation.addBands(slope).sample(point, scale=30).first().getInfo()
        if terrain:
            p = terrain["properties"]
            return p.get("elev_m", np.nan), p.get("slope_deg", np.nan)
        return np.nan, np.nan

    def _fetch_landcover(self, point: ee.Geometry.Point) -> float:
        try:
            lc = (ee.ImageCollection("ESA/WorldCover/v200")
                  .first().select("Map").rename("landcover")
                  .sample(point, scale=10).first().getInfo())
            return lc["properties"].get("landcover", np.nan) if lc else np.nan
        except:
            return np.nan

    def _fetch_soil_texture(self, point: ee.Geometry.Point) -> Tuple[float, float]:
        try:
            soil = (ee.Image("OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02")
                    .sample(point, scale=250).first().getInfo())
            if not soil:
                return 25.0, 45.0
            clay_raw = soil["properties"].get("b0", np.nan)
            if np.isnan(float(clay_raw)):
                return 25.0, 45.0
            clay_lookup = {1:55,2:50,3:35,4:35,5:35,6:30,7:25,8:15,9:10,10:5,11:5,12:3}
            sand_lookup = {1:25,2:5,3:55,4:30,5:10,6:55,7:40,8:15,9:65,10:5,11:70,12:90}
            return float(clay_lookup.get(int(clay_raw), 25)), float(sand_lookup.get(int(clay_raw), 45))
        except:
            return 25.0, 45.0

    def _fetch_ndvi(self, point: ee.Geometry.Point, year: int) -> float:
        try:
            ndvi = (ee.ImageCollection("MODIS/061/MOD13A2")
                    .filterDate(f"{year}-01-01", f"{year}-12-31")
                    .select("NDVI").mean().multiply(0.0001).rename("ndvi")
                    .sample(point, scale=500).first().getInfo())
            return ndvi["properties"].get("ndvi", np.nan) if ndvi else np.nan
        except:
            return np.nan

    def _fetch_sar(self, point: ee.Geometry.Point, year: int) -> Tuple[float, float, float]:
        try:
            s1 = (ee.ImageCollection("COPERNICUS/S1_GRD")
                  .filterBounds(point)
                  .filterDate(f"{year}-01-01", f"{year}-12-31")
                  .filter(ee.Filter.eq("instrumentMode", "IW"))
                  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
                  .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VH"))
                  .select(["VV","VH"]))
            s1_med = s1.median().rename(["vv","vh"])
            s1_diff = s1_med.select("vv").subtract(s1_med.select("vh")).rename("vv_minus_vh")
            result = s1_med.addBands(s1_diff).sample(point, scale=10).first().getInfo()
            if result:
                p = result["properties"]
                return p.get("vv", np.nan), p.get("vh", np.nan), p.get("vv_minus_vh", np.nan)
        except:
            pass
        return np.nan, np.nan, np.nan

    def _fetch_rainfall(self, point: ee.Geometry.Point, year: int) -> Tuple[float, float, float, float]:
        def get_sum(start, end, name):
            try:
                val = (ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
                       .filterBounds(point).filterDate(start, end)
                       .sum().rename(name)
                       .sample(point, scale=5000).first().getInfo())
                return val["properties"].get(name, np.nan) if val else np.nan
            except:
                return np.nan

        total = get_sum(f"{year}-01-01", f"{year}-12-31", "total")
        long_r = get_sum(f"{year}-03-01", f"{year}-05-31", "long")
        short_r = get_sum(f"{year}-10-01", f"{year}-12-31", "short")
        dry1 = get_sum(f"{year}-01-01", f"{year}-02-28", "dry1")
        dry2 = get_sum(f"{year}-06-01", f"{year}-09-30", "dry2")
        dry = (0 if np.isnan(dry1) else dry1) + (0 if np.isnan(dry2) else dry2)
        return total, long_r, short_r, float(dry)

    def _fetch_satellite_features(self, latitude: float, longitude: float, year: int = 2025) -> Dict[str, Any]:
        point = ee.Geometry.Point([longitude, latitude])
        elev, slope = self._fetch_terrain(point)
        lc = self._fetch_landcover(point)
        clay, sand = self._fetch_soil_texture(point)
        ndvi = self._fetch_ndvi(point, year)
        vv, vh, vv_vh = self._fetch_sar(point, year)
        total, long_r, short_r, dry = self._fetch_rainfall(point, year)
        return {
            "elev_m": elev, "slope_deg": slope, "landcover": lc,
            "clay_pct": clay, "sand_pct": sand, "ndvi_2025_modis": ndvi,
            "s1_vv_med": vv, "s1_vh_med": vh, "s1_vv_minus_vh": vv_vh,
            "rain_2025_total_mm": total, "rain_2025_long_mm": long_r,
            "rain_2025_short_mm": short_r, "rain_2025_dry_mm": dry,
            "Latitude": latitude, "Longitude": longitude
        }

    # Utility Logic
    def ph_to_score(self, ph: float) -> int:
        for threshold, score in AppConfig.PH_TO_SCORE:
            if ph < threshold:
                return score
        return 4

    def _engineer_features(self, sat: Dict[str, Any]) -> Dict[str, float]:
        eps = 1e-6
        return {
            "sar_ratio": sat["s1_vv_med"] / (sat["s1_vh_med"] + eps),
            "rain_dry_fraction": sat["rain_2025_dry_mm"] / (sat["rain_2025_total_mm"] + eps),
            "elev_slope_ratio": sat["elev_m"] / (sat["slope_deg"] + 0.1),
            "clay_sand_ratio": sat["clay_pct"] / (sat["sand_pct"] + eps),
            "ndvi_rain": sat["ndvi_2025_modis"] * sat["rain_2025_total_mm"]
        }

    def calculate_shi(self, ph_score: int, nutrients: np.ndarray) -> float:
        n, oc, p, k, ca, mg = nutrients
        weights = [3.0, 2.5, 2.0, 2.0, 1.5, 1.0, 1.0]
        values = [ph_score, oc, n, p, k, ca, mg]
        return float(sum(w * v for w, v in zip(weights, values)) / sum(weights))

    def _round_to_score(self, values: np.ndarray) -> np.ndarray:
        return np.clip(np.rint(values), 1, 4).astype(int)

    def get_prediction_confidence(self, class_name: str, nutrient_scores: np.ndarray) -> Dict[str, Any]:
        fc_acc = AppConfig.CLASS_ACCURACY.get(class_name, {})

        # Overall confidence level
        if class_name in ["Very Poor", "Poor"]:
            confidence_level = "moderate"
            flag = True
        elif class_name == "Healthy":
            confidence_level = "low"
            flag = True
        else:
            confidence_level = "moderate"
            flag = False
        
        flag = bool(flag)

        # Per-nutrient accuracy info
        nutrient_names = ["N", "OC", "P", "K", "Ca", "Mg"]
        nutrient_detail = []
        for name, score in zip(nutrient_names, nutrient_scores):
            acc = AppConfig.NUTRIENT_ACCURACY.get(name, {})
            warn = score <= 2  # Poor or Very Poor
            nutrient_detail.append({
                "nutrient": name,
                "score": int(score),
                "label": AppConfig.CLASS_NAMES[int(score)],
                "within_one_accuracy": f"{round(float(acc.get('within_one', 0))*100)}%",
                "r2": round(float(acc.get("r2", 0)), 3),
                "flag_low": bool(warn)
            })

        return {
            "confidence_level": confidence_level,
            "flag_poor_result": flag,
            "model_fc_accuracy": f"{round(fc_acc.get('accuracy',0)*100)}%",
            "model_within_one": f"{round(fc_acc.get('within_one',0)*100)}%",
            "nutrients": nutrient_detail
        }

    # Main Prediction Entry Point
    def predict_soil_health(
        self, latitude: float, longitude: float, ph: float, ph_score: Optional[int] = None, year: int = 2025
    ) -> Dict[str, Any]:
        if not self.is_initialized:
            self.initialize()
            
        logger.info(f"ML Prediction for ({latitude}, {longitude})...")
        sat = self._fetch_satellite_features(latitude, longitude, year)
        sat["pH"] = ph
        sat.update(self._engineer_features(sat))

        if ph_score is None:
            ph_score = self.ph_to_score(ph)

        # Build feature vector
        X = np.array([[sat.get(f, np.nan) for f in self.models["features"]]])
        X = self.models["imputer"].transform(X)
        X = self.models["scaler"].transform(X)

        # Predictions
        nutrient_cont = self.models["nutrient_model"].predict(X)
        nutrient_scores = self._round_to_score(nutrient_cont)[0]
        shi = self.calculate_shi(ph_score, nutrient_scores)
        final_class_num = self.models["class_model"].predict(X)[0]
        final_class = AppConfig.CLASS_NAMES[final_class_num]

        # Confidence info
        confidence = self.get_prediction_confidence(final_class, nutrient_scores)

        return {
            "status": "success",
            "prediction_mode": "ML",
            "input": {
                "latitude": latitude,
                "longitude": longitude,
                "pH": ph,
                "pH_score": ph_score,
                "year": year
            },
            "prediction": {
                "final_classification": final_class,
                "SHI": round(shi, 3),
                "nutrients": {
                    "N": {"score": int(nutrient_scores[0]), "label": AppConfig.CLASS_NAMES[int(nutrient_scores[0])]},
                    "OC": {"score": int(nutrient_scores[1]), "label": AppConfig.CLASS_NAMES[int(nutrient_scores[1])]},
                    "P": {"score": int(nutrient_scores[2]), "label": AppConfig.CLASS_NAMES[int(nutrient_scores[2])]},
                    "K": {"score": int(nutrient_scores[3]), "label": AppConfig.CLASS_NAMES[int(nutrient_scores[3])]},
                    "Ca": {"score": int(nutrient_scores[4]), "label": AppConfig.CLASS_NAMES[int(nutrient_scores[4])]},
                    "Mg": {"score": int(nutrient_scores[5]), "label": AppConfig.CLASS_NAMES[int(nutrient_scores[5])]},
                }
            },
            "confidence": confidence
        }
