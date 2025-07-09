"""
Admin statistics endpoints
"""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from api.db.connection import get_db
from api.db.models.database import User, SoilPrediction
from api.schema.auth_schema import UserStatsResponse
from api.utils.auth import get_current_admin_user, AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=UserStatsResponse)
async def get_user_statistics(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Get comprehensive user statistics (admin only)"""
    logger.info(f"Admin stats accessed by: {current_user.username}")
    
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="view_statistics",
            request=request
        )
        
        # Get user counts
        total_users_result = await db.execute(select(func.count(User.id)))
        total_users = total_users_result.scalar()
        
        active_users_result = await db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        active_users = active_users_result.scalar()
        
        verified_users_result = await db.execute(
            select(func.count(User.id)).where(User.is_verified == True)
        )
        verified_users = verified_users_result.scalar()
        
        # Get users by role
        users_by_role_result = await db.execute(
            select(User.role, func.count(User.id)).group_by(User.role)
        )
        users_by_role = {role.value: count for role, count in users_by_role_result.all()}
        
        # Get recent registrations (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_registrations_result = await db.execute(
            select(func.count(User.id)).where(User.created_at >= week_ago)
        )
        recent_registrations = recent_registrations_result.scalar()
        
        # Get total predictions
        total_predictions_result = await db.execute(select(func.count(SoilPrediction.id)))
        total_predictions = total_predictions_result.scalar()
        
        return UserStatsResponse(
            total_users=total_users,
            active_users=active_users,
            verified_users=verified_users,
            users_by_role=users_by_role,
            recent_registrations=recent_registrations,
            total_predictions=total_predictions
        )
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch statistics"
        )