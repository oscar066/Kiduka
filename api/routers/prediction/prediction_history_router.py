"""
Prediction history management endpoints using service layer
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.schema.schema import PredictionHistory, PredictionListResponse
from api.utils.auth import get_current_user
from api.services.prediction import PredictionHistoryService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["prediction-history"])

# Dependency to get history service
async def get_history_service(db: AsyncSession = Depends(get_db)) -> PredictionHistoryService:
    return PredictionHistoryService(db)

@router.get("", response_model=PredictionListResponse)
async def get_user_predictions(
    current_user: User = Depends(get_current_user),
    history_service: PredictionHistoryService = Depends(get_history_service),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order")
):
    """Get user's prediction history with pagination"""
    try:
        return await history_service.get_user_predictions(
            user=current_user,
            page=page,
            size=size,
            sort_by=sort_by,
            sort_order=sort_order
        )
    except Exception as e:
        logger.error(f"Error fetching predictions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch predictions"
        )

@router.get("/{prediction_id}", response_model=PredictionHistory)
async def get_prediction_detail(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    history_service: PredictionHistoryService = Depends(get_history_service)
):
    """Get detailed information about a specific prediction"""
    try:
        result = await history_service.get_prediction_detail(current_user, prediction_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction not found"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching prediction detail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch prediction detail"
        )

@router.delete("/{prediction_id}")
async def delete_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    history_service: PredictionHistoryService = Depends(get_history_service)
):
    """Delete a specific prediction"""
    try:
        success = await history_service.delete_prediction(current_user, prediction_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction not found"
            )
        return {"message": "Prediction deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prediction"
        )