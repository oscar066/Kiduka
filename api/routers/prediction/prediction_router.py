"""
Main prediction endpoint using service layer
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.schema.schema import SoilData, PredictionResponse
from api.utils.auth import get_current_user
from api.db.connection import get_db
from api.db.models.database import User
from api.services.prediction import PredictionService
from api.utils.session import SessionManager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["prediction-main"])

# Dependency to get prediction service
async def get_prediction_service(db: AsyncSession = Depends(get_db)) -> PredictionService:
    return PredictionService(db)

@router.post("/predict", response_model=PredictionResponse)
async def predict_soil_fertility(
    soil_data: SoilData,
    request: Request,
    current_user: User = Depends(get_current_user),
    prediction_service: PredictionService = Depends(get_prediction_service)
):
    # Predict soil fertility status
    logger.info("Prediction endpoint accessed")
    logger.debug(f"Received soil data for user: {current_user.username if current_user else 'anonymous'}")
    
    try:
        # Delegate to service
        response = await prediction_service.create_prediction(soil_data, current_user)
        
        # Handle session for non-authenticated users
        if not current_user:
            try:
                # You'll need to inject SessionManager here or get it from dependency_manager
                from api.utils.dependencies import dependency_manager
                session_manager = dependency_manager.get_session_manager()
                
                prediction_data = {
                    "soil_data": soil_data.model_dump(),
                    "result": {
                        "soil_health_index": response.soil_health_index,
                        "initial_soil_fertility_status": response.initial_soil_fertility_status,
                        "soil_fertility_status": response.soil_fertility_status,
                        "mentions": response.mentions,
                        "recommendations": response.recommendations,
                        "nutrients": response.nutrients,
                        "prediction_mode": response.prediction_mode,
                        "confidence": response.confidence
                    },
                    "timestamp": response.timestamp
                }
                await session_manager.update_session(request, prediction_data)
            except Exception as session_error:
                logger.error(f"Failed to update session: {session_error}")
                # Don't fail the request for session errors
        
        return response
        
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error in prediction pipeline: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")