"""
Main prediction endpoint using service layer
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.schema.schema import SoilData, PredictionResponse, DefaultPhResponse
from api.utils.auth import get_current_user
from api.db.connection import get_db
from api.db.models.database import User
from api.services.prediction import PredictionService
from api.utils.session import SessionManager
from api.utils.soil_ph import get_soil_ph_locator

logger = logging.getLogger(__name__)

router = APIRouter(tags=["prediction-main"])

@router.get("/default-ph", response_model=DefaultPhResponse)
async def get_default_ph(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    """
    Look up the surveyed regional soil pH for a location, for pre-filling the
    soil analysis form. Returns ph=None if the location isn't within any
    surveyed region (the caller should leave the field for manual entry —
    the /predict endpoint still applies a nearest-region fallback if needed).
    """
    ph = get_soil_ph_locator().get_exact_ph(latitude, longitude)
    return DefaultPhResponse(ph=ph)

# Dependency to get prediction service
async def get_prediction_service(db: AsyncSession = Depends(get_db)) -> PredictionService:
    """
    FastAPI dependency that injects a PredictionService instance.
    
    Args:
        db (AsyncSession): The asynchronous SQLAlchemy database session.
        
    Returns:
        PredictionService: An initialized service for handling prediction logic.
    """
    return PredictionService(db)

@router.post("/predict", response_model=PredictionResponse)
async def predict_soil_fertility(
    soil_data: SoilData,
    request: Request,
    current_user: User = Depends(get_current_user),
    prediction_service: PredictionService = Depends(get_prediction_service)
):
    """
    Generate a soil fertility prediction based on provided laboratory data or location.
    
    This endpoint processes soil data, calculates health indices, assigns fertility status,
    fetches nearby agrovets, and utilizes an LLM to generate actionable recommendations.
    If the user is authenticated, the prediction is saved to their history. If unauthenticated,
    the prediction is saved to their browser session.
    
    Args:
        soil_data (SoilData): The input data representing the soil sample.
        request (Request): The incoming FastAPI request, used for session management.
        current_user (User): The authenticated user making the request (injected).
        prediction_service (PredictionService): Service managing the prediction pipeline.
        
    Returns:
        PredictionResponse: A comprehensive payload detailing soil health, recommendations,
        and nearby agricultural supply stores.
        
    Raises:
        HTTPException: If an unexpected error or validation failure occurs during processing (status 500).
    """
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