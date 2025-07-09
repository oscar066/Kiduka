"""
Admin audit service - handles audit log operations
"""
import logging
from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from sqlalchemy.orm import selectinload

from api.db.models.database import AdminAuditLog
from api.schema.auth_schema import AuditLogResponse, AuditLogEntry

logger = logging.getLogger(__name__)

class AdminAuditService:
    """Service for admin audit log operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_audit_logs(
        self,
        page: int = 1,
        size: int = 20,
        admin_user_id: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> AuditLogResponse:
        """Get audit logs with filtering and pagination"""
        logger.info(f"Fetching audit logs with filters: admin_user_id={admin_user_id}, action={action}")
        
        try:
            # Build base query
            stmt = (
                select(AdminAuditLog)
                .options(selectinload(AdminAuditLog.admin_user))
                .options(selectinload(AdminAuditLog.target_user))
            )
            count_stmt = select(func.count(AdminAuditLog.id))
            
            # Apply filters
            conditions = []
            
            if admin_user_id:
                conditions.append(AdminAuditLog.admin_user_id == admin_user_id)
            
            if action:
                conditions.append(AdminAuditLog.action.ilike(f"%{action}%"))
            
            if start_date:
                conditions.append(AdminAuditLog.created_at >= start_date)
            
            if end_date:
                conditions.append(AdminAuditLog.created_at <= end_date)
            
            if conditions:
                stmt = stmt.where(and_(*conditions))
                count_stmt = count_stmt.where(and_(*conditions))
            
            # Apply sorting (most recent first)
            stmt = stmt.order_by(desc(AdminAuditLog.created_at))
            
            # Apply pagination
            offset = (page - 1) * size
            stmt = stmt.offset(offset).limit(size)
            
            # Execute queries
            logs_result = await self.db.execute(stmt)
            logs = logs_result.scalars().all()
            
            count_result = await self.db.execute(count_stmt)
            total = count_result.scalar()
            
            # Convert to response format
            log_list = [
                AuditLogEntry(
                    id=log.id,
                    admin_user_id=log.admin_user_id,
                    admin_username=log.admin_user.username,
                    target_user_id=log.target_user_id,
                    target_username=log.target_user.username if log.target_user else None,
                    action=log.action,
                    details=log.details,
                    ip_address=log.ip_address,
                    created_at=log.created_at
                )
                for log in logs
            ]
            
            return AuditLogResponse(
                logs=log_list,
                total=total,
                page=page,
                size=size,
                pages=(total + size - 1) // size
            )
            
        except Exception as e:
            logger.error(f"Error fetching audit logs: {e}")
            raise