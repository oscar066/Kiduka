"""
Admin dashboard endpoints using service layer
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.schema.auth_schema import AdminDashboardResponse
from api.services.admin.dashboard_service import AdminDashboardService
from api.utils.auth import get_current_admin_user, AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency to get dashboard service
async def get_dashboard_service(db: AsyncSession = Depends(get_db)) -> AdminDashboardService:
    return AdminDashboardService(db)

@router.get("", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    current_user: User = Depends(get_current_admin_user),
    dashboard_service: AdminDashboardService = Depends(get_dashboard_service),
    request: Request = None
):
    """Get admin dashboard with comprehensive statistics"""
    logger.info(f"Admin dashboard accessed by: {current_user.username}")
    
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=dashboard_service.db,
            admin_user_id=current_user.id,
            action="view_dashboard",
            request=request
        )
        
        # Delegate to service
        return await dashboard_service.get_dashboard_data()
        
    except Exception as e:
        logger.error(f"Error fetching admin dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard data"
        )