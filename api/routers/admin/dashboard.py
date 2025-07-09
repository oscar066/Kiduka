"""
Admin dashboard endpoints
"""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload

from api.db.connection import get_db
from api.db.models.database import User, SoilPrediction, Agrovet, AdminAuditLog
from api.schema.auth_schema import (
    AdminUserResponse, AdminDashboardResponse, AdminDashboardStats,
    AdminPredictionResponse, AuditLogEntry, UserRoleEnum
)
from api.utils.auth import get_current_admin_user, AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=AdminDashboardResponse)
async def get_admin_dashboard(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Get admin dashboard with comprehensive statistics"""
    logger.info(f"Admin dashboard accessed by: {current_user.username}")
    
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="view_dashboard",
            request=request
        )
        
        # Get user statistics
        total_users_result = await db.execute(select(func.count(User.id)))
        total_users = total_users_result.scalar()
        
        active_users_result = await db.execute(
            select(func.count(User.id)).where(User.is_active == True)
        )
        active_users = active_users_result.scalar()
        
        # Get prediction statistics
        total_predictions_result = await db.execute(select(func.count(SoilPrediction.id)))
        total_predictions = total_predictions_result.scalar()
        
        flagged_predictions_result = await db.execute(
            select(func.count(SoilPrediction.id)).where(SoilPrediction.is_flagged == True)
        )
        flagged_predictions = flagged_predictions_result.scalar()
        
        # Get recent counts (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        recent_users_result = await db.execute(
            select(func.count(User.id)).where(User.created_at >= week_ago)
        )
        recent_users = recent_users_result.scalar()
        
        recent_predictions_result = await db.execute(
            select(func.count(SoilPrediction.id)).where(SoilPrediction.created_at >= week_ago)
        )
        recent_predictions = recent_predictions_result.scalar()
        
        # Get users by role
        users_by_role_result = await db.execute(
            select(User.role, func.count(User.id)).group_by(User.role)
        )
        users_by_role = {role.value: count for role, count in users_by_role_result.all()}
        
        # Get predictions by fertility status
        predictions_by_status_result = await db.execute(
            select(SoilPrediction.fertility_prediction, func.count(SoilPrediction.id))
            .group_by(SoilPrediction.fertility_prediction)
        )
        predictions_by_status = {status or "Unknown": count for status, count in predictions_by_status_result.all()}
        
        # Get recent users (last 10)
        recent_users_stmt = (
            select(User)
            .order_by(desc(User.created_at))
            .limit(10)
        )
        recent_users_result = await db.execute(recent_users_stmt)
        recent_users_data = recent_users_result.scalars().all()
        
        # Get recent predictions (last 10)
        recent_predictions_stmt = (
            select(SoilPrediction)
            .options(selectinload(SoilPrediction.user))
            .order_by(desc(SoilPrediction.created_at))
            .limit(10)
        )
        recent_predictions_result = await db.execute(recent_predictions_stmt)
        recent_predictions_data = recent_predictions_result.scalars().all()
        
        # Get recent audit logs (last 10)
        recent_logs_stmt = (
            select(AdminAuditLog)
            .options(selectinload(AdminAuditLog.admin_user))
            .options(selectinload(AdminAuditLog.target_user))
            .order_by(desc(AdminAuditLog.created_at))
            .limit(10)
        )
        recent_logs_result = await db.execute(recent_logs_stmt)
        recent_logs_data = recent_logs_result.scalars().all()
        
        # Build response
        stats = AdminDashboardStats(
            total_users=total_users,
            active_users=active_users,
            total_predictions=total_predictions,
            flagged_predictions=flagged_predictions,
            recent_users=recent_users,
            recent_predictions=recent_predictions,
            users_by_role=users_by_role,
            predictions_by_status=predictions_by_status
        )
        
        # Convert recent users
        recent_users_list = [
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
        
        # Convert recent predictions
        recent_predictions_list = [
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
        
        # Convert recent audit logs
        recent_logs_list = [
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
        
        return AdminDashboardResponse(
            stats=stats,
            recent_users=recent_users_list,
            recent_predictions=recent_predictions_list,
            recent_audit_logs=recent_logs_list
        )
        
    except Exception as e:
        logger.error(f"Error fetching admin dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard data"
        )