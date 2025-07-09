"""
Admin audit log endpoints
"""
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from sqlalchemy.orm import selectinload

from api.db.connection import get_db
from api.db.models.database import User, AdminAuditLog
from api.schema.auth_schema import AuditLogResponse, AuditLogEntry
from api.utils.auth import get_current_admin_user, AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=AuditLogResponse)
async def get_audit_logs(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    admin_user_id: Optional[str] = Query(None, description="Filter by admin user ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    start_date: Optional[datetime] = Query(None, description="Filter from date"),
    end_date: Optional[datetime] = Query(None, description="Filter to date")
):
    """Get audit logs (admin only)"""
    logger.info(f"Admin audit logs accessed by: {current_user.username}")
    
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="view_audit_logs",
            request=request
        )
        
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
        logs_result = await db.execute(stmt)
        logs = logs_result.scalars().all()
        
        count_result = await db.execute(count_stmt)
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch audit logs"
        )