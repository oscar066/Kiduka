"""
Admin agrovet service - handles agrovet management operations
"""
import logging
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from sqlalchemy.orm import selectinload

from api.db.models.database import User, Agrovet

logger = logging.getLogger(__name__)

class AdminAgrovetService:
    """Service for admin agrovet management operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_agrovets_with_filters(
        self,
        page: int = 1,
        size: int = 20,
        is_active: Optional[bool] = None,
        is_verified: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Get agrovets with filtering and pagination"""
        logger.info(f"Fetching agrovets with filters: is_active={is_active}, is_verified={is_verified}")
        
        try:
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
            agrovets_result = await self.db.execute(stmt)
            agrovets = agrovets_result.scalars().all()
            
            count_result = await self.db.execute(count_stmt)
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
            raise
    
    async def update_agrovet(
        self, 
        agrovet_id: str, 
        agrovet_update: Dict[str, Any],
        updated_by: User
    ) -> None:
        """Update agrovet by admin"""
        logger.info(f"Updating agrovet {agrovet_id} by admin {updated_by.username}")
        
        try:
            agrovet_result = await self.db.execute(select(Agrovet).where(Agrovet.id == agrovet_id))
            agrovet = agrovet_result.scalar_one_or_none()
            
            if not agrovet:
                raise ValueError("Agrovet not found")
            
            # Update allowed fields
            changes = {}
            updatable_fields = ['is_active', 'is_verified', 'admin_notes', 'name', 'address', 'phone', 'email', 'rating']
            
            for field in updatable_fields:
                if field in agrovet_update:
                    changes[field] = agrovet_update[field]
                    setattr(agrovet, field, agrovet_update[field])
            
            await self.db.commit()
            await self.db.refresh(agrovet)
            
            logger.info(f"Agrovet updated by admin: {agrovet_id}")
            return changes
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating agrovet: {e}")
            raise