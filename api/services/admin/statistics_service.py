"""
Admin statistics service - handles statistical calculations
"""
import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from api.db.models.database import User, SoilPrediction
from api.schema.auth_schema import UserStatsResponse

logger = logging.getLogger(__name__)

class AdminStatisticsService:
    """
    Service responsible for calculating and retrieving administrative statistics.
    
    Provides insights into user demographics, verification rates, and overall platform usage.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the AdminStatisticsService.
        
        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db
    
    async def get_user_statistics(self) -> UserStatsResponse:
        """
        Calculate comprehensive user and platform statistics.
        
        Aggregates metrics such as total users, active accounts, verified users,
        role distribution, recent registrations, and overall prediction volume.
        
        Returns:
            UserStatsResponse: A payload containing all calculated metrics.
            
        Raises:
            Exception: If an error occurs during the database aggregation queries.
        """
        logger.info("Calculating user statistics")
        
        try:
            # Get user counts
            total_users_result = await self.db.execute(select(func.count(User.id)))
            total_users = total_users_result.scalar()
            
            active_users_result = await self.db.execute(
                select(func.count(User.id)).where(User.is_active == True)
            )
            active_users = active_users_result.scalar()
            
            verified_users_result = await self.db.execute(
                select(func.count(User.id)).where(User.is_verified == True)
            )
            verified_users = verified_users_result.scalar()
            
            # Get users by role
            users_by_role_result = await self.db.execute(
                select(User.role, func.count(User.id)).group_by(User.role)
            )
            users_by_role = {role.value: count for role, count in users_by_role_result.all()}
            
            # Get recent registrations (last 7 days)
            week_ago = datetime.utcnow() - timedelta(days=7)
            recent_registrations_result = await self.db.execute(
                select(func.count(User.id)).where(User.created_at >= week_ago)
            )
            recent_registrations = recent_registrations_result.scalar()
            
            # Get total predictions
            total_predictions_result = await self.db.execute(select(func.count(SoilPrediction.id)))
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
            logger.error(f"Error calculating statistics: {e}")
            raise