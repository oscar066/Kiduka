
"""
Admin prediction management endpoints
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from sqlalchemy.orm import selectinload

from api.db.connection import get_db
from api.db.models.database import User, SoilPrediction
from api.schema.auth_schema import (
    AdminPredictionResponse, AdminPredictionUpdate, AdminPredictionListResponse
)
from api.utils.auth import get_current_admin_user, AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=AdminPredictionListResponse)
async def get_all_predictions(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
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
    logger.info(f"Admin predictions list accessed by: {current_user.username}")
    
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="view_all_predictions",
            request=request,
            details={"user_id": user_id, "is_flagged": is_flagged, "fertility_status": fertility_status}
        )
        
        # Build base query
        stmt = select(SoilPrediction).options(selectinload(SoilPrediction.user))
        count_stmt = select(func.count(SoilPrediction.id))
        
        # Apply filters
        conditions = []
        
        if user_id:
            conditions.append(SoilPrediction.user_id == user_id)
        
        if is_flagged is not None:
            conditions.append(SoilPrediction.is_flagged == is_flagged)
        
        if fertility_status:
            conditions.append(SoilPrediction.fertility_prediction == fertility_status)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))
        
        # Apply sorting
        if hasattr(SoilPrediction, sort_by):
            sort_column = getattr(SoilPrediction, sort_by)
            if sort_order == "desc":
                stmt = stmt.order_by(desc(sort_column))
            else:
                stmt = stmt.order_by(sort_column)
        
        # Apply pagination
        offset = (page - 1) * size
        stmt = stmt.offset(offset).limit(size)
        
        # Execute queries
        predictions_result = await db.execute(stmt)
        predictions = predictions_result.scalars().all()
        
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Convert to response format
        prediction_list = [
            AdminPredictionResponse(
                id=pred.id,
                user_id=pred.user_id,
                username=pred.user.username,
                user_email=pred.user.email,
                simplified_texture=pred.simplified_texture,
                soil_ph=float(pred.soil_ph) if pred.soil_ph else None,
                nitrogen=float(pred.nitrogen) if pred.nitrogen else None,
                phosphorus=float(pred.phosphorus) if pred.phosphorus else None,
                potassium=float(pred.potassium) if pred.potassium else None,
                fertility_prediction=pred.fertility_prediction,
                fertility_confidence=float(pred.fertility_confidence) if pred.fertility_confidence else None,
                fertilizer_recommendation=pred.fertilizer_recommendation,
                fertilizer_confidence=float(pred.fertilizer_confidence) if pred.fertilizer_confidence else None,
                is_flagged=pred.is_flagged or False,
                admin_notes=pred.admin_notes,
                created_at=pred.created_at,
                location_name=pred.location_name
            )
            for pred in predictions
        ]
        
        return AdminPredictionListResponse(
            predictions=prediction_list,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
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
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Update prediction by admin (flag/unflag, add notes)"""
    logger.info(f"Admin prediction update by: {current_user.username}")
    
    try:
        # Get prediction with user
        stmt = select(SoilPrediction).options(selectinload(SoilPrediction.user)).where(SoilPrediction.id == prediction_id)
        result = await db.execute(stmt)
        prediction = result.scalar_one_or_none()
        
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction not found"
            )
        
        # Update fields
        changes = {}
        if prediction_update.is_flagged is not None:
            changes["is_flagged"] = prediction_update.is_flagged
            prediction.is_flagged = prediction_update.is_flagged
        
        if prediction_update.admin_notes is not None:
            changes["admin_notes"] = prediction_update.admin_notes
            prediction.admin_notes = prediction_update.admin_notes
        
        await db.commit()
        await db.refresh(prediction)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="update_prediction",
            request=request,
            target_prediction_id=prediction.id,
            target_user_id=prediction.user_id,
            details={"changes": changes}
        )
        
        logger.info(f"Prediction updated by admin: {prediction_id}")
        
        return AdminPredictionResponse(
            id=prediction.id,
            user_id=prediction.user_id,
            username=prediction.user.username,
            user_email=prediction.user.email,
            simplified_texture=prediction.simplified_texture,
            soil_ph=float(prediction.soil_ph) if prediction.soil_ph else None,
            nitrogen=float(prediction.nitrogen) if prediction.nitrogen else None,
            phosphorus=float(prediction.phosphorus) if prediction.phosphorus else None,
            potassium=float(prediction.potassium) if prediction.potassium else None,
            fertility_prediction=prediction.fertility_prediction,
            fertility_confidence=float(prediction.fertility_confidence) if prediction.fertility_confidence else None,
            fertilizer_recommendation=prediction.fertilizer_recommendation,
            fertilizer_confidence=float(prediction.fertilizer_confidence) if prediction.fertilizer_confidence else None,
            is_flagged=prediction.is_flagged or False,
            admin_notes=prediction.admin_notes,
            created_at=prediction.created_at,
            location_name=prediction.location_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update prediction"
        )

@router.delete("/{prediction_id}")
async def delete_prediction_by_admin(
    prediction_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Delete prediction by admin"""
    logger.info(f"Admin prediction deletion by: {current_user.username}")
    
    try:
        # Get prediction
        stmt = select(SoilPrediction).options(selectinload(SoilPrediction.user)).where(SoilPrediction.id == prediction_id)
        result = await db.execute(stmt)
        prediction = result.scalar_one_or_none()
        
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction not found"
            )
        
        # Store prediction info for logging
        prediction_info = {
            "user_id": str(prediction.user_id),
            "username": prediction.user.username,
            "fertility_prediction": prediction.fertility_prediction,
            "created_at": prediction.created_at.isoformat()
        }
        
        # Delete prediction
        await db.delete(prediction)
        await db.commit()
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="delete_prediction",
            request=request,
            target_user_id=prediction.user_id,
            details={"deleted_prediction": prediction_info}
        )
        
        logger.info(f"Prediction deleted by admin: {prediction_id}")
        return {"message": "Prediction deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prediction"
        )