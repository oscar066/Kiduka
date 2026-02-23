"""
Admin agrovet management endpoints using service layer
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.services.admin.agrovet_service import AdminAgrovetService
from api.utils.auth import get_current_admin_user, AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency to get agrovet service
async def get_agrovet_service(db: AsyncSession = Depends(get_db)) -> AdminAgrovetService:
    return AdminAgrovetService(db)

@router.get("")
async def get_all_agrovets(
    current_user: User = Depends(get_current_admin_user),
    agrovet_service: AdminAgrovetService = Depends(get_agrovet_service),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_verified: Optional[bool] = Query(None, description="Filter by verified status")
):
    """Get all agrovets with filtering (admin only)"""
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=agrovet_service.db,
            admin_user_id=current_user.id,
            action="view_all_agrovets",
            request=request
        )
        
        # Delegate to service
        return await agrovet_service.get_agrovets_with_filters(
            page=page,
            size=size,
            is_active=is_active,
            is_verified=is_verified
        )
        
    except Exception as e:
        logger.error(f"Error fetching agrovets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch agrovets"
        )

@router.put("/{agrovet_id}")
async def update_agrovet_by_admin(
    agrovet_id: str,
    agrovet_update: dict,
    current_user: User = Depends(get_current_admin_user),
    agrovet_service: AdminAgrovetService = Depends(get_agrovet_service),
    request: Request = None
):
    """Update agrovet by admin"""
    try:
        changes = await agrovet_service.update_agrovet(agrovet_id, agrovet_update, current_user)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=agrovet_service.db,
            admin_user_id=current_user.id,
            action="update_agrovet",
            request=request,
            target_agrovet_id=agrovet_id,
            details={"changes": changes}
        )
        
        return {"message": "Agrovet updated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating agrovet: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update agrovet"
        )