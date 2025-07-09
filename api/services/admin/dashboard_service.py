"""
Admin dashboard service - aggregates data for dashboard
"""
import logging
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from typing import List

from api.db.models.database import User, SoilPrediction, Agrovet, AdminAuditLog
from api.schema.auth_schema import (
    AdminDashboardResponse, AdminDashboardStats, AdminUserResponse,
    AdminPredictionResponse, AuditLogEntry, UserRoleEnum
)

logger = logging.getLogger(__name__)

class AdminDashboardService:
    """Service for admin dashboard data aggregation"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_dashboard_data(self) -> AdminDashboardResponse:
        """Get comprehensive dashboard data"""
        logger.info("Fetching admin dashboard data")
        
        try:
            # Get statistics
            stats = await self._get_dashboard_stats()
            
            # Get recent data
            recent_users = await self._get_recent_users()
            recent_predictions = await self._get_recent_predictions()
            recent_audit_logs = await self._get_recent_audit_logs()
            
            return AdminDashboardResponse(
                stats=stats,
                recent_users=recent_users,
                recent_predictions=recent_predictions,
                recent_audit_logs=recent_audit_logs
            )
            
        except Exception as e:
            logger.error(f"Error fetching dashboard data: {e}")
            raise
    
    async def _get_dashboard_stats(self) -> AdminDashboardStats:
        """Get dashboard statistics"""
        # Get user statistics
        total_users_result = await self.db.execute(select(func.count(User.id)))
        total_users = total_users_result.scalar()
        
        active_users_result = await self.db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        active_users = active_users_result.scalar()
        
        # Get prediction statistics
        total_predictions_result = await self.db.execute(select(func.count(SoilPrediction.id)))
        total_predictions = total_predictions_result.scalar()
        
        flagged_predictions_result = await self.db.execute(
            select(func.count(SoilPrediction.id)).where(SoilPrediction.is_flagged == True)
        )
        flagged_predictions = flagged_predictions_result.scalar()
        
        # Get recent counts (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        recent_users_result = await self.db.execute(
            select(func.count(User.id)).where(User.created_at >= week_ago)
        )
        recent_users = recent_users_result.scalar()
        
        recent_predictions_result = await self.db.execute(
            select(func.count(SoilPrediction.id)).where(SoilPrediction.created_at >= week_ago)
        )
        recent_predictions = recent_predictions_result.scalar()
        
        # Get users by role
        users_by_role_result = await self.db.execute(
            select(User.role, func.count(User.id)).group_by(User.role)
        )
        users_by_role = {role.value: count for role, count in users_by_role_result.all()}
        
        # Get predictions by fertility status
        predictions_by_status_result = await self.db.execute(
            select(SoilPrediction.fertility_prediction, func.count(SoilPrediction.id))
            .group_by(SoilPrediction.fertility_prediction)
        )
        predictions_by_status = {
            status or "Unknown": count 
            for status, count in predictions_by_status_result.all()
        }
        
        return AdminDashboardStats(
            total_users=total_users,
            active_users=active_users,
            total_predictions=total_predictions,
            flagged_predictions=flagged_predictions,
            recent_users=recent_users,
            recent_predictions=recent_predictions,
            users_by_role=users_by_role,
            predictions_by_status=predictions_by_status
        )
    
    async def _get_recent_users(self, limit: int = 10) -> List[AdminUserResponse]:
        """Get recent users"""
        recent_users_stmt = (
            select(User)
            .order_by(desc(User.created_at))
            .limit(limit)
        )
        recent_users_result = await self.db.execute(recent_users_stmt)
        recent_users_data = recent_users_result.scalars().all()
        
        return [
            AdminUserResponse(
                id=user.id,
                email=user.email,
                username=user.username,
                full_name=user.full_name,
                role=UserRoleEnum(user.role.value),
                is_active=user.is_active,
                is_verified=user.is_verified,
                created_at=user.created_at,
                updated_at=user.updated_at,
                last_login=user.last_login,
                created_by=user.created_by,
                notes=user.notes
            )
            for user in recent_users_data
        ]
    
    async def _get_recent_predictions(self, limit: int = 10) -> List[AdminPredictionResponse]:
        """Get recent predictions"""
        recent_predictions_stmt = (
            select(SoilPrediction)
            .options(selectinload(SoilPrediction.user))
            .order_by(desc(SoilPrediction.created_at))
            .limit(limit)
        )
        recent_predictions_result = await self.db.execute(recent_predictions_stmt)
        recent_predictions_data = recent_predictions_result.scalars().all()
        
        return [
            AdminPredictionResponse(
                id=pred.id,
                user_id=pred.user_id,
                username=pred.user.username,
                user_email=pred.user.email,
                simplified_texture=pred.simplified_texture,
                soil_ph=float(pred.soil_ph) if pred.soil_ph else None,
                nitrogen=float(pred.nitrogen) if pred.nitrogen else None,
                phosphorus=float(pred.phosphorus) if pred.phosphorus else None,
                potassium=float(pred.potassium) if pred.potassium else None,
                fertility_prediction=pred.fertility_prediction,
                fertility_confidence=float(pred.fertility_confidence) if pred.fertility_confidence else None,
                fertilizer_recommendation=pred.fertilizer_recommendation,
                fertilizer_confidence=float(pred.fertilizer_confidence) if pred.fertilizer_confidence else None,
                is_flagged=pred.is_flagged or False,
                admin_notes=pred.admin_notes,
                created_at=pred.created_at,
                location_name=pred.location_name
            )
            for pred in recent_predictions_data
        ]
    
    async def _get_recent_audit_logs(self, limit: int = 10) -> List[AuditLogEntry]:
        """Get recent audit logs"""
        recent_logs_stmt = (
            select(AdminAuditLog)
            .options(selectinload(AdminAuditLog.admin_user))
            .options(selectinload(AdminAuditLog.target_user))
            .order_by(desc(AdminAuditLog.created_at))
            .limit(limit)
        )
        recent_logs_result = await self.db.execute(recent_logs_stmt)
        recent_logs_data = recent_logs_result.scalars().all()
        
        return [
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
            for log in recent_logs_data
        ]