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
            
        required_models = ["spatial_nutrient_model", "spatial_class_model", "spatial_imputer", "spatial_scaler"]
        for name in required_models:
            file_path = f"{base_path}{name}.pkl"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Missing model file: {file_path}")
            
            # Remove prefix when adding to models dict to not break internal code
            key_name = name.replace("spatial_", "")
            self.models[key_name] = joblib.load(file_path)
            
        features_path = f"{base_path}spatial_input_features.json"
        if not os.path.exists(features_path):
            raise FileNotFoundError(f"Missing features file: {features_path}")
        with open(features_path) as f:
            self.models["features"] = json.load(f)
        logger.info("  ML Models loaded!")

    # GEE Data Fetching Methods
    def _sample(self, image: ee.Image, point: ee.Geometry.Point, scale: int = 30) -> Dict[str, Any]:
        """Sample an EE image at a point. Returns properties dict or {}."""
        try:
            result = image.sample(point, scale=scale).first().getInfo()
            return result["properties"] if result else {}
        except Exception as e:
            logger.warning(f"Sample failed: {str(e)[:80]}")
            return {}

    def _fetch_terrain(self, point: ee.Geometry.Point) -> Dict[str, Any]:
        srtm = ee.Image("USGS/SRTMGL1_003")
        elev = srtm.select("elevation").rename("elevation_m")
        slope = ee.Terrain.slope(srtm).rename("slope_degrees")
        aspect = ee.Terrain.aspect(srtm).rename("aspect_degrees")
        tpi = elev.subtract(
                  elev.focal_mean(radius=100, kernelType="circle", units="meters")
              ).rename("tpi")
        wetness = slope.multiply(np.pi/180).tan().add(0.001).log().multiply(-1).rename("wetness_index")
        
        try:
            lc = ee.ImageCollection("ESA/WorldCover/v200").first().select("Map").rename("landcover_class")
        except Exception:
            lc = ee.Image("MODIS/061/MCD12Q1/2022_01_01").select("LC_Type1").rename("landcover_class")

        props = self._sample(ee.Image.cat([elev, slope, aspect, tpi, wetness, lc]), point, scale=30)
        return {
            "elevation_m":     props.get("elevation_m",     np.nan),
            "slope_degrees":   props.get("slope_degrees",   np.nan),
            "aspect_degrees":  props.get("aspect_degrees",  np.nan),
            "tpi":             props.get("tpi",             np.nan),
            "wetness_index":   props.get("wetness_index",   np.nan),
            "landcover_class": props.get("landcover_class", np.nan),
        }

    def _fetch_sentinel2(self, point: ee.Geometry.Point, year: int) -> Dict[str, Any]:
        """Dry-season annual median with SCL pixel cloud masking. Full-year fallback."""
        def mask_scl(img):
            scl = img.select("SCL")
            mask = scl.eq(4).Or(scl.eq(5)).Or(scl.eq(6)).Or(scl.eq(11))
            return img.updateMask(mask)

        for (start, end), label in [
            ((f"{year}-06-01", f"{year}-09-30"), "dry season"),
            ((f"{year}-01-01", f"{year}-12-31"), "full year"),
        ]:
            try:
                s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                      .filterBounds(point).filterDate(start, end)
                      .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 50))
                      .map(mask_scl))
                if s2.size().getInfo() > 0:
                    img = s2.median().select(
                        ["B2","B3","B4","B5","B6","B7","B8","B11","B12"],
                        ["blue","green","red","red_edge1","red_edge2",
                         "red_edge3","nir","swir1","swir2"])
                    p = self._sample(img, point, scale=30)
                    b = {k: p.get(k, np.nan) for k in ["blue","green","red","nir",
                           "swir1","swir2","red_edge1","red_edge2","red_edge3"]}
                    eps = 1e-10
                    b["ndvi"] = (b["nir"]-b["red"])/(b["nir"]+b["red"]+eps) \
                                 if not any(np.isnan([b["nir"],b["red"]])) else np.nan
                    b["savi"] = ((b["nir"]-b["red"])/(b["nir"]+b["red"]+0.5))*1.5 \
                                 if not np.isnan(b.get("ndvi", np.nan)) else np.nan
                    b["ndmi"] = (b["nir"]-b["swir1"])/(b["nir"]+b["swir1"]+eps) \
                                 if not any(np.isnan([b["nir"],b["swir1"]])) else np.nan
                    b["evi"]  = 2.5*((b["nir"]-b["red"])/(b["nir"]+6*b["red"]-7.5*b["blue"]+1)) \
                                 if not any(np.isnan([b["nir"],b["red"],b["blue"]])) else np.nan
                    b["clay_ratio"]  = b["swir1"]/(b["swir2"]+eps) \
                                        if not any(np.isnan([b["swir1"],b["swir2"]])) else np.nan
                    b["iron_ratio"]  = b["red"]/(b["blue"]+eps) \
                                        if not any(np.isnan([b["red"],b["blue"]])) else np.nan
                    b["ndre"]        = (b["nir"]-b["red_edge1"])/(b["nir"]+b["red_edge1"]+eps) \
                                        if not any(np.isnan([b["nir"],b["red_edge1"]])) else np.nan
                    return b
            except Exception as e:
                logger.warning(f"S2 {label} failed: {str(e)[:80]}")

        return {k: np.nan for k in ["blue","green","red","nir","swir1","swir2",
                                      "red_edge1","red_edge2","red_edge3",
                                      "ndvi","ndmi","evi","savi","ndre",
                                      "clay_ratio","iron_ratio"]}

    def _fetch_sentinel1(self, point: ee.Geometry.Point, year: int) -> Dict[str, Any]:
        """Annual median SAR. Cloud-transparent — always available."""
        try:
            s1 = (ee.ImageCollection("COPERNICUS/S1_GRD")
                  .filterBounds(point)
                  .filterDate(f"{year}-01-01", f"{year}-12-31")
                  .filter(ee.Filter.eq("instrumentMode", "IW"))
                  .filter(ee.Filter.listContains("transmitterReceiverPolarisation","VV"))
                  .filter(ee.Filter.listContains("transmitterReceiverPolarisation","VH"))
                  .select(["VV","VH"])) 
            if s1.size().getInfo() == 0:
                return {"VV": np.nan, "VH": np.nan, "sar_vv_vh_ratio": np.nan}
            img = s1.median()
            ratio = img.select("VV").divide(img.select("VH").abs().add(1e-10)).rename("sar_vv_vh_ratio")
            p = self._sample(ee.Image.cat([img, ratio]), point, scale=10)
            return {"VV": p.get("VV", np.nan),
                    "VH": p.get("VH", np.nan),
                    "sar_vv_vh_ratio": p.get("sar_vv_vh_ratio", np.nan)}
        except Exception as e:
            logger.warning(f"S1 SAR failed: {str(e)[:80]}")
            return {"VV": np.nan, "VH": np.nan, "sar_vv_vh_ratio": np.nan}

    def _fetch_chirps(self, point: ee.Geometry.Point, year: int) -> Dict[str, Any]:
        """Annual total precipitation (mm)."""
        try:
            chirps = (ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
                      .filterBounds(point)
                      .filterDate(f"{year}-01-01", f"{year}-12-31"))
            p = self._sample(chirps.sum().rename("precip_annual_mm"), point, scale=5000)
            return {"precip_annual_mm": p.get("precip_annual_mm", np.nan)}
        except Exception as e:
            logger.warning(f"CHIRPS failed: {str(e)[:80]}")
            return {"precip_annual_mm": np.nan}

    def _fetch_era5(self, point: ee.Geometry.Point, year: int) -> Dict[str, Any]:
        """ERA5-Land annual means — replaces Open-Meteo, all inside GEE."""
        try:
            era5 = (ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
                    .filterBounds(point)
                    .filterDate(f"{year}-01-01", f"{year}-12-31"))
            if era5.size().getInfo() == 0:
                raise ValueError("No ERA5 data")
            img = era5.mean().select(
                ["temperature_2m","soil_temperature_level_1","soil_temperature_level_2",
                 "volumetric_soil_water_layer_1","volumetric_soil_water_layer_2",
                 "surface_net_solar_radiation_sum"],
                ["temp_2m_mean","soil_temp_0_7cm","soil_temp_7_28cm",
                 "soil_moisture_0_7cm","soil_moisture_7_28cm","solar_radiation_annual"])
            p = self._sample(img, point, scale=11132)
            return {k: p.get(k, np.nan) for k in
                    ["temp_2m_mean","soil_temp_0_7cm","soil_temp_7_28cm",
                     "soil_moisture_0_7cm","soil_moisture_7_28cm","solar_radiation_annual"]}
        except Exception as e:
            logger.warning(f"ERA5 failed: {str(e)[:80]}")
            return {k: np.nan for k in ["temp_2m_mean","soil_temp_0_7cm","soil_temp_7_28cm",
                                         "soil_moisture_0_7cm","soil_moisture_7_28cm",
                                         "solar_radiation_annual"]}

    def _fetch_spatial_layers(self, point: ee.Geometry.Point) -> Dict[str, Any]:
        """OpenLandMap soil properties + JRC distance to water."""
        result = {}
        try:
            perm = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").gte(80).selfMask()
            dist = perm.distance(ee.Kernel.euclidean(20000,"meters")).unmask(20000).rename("dist_to_water_m")
            p = self._sample(dist, point, scale=300)
            result["dist_to_water_m"] = p.get("dist_to_water_m", np.nan)
        except Exception as e:
            logger.warning(f"Distance to water failed: {str(e)[:60]}")
            result["dist_to_water_m"] = np.nan

        for asset, col, factor in [
            ("OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02",   "soil_texture_class", 1.0),
            ("OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02","soil_oc_0_5cm",      0.1),
            ("OpenLandMap/SOL/SOL_PH-H2O_USDA-4C1A2A_M/v02",      "soil_ph_remote",     0.1),
            ("OpenLandMap/SOL/SOL_WATERCONTENT-33KPA_USDA-4B1C_M/v01","soil_water_capacity",1.0),
        ]:
            try:
                img = ee.Image(asset).select("b0").multiply(factor).rename(col)
                p = self._sample(img, point, scale=300)
                result[col] = p.get(col, np.nan)
            except Exception as e:
                logger.warning(f"{col} failed: {str(e)[:60]}")
                result[col] = np.nan

        return result

    def _fetch_satellite_features(self, latitude: float, longitude: float, year: int = 2025) -> Dict[str, Any]:
        """Fetch all satellite features for a GPS point."""
        point = ee.Geometry.Point([longitude, latitude])
        sat = {}
        sat.update(self._fetch_terrain(point))
        sat.update(self._fetch_sentinel2(point, year))
        sat.update(self._fetch_sentinel1(point, year))
        sat.update(self._fetch_chirps(point, year))
        sat.update(self._fetch_era5(point, year))
        sat.update(self._fetch_spatial_layers(point))
        sat["latitude"] = latitude
        sat["longitude"] = longitude
        return sat

    # Utility Logic
    def ph_to_score(self, ph: float) -> int:
        for threshold, score in AppConfig.PH_TO_SCORE:
            if ph < threshold:
                return score
        return 4

    def _engineer_features(self, sat: Dict[str, Any]) -> Dict[str, Any]:
        eps = 1e-6
        elev  = sat.get("elevation_m",        np.nan)
        slope = sat.get("slope_degrees",      np.nan)
        sm0   = sat.get("soil_moisture_0_7cm",np.nan)
        sm1   = sat.get("soil_moisture_7_28cm",np.nan)
        st0   = sat.get("soil_temp_0_7cm",    np.nan)
        st1   = sat.get("soil_temp_7_28cm",   np.nan)
        dtw   = sat.get("dist_to_water_m",    np.nan)

        sat["elev_slope_ratio"]    = elev/(slope+0.1)        if not any(np.isnan([elev,slope])) else np.nan
        sat["soil_moisture_ratio"] = sm0/(sm1+eps)           if not any(np.isnan([sm0,sm1]))   else np.nan
        sat["soil_temp_diff"]      = st0-st1                 if not any(np.isnan([st0,st1]))   else np.nan
        sat["log_dist_to_water"]   = np.log1p(dtw)           if not np.isnan(dtw)              else np.nan
        return sat

    def calculate_shi(self, ph_score: int, nutrients: np.ndarray) -> float:
        n, oc, p, k, ca, mg = nutrients
        return float((ph_score*3.0 + oc*2.5 + n*2.0 + p*2.0 + k*1.5 + ca*1.0 + mg*1.0) / 13.0)

    def _round_to_score(self, values: np.ndarray) -> np.ndarray:
        return np.clip(np.rint(values), 1, 4).astype(int)

    def get_prediction_confidence(self, class_name: str, nutrient_scores: np.ndarray) -> Dict[str, Any]:
        fc_acc = AppConfig.CLASS_ACCURACY.get(class_name, {})
        flag = bool(class_name in ["Very Poor", "Poor", "Healthy"])
        confidence_level = "low" if class_name == "Healthy" else "moderate"
        
        nutrient_names = ["N", "OC", "P", "K", "Ca", "Mg"]
        nutrient_detail = []
        for name, score in zip(nutrient_names, nutrient_scores):
            acc = AppConfig.NUTRIENT_ACCURACY.get(name, {})
            warn = bool(score <= 2)
            nutrient_detail.append({
                "nutrient": name,
                "score": int(score),
                "label": AppConfig.CLASS_NAMES[int(score)],
                "within_one_accuracy": f"{round(acc.get('within_one',0)*100)}%",
                "r2": round(acc.get("r2", 0), 3),
                "flag_low": warn
            })

        return {
            "confidence_level": "moderate",
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
        sat = self._engineer_features(sat)

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
                "SHI": round(float(shi), 3),
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
