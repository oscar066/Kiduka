"""
Admin agrovet management endpoints
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from sqlalchemy.orm import selectinload

from api.db.connection import get_db
from api.db.models.database import User, Agrovet
from api.utils.auth import get_current_admin_user, AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/")
async def get_all_agrovets(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_verified: Optional[bool] = Query(None, description="Filter by verified status")
):
    """Get all agrovets with filtering (admin only)"""
    logger.info(f"Admin agrovets list accessed by: {current_user.username}")
    
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="view_all_agrovets",
            request=request
        )
        
        # Build query
        stmt = select(Agrovet).options(selectinload(Agrovet.creator))
        count_stmt = select(func.count(Agrovet.id))
        
        # Apply filters
        conditions = []
        if is_active is not None:
            conditions.append(Agrovet.is_active == is_active)
        if is_verified is not None:
            conditions.append(Agrovet.is_verified == is_verified)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))
        
        # Apply pagination
        offset = (page - 1) * size
        stmt = stmt.offset(offset).limit(size).order_by(desc(Agrovet.created_at))
        
        # Execute queries
        agrovets_result = await db.execute(stmt)
        agrovets = agrovets_result.scalars().all()
        
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Convert to response format
        agrovet_list = [
            {
                "id": agrovet.id,
                "name": agrovet.name,
                "latitude": float(agrovet.latitude),
                "longitude": float(agrovet.longitude),
                "products": agrovet.products,
                "prices": [float(p) for p in agrovet.prices] if agrovet.prices else [],
                "address": agrovet.address,
                "phone": agrovet.phone,
                "email": agrovet.email,
                "rating": float(agrovet.rating) if agrovet.rating else None,
                "services": agrovet.services,
                "is_active": agrovet.is_active,
                "is_verified": agrovet.is_verified,
                "admin_notes": agrovet.admin_notes,
                "created_by": agrovet.created_by,
                "creator_username": agrovet.creator.username if agrovet.creator else None,
                "created_at": agrovet.created_at,
                "updated_at": agrovet.updated_at
            }
            for agrovet in agrovets
        ]
        
        return {
            "agrovets": agrovet_list,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }
        
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
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Update agrovet by admin"""
    logger.info(f"Admin agrovet update by: {current_user.username}")
    
    try:
        agrovet = await db.execute(select(Agrovet).where(Agrovet.id == agrovet_id))
        agrovet = agrovet.scalar_one_or_none()
        
        if not agrovet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agrovet not found"
            )
        
        # Update allowed fields
        changes = {}
        updatable_fields = ['is_active', 'is_verified', 'admin_notes', 'name', 'address', 'phone', 'email', 'rating']
        
        for field in updatable_fields:
            if field in agrovet_update:
                changes[field] = agrovet_update[field]
                setattr(agrovet, field, agrovet_update[field])
        
        await db.commit()
        await db.refresh(agrovet)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="update_agrovet",
            request=request,
            target_agrovet_id=agrovet.id,
            details={"changes": changes}
        )
        
        logger.info(f"Agrovet updated by admin: {agrovet_id}")
        return {"message": "Agrovet updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating agrovet: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update agrovet"
        )