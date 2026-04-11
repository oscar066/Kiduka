"""
Main prediction service - handles soil analysis workflow and database operations
"""
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.schema.schema import SoilData, PredictionResponse
from api.db.models.database import User, SoilPrediction, Agrovet
from api.utils.dependencies import dependency_manager
from api.utils.soil_classifier import SoilHealthClassifier
from api.utils.config import AppConfig

logger = logging.getLogger(__name__)

class PredictionService:
    """Service for handling soil predictions and analysis"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_prediction(
        self, 
        soil_data: SoilData, 
        user: Optional[User] = None
    ) -> PredictionResponse:
        """Create a new soil prediction with full workflow"""
        logger.info(f"Creating prediction for user: {user.username if user else 'anonymous'}")
        
        try:
            # Validate dependencies
            if not dependency_manager.is_initialized():
                raise ValueError("Prediction service not properly initialized")
            
            # Get components
            app_components = dependency_manager.get_components()
            agrovet_locator = app_components.get('agrovet_locator')
            ml_predictor = app_components.get('ml_predictor')
            
            # Identify nutrients
            optional_nutrients = ["n", "p", "k", "organic_carbon", "ca", "mg"]
            provided_nutrients = {n: getattr(soil_data, n) for n in optional_nutrients if getattr(soil_data, n) is not None}
            
            logger.info(f"Provided nutrients: {list(provided_nutrients.keys())}")
            
            classifier = SoilHealthClassifier()
            classification_result = {}
            prediction_mode = "FORMULA"
            ml_extra_data = {}
            
            # Determine if we need ML for gap-filling
            missing_nutrients = [n for n in optional_nutrients if getattr(soil_data, n) is None]
            needs_gap_fill = len(missing_nutrients) > 0
            
            # 1. Start with ML if needed for gap filling or if data is very sparse
            ml_results = None
            if needs_gap_fill or not provided_nutrients:
                if not ml_predictor:
                    logger.warning("ML Predictor requested for gap-fill but not available")
                else:
                    logger.info(f"Running ML for gap-fill on: {missing_nutrients}")
                    ml_results = ml_predictor.predict_soil_health(
                        latitude=soil_data.latitude,
                        longitude=soil_data.longitude,
                        ph=soil_data.ph,
                        ph_score=soil_data.ph_score,
                        year=soil_data.year or 2025
                    )
                    ml_extra_data = ml_results.get("confidence", {})

            # 2. Merge Data & Override (Hybrid Logic)
            merged_scores = {}
            nutrient_method = {} # Track "measured" or "estimated"
            
            # Always include pH (Required)
            merged_scores["pH"] = soil_data.ph_score or classifier.classify_ph(soil_data.ph)
            nutrient_method["pH"] = "measured"
            
            # Map for classifier
            field_to_name = {"n": "N", "p": "P", "k": "K", "organic_carbon": "OC", "ca": "Ca", "mg": "Mg"}
            
            for field in optional_nutrients:
                name = field_to_name[field]
                val = getattr(soil_data, field)
                
                if val is not None:
                    # Measured data ALWAYS overrides
                    if field == "n": merged_scores["N"] = classifier.classify_n(val)
                    elif field == "p": merged_scores["P"] = classifier.classify_p(val)
                    elif field == "k": merged_scores["K"] = classifier.classify_k(val)
                    elif field == "organic_carbon": merged_scores["OC"] = classifier.classify_oc(val)
                    elif field == "ca": merged_scores["Ca"] = classifier.classify_ca(val)
                    elif field == "mg": merged_scores["Mg"] = classifier.classify_mg(val)
                    nutrient_method[name] = "measured"
                elif ml_results:
                    # Use ML prediction as gap-fill
                    ml_nutrients = ml_results.get("prediction", {}).get("nutrients", {})
                    if name in ml_nutrients:
                        merged_scores[name] = ml_nutrients[name].get("score")
                        nutrient_method[name] = "estimated"
            
            # 3. Recalculate SHI from unified dataset
            classification_result = classifier.get_analysis_from_scores(merged_scores, ph_val=soil_data.ph)
            classification_result["Mentions"] = classification_result.get("Mentions", [])
            
            # Determine overall prediction mode label
            if provided_nutrients and ml_results:
                prediction_mode = "ML" # We still call it ML mode if it involved ML, but UI will show "Hybrid"
                classification_result["Mentions"].append("Hybrid: User Input + ML Prediction")
            elif ml_results and not provided_nutrients:
                prediction_mode = "ML"
                classification_result["Mentions"].append("Predicted via GEE + ML Model")
            else:
                prediction_mode = "FORMULA"
            
            # Find nearest agrovets
            nearest_agrovets = []
            if agrovet_locator:
                nearest_agrovets = agrovet_locator.find_nearest_agrovets(
                    user_lat=soil_data.latitude,
                    user_lon=soil_data.longitude
                )
            
            # Extract results
            shi_score = classification_result.get("SHI_Score", 0.0)
            initial_status = classification_result.get("Initial_Class", "UNKNOWN")
            final_status = classification_result.get("Final_Soil_Status", "UNKNOWN")
            recommendations_str = classification_result.get("Recommendations", "")
            recommendations_list = [r.strip() for r in recommendations_str.split(";") if r.strip()]
            mentions = classification_result.get("Mentions", [])

            # Prepare result dictionary for storage and response
            result = {
                "soil_health_index": shi_score,
                "initial_soil_fertility_status": initial_status,
                "soil_fertility_status": final_status,
                "mentions": mentions,
                "recommendations": recommendations_list,
                "nearest_agrovets": nearest_agrovets,
                "prediction_mode": prediction_mode,
                "confidence": ml_extra_data
            }
            
            # Extract unified nutrient scores for uniform display
            unified_nutrients = {}
            param_scores = classification_result.get("Parameter_Scores", {})
            for key, score in param_scores.items():
                if key == "pH": continue
                unified_nutrients[key] = {
                    "score": int(score),
                    "label": AppConfig.CLASS_NAMES.get(int(score), "Unknown"),
                    "method": nutrient_method.get(key, "estimated")
                }

            result["nutrients"] = unified_nutrients
            
            # Create response
            response = PredictionResponse(
                soil_health_index=shi_score,
                initial_soil_fertility_status=initial_status,
                soil_fertility_status=final_status,
                mentions=mentions,
                recommendations=recommendations_list,
                nearest_agrovets=nearest_agrovets,
                nutrients=unified_nutrients,
                prediction_mode=prediction_mode,
                confidence=ml_extra_data,
                prediction_id=uuid.uuid4(), # Generate ID if not already present
                timestamp=datetime.now()
            )
            
            # Save to database if user is authenticated
            if user:
                # For ML, use predicted nutrients for DB storage
                db_soil_data = soil_data.model_dump()
                if prediction_mode == "ML":
                    # Use the combined scores (Parameter_Scores) for DB storage
                    scores = classification_result.get("Parameter_Scores", {})
                    # Map back to DB field names
                    nutrient_map = {"N": "n", "P": "p", "K": "k", "OC": "organic_carbon", "Ca": "ca", "Mg": "mg"}
                    for key, db_key in nutrient_map.items():
                        if db_soil_data.get(db_key) is None:
                            db_soil_data[db_key] = scores.get(key)

                await self._save_prediction_to_database(
                    user_id=str(user.id),
                    soil_data=db_soil_data,
                    result=result
                )
                logger.info("Prediction saved to database successfully")
            
            return response
            
        except Exception as e:
            logger.error(f"Error creating prediction: {e}")
            raise
    
    async def _save_prediction_to_database(
        self,
        user_id: str,
        soil_data: dict,
        result: dict
    ) -> SoilPrediction:
        """Save prediction results to database"""
        try:
            # Process agrovets - only if they exist
            agrovet_objects = []
            nearest_agrovets = result.get("nearest_agrovets", [])
            
            if nearest_agrovets:
                for agrovet_data in nearest_agrovets:
                    # Handle both dict and object types
                    if isinstance(agrovet_data, dict):
                        data = agrovet_data
                    elif hasattr(agrovet_data, 'model_dump'):
                        data = agrovet_data.model_dump()
                    elif hasattr(agrovet_data, '__dict__'):
                        data = agrovet_data.__dict__
                    else:
                        logger.warning(f"Unexpected agrovet data type: {type(agrovet_data)}")
                        continue
                    
                    agrovet = await self._get_or_create_agrovet(data)
                    if agrovet:  # Only add if successfully created/found
                        agrovet_objects.append(agrovet)
            
            # Create prediction record
            prediction = SoilPrediction(
                user_id=user_id,
                soil_ph=soil_data.get('ph'),
                nitrogen=soil_data.get('n'),
                phosphorus=soil_data.get('p'),
                potassium=soil_data.get('k'),
                organic_carbon=soil_data.get('organic_carbon'),
                calcium=soil_data.get('ca'),
                magnesium=soil_data.get('mg'),
                location_lat=soil_data.get('latitude'),
                location_lng=soil_data.get('longitude'),
                location_name=soil_data.get('location_name'),
                soil_health_index=result.get("soil_health_index", 0.0),
                initial_soil_fertility_status=result.get("initial_soil_fertility_status"),
                soil_fertility_status=result.get("soil_fertility_status"),
                mentions=result.get("mentions", []),
                recommendations=result.get("recommendations", []),
                prediction_mode=result.get("prediction_mode"),
                confidence_data=result.get("confidence"),
                nutrients=result.get("nutrients"),
                agrovets=agrovet_objects
            )
            
            self.db.add(prediction)
            await self.db.commit()
            await self.db.refresh(prediction)
            
            return prediction
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error saving prediction to database: {e}")
            raise
    
    async def _get_or_create_agrovet(self, agrovet_data: dict) -> Optional[Agrovet]:
        """Get existing agrovet or create new one"""
        try:
            name = agrovet_data.get('name')
            if not name:
                logger.warning("Agrovet data missing name field")
                return None
            
            # Check if agrovet already exists
            stmt = select(Agrovet).where(Agrovet.name == name)
            result = await self.db.execute(stmt)
            existing_agrovet = result.scalar_one_or_none()
            
            if existing_agrovet:
                return existing_agrovet
            
            # Create new agrovet
            new_agrovet = Agrovet(
                name=name,
                latitude=agrovet_data.get('latitude', 0.0),
                longitude=agrovet_data.get('longitude', 0.0),
                products=agrovet_data.get('products', []),
                prices=agrovet_data.get('prices', []),
                address=agrovet_data.get('address'),
                phone=agrovet_data.get('phone'),
                email=agrovet_data.get('email'),
                rating=agrovet_data.get('rating'),
                services=agrovet_data.get('services', []),
                is_active=True,
                is_verified=False
            )
            
            self.db.add(new_agrovet)
            # Don't commit here - let the parent transaction handle it
            
            return new_agrovet
            
        except Exception as e:
            logger.error(f"Error processing agrovet data: {e}")
            return None

    def _generate_ml_recommendations(self, nutrient_scores: Dict[str, Any]) -> str:
        """Helper to generate recommendations based on predicted nutrient scores"""
        actions = []
        # Mapping from classifier recommendations logic
        # 1=Very Poor, 2=Poor
        if nutrient_scores.get("N", {}).get("score", 4) <= 2:
            actions.append("Top-dress with CAN (predicted low Nitrogen)")
        if nutrient_scores.get("P", {}).get("score", 4) <= 2:
            actions.append("Apply NPK/DAP at planting (predicted low Phosphorus)")
        if nutrient_scores.get("OC", {}).get("score", 4) <= 2:
            actions.append("Apply 20 tons FYM/compost per acre (predicted low Organic Carbon)")
        if nutrient_scores.get("K", {}).get("score", 4) <= 2:
            actions.append("Apply MOP or K-rich blend (predicted low Potassium)")
        
        if not actions:
            actions.append("Maintain current practices (predicted healthy levels)")
            
        return "; ".join(actions)

    def _format_nutrient_scores(self, scores: Dict[str, int]) -> Dict[str, Dict[str, Any]]:
        """Helper to format raw scores into uniform response structure"""
        formatted = {}
        for key, score in scores.items():
            formatted[key] = {
                "score": int(score),
                "label": AppConfig.CLASS_NAMES.get(int(score), "Unknown")
            }
        return formatted
