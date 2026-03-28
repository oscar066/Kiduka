"""
Admin audit log endpoints using service layer
"""
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.schema.auth_schema import AuditLogResponse
from api.services.admin.audit_service import AdminAuditService
from api.utils.auth import get_current_admin_user, AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency to get audit service
async def get_audit_service(db: AsyncSession = Depends(get_db)) -> AdminAuditService:
    return AdminAuditService(db)

@router.get("", response_model=AuditLogResponse)
async def get_audit_logs(
    current_user: User = Depends(get_current_admin_user),
    audit_service: AdminAuditService = Depends(get_audit_service),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    admin_user_id: Optional[str] = Query(None, description="Filter by admin user ID"),
    action: Optional[str] = Query(None, description="Filter by action"),
    start_date: Optional[datetime] = Query(None, description="Filter from date"),
    end_date: Optional[datetime] = Query(None, description="Filter to date")
):
    """Get audit logs (admin only)"""
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=audit_service.db,
            admin_user_id=current_user.id,
            action="view_audit_logs",
            request=request
        )
        
        # Delegate to service
        return await audit_service.get_audit_logs(
            page=page,
            size=size,
            admin_user_id=admin_user_id,
            action=action,
            start_date=start_date,
            end_date=end_date
        )
        
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch audit logs"
        )