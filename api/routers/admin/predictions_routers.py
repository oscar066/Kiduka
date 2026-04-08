"""
Admin prediction management endpoints using service layer
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.schema.auth_schema import (
    AdminPredictionResponse, AdminPredictionUpdate, AdminPredictionListResponse
)
from api.services.admin.prediction_service import AdminPredictionService
from api.utils.auth import get_current_admin_user
from api.utils.auth import get_current_admin_user
from api.services.auth.auth_manager import AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency to get prediction service
async def get_prediction_service(db: AsyncSession = Depends(get_db)) -> AdminPredictionService:
    return AdminPredictionService(db)

@router.get("", response_model=AdminPredictionListResponse)
async def get_all_predictions(
    current_user: User = Depends(get_current_admin_user),
    prediction_service: AdminPredictionService = Depends(get_prediction_service),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    is_flagged: Optional[bool] = Query(None, description="Filter by flagged status"),
    fertility_status: Optional[str] = Query(None, description="Filter by fertility status"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order")
):
    """Get all predictions with filtering and pagination (admin only)"""
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=prediction_service.db,
            admin_user_id=current_user.id,
            action="view_all_predictions",
            request=request,
            details={"user_id": user_id, "is_flagged": is_flagged, "fertility_status": fertility_status}
        )
        
        # Delegate to service
        return await prediction_service.get_predictions_with_filters(
            page=page,
            size=size,
            user_id=user_id,
            is_flagged=is_flagged,
            fertility_status=fertility_status,
            sort_by=sort_by,
            sort_order=sort_order
        )
    except Exception as e:
        logger.error(f"Error fetching predictions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch predictions"
        )

@router.put("/{prediction_id}", response_model=AdminPredictionResponse)
async def update_prediction_by_admin(
    prediction_id: str,
    prediction_update: AdminPredictionUpdate,
    current_user: User = Depends(get_current_admin_user),
    prediction_service: AdminPredictionService = Depends(get_prediction_service),
    request: Request = None
):
    """Update prediction by admin (flag/unflag, add notes)"""
    try:
        result = await prediction_service.update_prediction(prediction_id, prediction_update, current_user)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=prediction_service.db,
            admin_user_id=current_user.id,
            action="update_prediction",
            request=request,
            target_prediction_id=prediction_id,
            details={"changes": prediction_update.model_dump(exclude_unset=True)}
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update prediction"
        )

@router.delete("/{prediction_id}")
async def delete_prediction_by_admin(
    prediction_id: str,
    current_user: User = Depends(get_current_admin_user),
    prediction_service: AdminPredictionService = Depends(get_prediction_service),
    request: Request = None
):
    """Delete prediction by admin"""
    try:
        result = await prediction_service.delete_prediction(prediction_id, current_user)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=prediction_service.db,
            admin_user_id=current_user.id,
            action="delete_prediction",
            request=request,
            details=result
        )
        
        return {"message": "Prediction deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prediction"
        )