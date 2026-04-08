"""
Admin statistics endpoints using service layer
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.schema.auth_schema import UserStatsResponse
from api.services.admin.statistics_service import AdminStatisticsService
from api.utils.auth import get_current_admin_user
from api.utils.auth import get_current_admin_user
from api.services.auth.auth_manager import AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency to get statistics service
async def get_statistics_service(db: AsyncSession = Depends(get_db)) -> AdminStatisticsService:
    return AdminStatisticsService(db)

@router.get("", response_model=UserStatsResponse)
async def get_user_statistics(
    current_user: User = Depends(get_current_admin_user),
    stats_service: AdminStatisticsService = Depends(get_statistics_service),
    request: Request = None
):
    """Get comprehensive user statistics (admin only)"""
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=stats_service.db,
            admin_user_id=current_user.id,
            action="view_statistics",
            request=request
        )
        
        # Delegate to service
        return await stats_service.get_user_statistics()
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch statistics"
        )