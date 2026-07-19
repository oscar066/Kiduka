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
from api.utils.soil_ph import get_soil_ph_locator
from api.utils.config import AppConfig
from api.services.prediction.nutrient_score_payload import build_unified_nutrients

logger = logging.getLogger(__name__)

class PredictionService:
    """
    Service layer orchestrating the full soil analysis and prediction workflow.
    
    This service integrates various components such as ML models, agrovet locators,
    and traditional soil classification formulas to produce a unified prediction.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the PredictionService.
        
        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db
    
    async def create_prediction(
        self, 
        soil_data: SoilData, 
        user: Optional[User] = None
    ) -> PredictionResponse:
        """
        Execute the soil prediction workflow from input data.
        
        This method delegates to the SoilHealthClassifier for explicit data,
        falls back to an ML predictor for missing values (gap-filling),
        fetches nearby agrovets, and logs the unified result to the database
        if the user is authenticated.
        
        Args:
            soil_data (SoilData): The soil nutrient parameters and location.
            user (Optional[User]): The authenticated user requesting the prediction, if any.
            
        Returns:
            PredictionResponse: The fully compiled prediction, including health indices
                and recommendations.
                
        Raises:
            ValueError: If required service dependencies are not initialized.
        """
        logger.info(f"Creating prediction for user: {user.username if user else 'anonymous'}")
        
        try:
            # Validate dependencies
            if not dependency_manager.is_initialized():
                raise ValueError("Prediction service not properly initialized")
            
            # Get components
            app_components = dependency_manager.get_components()
            agrovet_locator = app_components.get('agrovet_locator')
            ml_predictor = app_components.get('ml_predictor')

            # Resolve pH: use the lab-tested value if provided, otherwise fall back
            # to the regional default for this location (no lab test available).
            effective_ph = soil_data.ph
            ph_is_default = False
            if effective_ph is None:
                effective_ph = get_soil_ph_locator().get_default_ph(soil_data.latitude, soil_data.longitude)
                ph_is_default = effective_ph is not None
            if effective_ph is None:
                raise ValueError("Soil pH is required and no regional default is available for this location.")

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
                        ph=effective_ph,
                        ph_score=soil_data.ph_score,
                        year=soil_data.year or 2025
                    )
                    ml_extra_data = ml_results.get("confidence", {})

            # 2. Merge Data & Override (Hybrid Logic)
            merged_scores = {}
            nutrient_method = {} # Track "measured" or "estimated"
            
            # Always include pH (Required)
            merged_scores["pH"] = soil_data.ph_score or classifier.classify_ph(effective_ph)
            nutrient_method["pH"] = "estimated_regional_default" if ph_is_default else "measured"
            
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
            classification_result = classifier.get_analysis_from_scores(merged_scores, ph_val=effective_ph)
            classification_result["Mentions"] = classification_result.get("Mentions", [])
            if ph_is_default:
                classification_result["Mentions"].append(
                    "pH estimated from regional soil survey data (no lab test provided)"
                )

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
            param_scores = classification_result.get("Parameter_Scores", {})
            ml_nutrients = ml_results.get("prediction", {}).get("nutrients", {}) if ml_results else {}
            unified_nutrients = build_unified_nutrients(
                param_scores=param_scores,
                nutrient_method=nutrient_method,
                ml_nutrients=ml_nutrients,
            )

            result["nutrients"] = unified_nutrients
            
            # Save to database first (if authenticated) so we can use the
            # real DB-assigned UUID in the response, not a throwaway one.
            saved_prediction_id = None
            if user:
                db_soil_data = soil_data.model_dump()
                db_soil_data["ph"] = effective_ph
                saved = await self._save_prediction_to_database(
                    user_id=str(user.id),
                    soil_data=db_soil_data,
                    result=result
                )
                saved_prediction_id = saved.id
                logger.info("Prediction saved to database successfully")

            # Create response — use the real DB UUID when available
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
                prediction_id=saved_prediction_id or uuid.uuid4(),
                location_name=soil_data.location_name,
                timestamp=datetime.now()
            )
            
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
        """
        Persist a generated prediction and its associated agrovets to the database.
        
        Args:
            user_id (str): The UUID string of the user who owns this prediction.
            soil_data (dict): The dictionary representation of the unified soil inputs.
            result (dict): The dictionary containing the generated analysis results.
            
        Returns:
            SoilPrediction: The newly saved database model instance.
            
        Raises:
            Exception: If a database transaction error occurs.
        """
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
        """
        Fetch an existing agrovet by name or create a new database entry.
        
        This prevents duplicate agrovet entries from accumulating in the database
        when multiple predictions reference the same physical store.
        
        Args:
            agrovet_data (dict): The data describing the agrovet.
            
        Returns:
            Optional[Agrovet]: The found or newly created Agrovet model, or None if creation fails.
        """
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
        """
        Generate hardcoded agricultural advice based on predicted nutrient deficiency scores.
        
        Args:
            nutrient_scores (Dict[str, Any]): Dictionary mapping nutrients (e.g., "N", "P") 
                to their calculated scores.
                
        Returns:
            str: A semicolon-separated string of actionable recommendations.
        """
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
        """
        Transform raw numerical nutrient scores into structured labeled objects.
        
        Args:
            scores (Dict[str, int]): Dictionary of raw scores (e.g., {"N": 2}).
            
        Returns:
            Dict[str, Dict[str, Any]]: Structured representation including labels 
                (e.g., {"N": {"score": 2, "label": "Low"}}).
        """
        formatted = {}
        for key, score in scores.items():
            formatted[key] = {
                "score": int(score),
                "label": AppConfig.CLASS_NAMES.get(int(score), "Unknown")
            }
        return formatted
