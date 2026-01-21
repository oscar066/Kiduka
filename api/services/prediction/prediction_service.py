"""
Main prediction service - handles soil analysis workflow and database operations
"""
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.schema.schema import SoilData, PredictionResponse, WorkflowState
from api.db.models.database import User, SoilPrediction, Agrovet
from api.utils.dependencies import dependency_manager

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
            
            if not dependency_manager.validate_models_loaded():
                raise ValueError("ML models not properly loaded")
            
            # Get workflow components
            app_components = dependency_manager.get_components()
            prediction_workflow = dependency_manager.get_workflow()
            
            # Initialize workflow state
            initial_state: WorkflowState = {
                "soil_data": soil_data.model_dump(),
                "fertility_prediction": None,
                "fertility_confidence": None,
                "fertilizer_prediction": None,
                "fertilizer_confidence": None,
                "nearest_agrovets": [],
                "app_components": app_components,
                "detailed_explanation": None,
                "categorized_recommendations": None,
                "structured_response": None,
                "fertilizer_justification": None,
                "confidence_assessment": None,
                "long_term_strategy": None
            }
            
            # Run prediction workflow
            logger.info("Executing prediction workflow...")
            result = await prediction_workflow.ainvoke(initial_state)
            
            # Create response
            response = PredictionResponse(
                soil_fertility_status=result.get("fertility_prediction", "UNKNOWN"),
                soil_fertility_confidence=result.get("fertility_confidence", 0.0),
                fertilizer_recommendation=result.get("fertilizer_prediction", "UNKNOWN"), 
                fertilizer_confidence=result.get("fertilizer_confidence", 0.0),
                crop_recommendation1=result.get("crop_recommendation1", "UNKNOWN"),
                crop_recommendation1_confidence=result.get("crop_recommendation1_confidence", 0.0),
                crop_recommendation2=result.get("crop_recommendation2", "UNKNOWN"),
                crop_recommendation2_confidence=result.get("crop_recommendation2_confidence", 0.0),
                nearest_agrovets=result.get("nearest_agrovets", []),
                structured_response=result.get("structured_response", None),
                timestamp=datetime.now().isoformat()
            )
            
            # Save to database if user is authenticated
            if user:
                await self._save_prediction_to_database(
                    user_id=str(user.id),
                    soil_data=soil_data.model_dump(),
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
                simplified_texture=soil_data.get('simplified_texture'),
                soil_ph=soil_data.get('ph'),
                nitrogen=soil_data.get('n'),
                phosphorus=soil_data.get('p'),
                potassium=soil_data.get('k'),
                organic_matter=soil_data.get('o'),
                calcium=soil_data.get('ca'),
                magnesium=soil_data.get('mg'),
                copper=soil_data.get('cu'),
                iron=soil_data.get('fe'),
                zinc=soil_data.get('zn'),
                location_lat=soil_data.get('latitude'),
                location_lng=soil_data.get('longitude'),
                location_name=soil_data.get('location_name'),
                fertility_prediction=result.get("fertility_prediction"),
                fertility_confidence=result.get("fertility_confidence"),
                fertilizer_recommendation=result.get("fertilizer_prediction"),
                fertilizer_confidence=result.get("fertilizer_confidence"),
                crop_recommendation1=result.get("crop_recommendation1"),
                crop_recommendation1_confidence=result.get("crop_recommendation1_confidence", 0.0),
                crop_recommendation2=result.get("crop_recommendation2"),
                crop_recommendation2_confidence=result.get("crop_recommendation2_confidence", 0.0),
                structured_response=result.get("structured_response"),
                agrovets=agrovet_objects  # This is the key fix - ensure it's never None
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
