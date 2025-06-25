import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession

# Import schemas
from api.schema.schema import SoilData, PredictionResponse, WorkflowState
from api.schema.auth_schema import UserResponse

# Import auth utilities
from api.utils.auth import get_current_user_optional
from api.utils.logging_config import setup_logger
from api.utils.dependencies import dependency_manager

# Import database components
from api.db.connection import get_db
from api.models.database import User

# Import prediction save function
from api.routers.predictions_router import save_prediction_to_db

# Setup logging
logger = setup_logger("PredictRouter", level=logging.INFO, console_level=logging.INFO)

# Create router
router = APIRouter(
    prefix="",  # No prefix since we want /predict at root level
    tags=["predictions"],
    responses={404: {"description": "Not found"}},
)

@router.post("/predict", response_model=PredictionResponse)
async def predict_soil_fertility(
    soil_data: SoilData,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Predict soil fertility status and fertilizer recommendations based on soil data"""
    logger.info("Prediction endpoint accessed")
    logger.debug(f"Received soil data: {soil_data.model_dump()}")
    
    # Check if dependencies are initialized
    if not dependency_manager.is_initialized():
        logger.error("Router dependencies not properly initialized")
        raise HTTPException(status_code=500, detail="Service not properly initialized")
    
    # Check if models are loaded
    if not dependency_manager.validate_models_loaded():
        logger.error("One or more models/preprocessors not loaded")
        raise HTTPException(status_code=500, detail="Models not properly loaded")
    
    # Get dependencies
    app_components = dependency_manager.get_components()
    prediction_workflow = dependency_manager.get_workflow()
    session_manager = dependency_manager.get_session_manager()
    
    try:
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
        
        logger.debug(f"Initial workflow state initialized")
        
        # Run the workflow ASYNCHRONOUSLY
        logger.info("Running prediction workflow...")
        result = await prediction_workflow.ainvoke(initial_state)
        
        logger.debug(f"Workflow completed with result keys: {list(result.keys())}")
        
        # Create response with proper None checks
        response = PredictionResponse(
            soil_fertility_status=result.get("fertility_prediction", "UNKNOWN"),
            soil_fertility_confidence=result.get("fertility_confidence", 0.0),
            fertilizer_recommendation=result.get("fertilizer_prediction", "UNKNOWN"), 
            fertilizer_confidence=result.get("fertilizer_confidence", 0.0),
            nearest_agrovets=result.get("nearest_agrovets", []),
            structured_response=result.get("structured_response", None),
            timestamp=datetime.now().isoformat()
        )
        
        # Save prediction to database if user is authenticated
        if current_user:
            logger.info(f"Saving prediction for authenticated user: {current_user.username}")
            try:
                # Prepare agrovet data for database
                agrovet_data = []
                for agrovet in result.get("nearest_agrovets", []):
                    if isinstance(agrovet, dict):
                        agrovet_data.append(agrovet)
                    elif hasattr(agrovet, 'model_dump'):
                        agrovet_data.append(agrovet.model_dump())
                
                # Save to database
                await save_prediction_to_db(
                    db=db,
                    user_id=str(current_user.id),
                    soil_data=soil_data.model_dump(),
                    fertility_prediction=result.get("fertility_prediction", "UNKNOWN"),
                    fertility_confidence=float(result.get("fertility_confidence", 0.0)),
                    fertilizer_prediction=result.get("fertilizer_prediction", "UNKNOWN"),
                    fertilizer_confidence=float(result.get("fertilizer_confidence", 0.0)),
                    structured_response=result.get("structured_response"),
                    agrovets=agrovet_data
                )
                logger.info("Prediction saved to database successfully")
                
            except Exception as db_error:
                # This will now show the actual database error if one occurs, not the greenlet error
                logger.error(f"Failed to save prediction to database: {db_error}", exc_info=True)
                # Don't fail the entire request if database save fails
        else:
            # Update session for non-authenticated users
            logger.info("Updating session for non-authenticated user")
            try:
                prediction_data = {
                    "soil_data": soil_data.model_dump(),
                    "result": {
                        "fertility_prediction": result.get("fertility_prediction"),
                        "fertility_confidence": result.get("fertility_confidence"),
                        "fertilizer_prediction": result.get("fertilizer_prediction"),
                        "fertilizer_confidence": result.get("fertilizer_confidence")
                    },
                    "timestamp": datetime.now().isoformat()
                }
                await session_manager.update_session(request, prediction_data)
            except Exception as session_error:
                logger.error(f"Failed to update session: {session_error}")
        
        logger.info("Prediction completed successfully")
        logger.info(f"Results - Fertility: {response.soil_fertility_status} ({response.soil_fertility_confidence:.2f}), "
                   f"Fertilizer: {response.fertilizer_recommendation} ({response.fertilizer_confidence:.2f})")
        
        return response
        
    except Exception as e:
        logger.error(f"Error in prediction pipeline: {e}")
        logger.error(f"Exception details:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")