"""
Admin routes for user and data management
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_, and_, update, delete
from sqlalchemy.orm import selectinload

from api.db.connection import get_db
from api.models.database import User, SoilPrediction, Agrovet, AdminAuditLog, UserRole
from api.schema.auth_schema import (
    AdminUserCreate, AdminUserResponse, AdminUserUpdate, UserListResponse,
    UserStatsResponse, AuditLogResponse, AuditLogEntry, AdminPasswordReset,
    AdminDashboardResponse, AdminDashboardStats, AdminPredictionResponse,
    AdminPredictionUpdate, AdminPredictionListResponse, UserRoleEnum
)
from api.schema.schema import AgrovetInfo
from api.utils.auth import (
    get_current_admin_user, get_current_super_admin_user, AuthManager,
    PermissionChecker, log_admin_action
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================

@router.get("/dashboard", response_model=AdminDashboardResponse)
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

# ============================================================================
# USER MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/users", response_model=UserListResponse)
async def get_all_users(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    search: Optional[str] = Query(None, description="Search by username or email"),
    role: Optional[UserRoleEnum] = Query(None, description="Filter by role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order")
):
    """Get all users with filtering and pagination"""
    logger.info(f"Admin user list accessed by: {current_user.username}")
    
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="view_all_users",
            request=request,
            details={"search": search, "role": role, "is_active": is_active}
        )
        
        # Build base query
        stmt = select(User)
        count_stmt = select(func.count(User.id))
        
        # Apply filters
        conditions = []
        
        if search:
            search_condition = or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%")
            )
            conditions.append(search_condition)
        
        if role:
            conditions.append(User.role == UserRole(role.value))
        
        if is_active is not None:
            conditions.append(User.is_active == is_active)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))
        
        # Apply sorting
        if hasattr(User, sort_by):
            sort_column = getattr(User, sort_by)
            if sort_order == "desc":
                stmt = stmt.order_by(desc(sort_column))
            else:
                stmt = stmt.order_by(sort_column)
        
        # Apply pagination
        offset = (page - 1) * size
        stmt = stmt.offset(offset).limit(size)
        
        # Execute queries
        users_result = await db.execute(stmt)
        users = users_result.scalars().all()
        
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Get prediction counts for each user
        user_ids = [user.id for user in users]
        if user_ids:
            prediction_counts_result = await db.execute(
                select(SoilPrediction.user_id, func.count(SoilPrediction.id))
                .where(SoilPrediction.user_id.in_(user_ids))
                .group_by(SoilPrediction.user_id)
            )
            prediction_counts = dict(prediction_counts_result.all())
        else:
            prediction_counts = {}
        
        # Convert to response format
        user_list = [
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
                notes=user.notes,
                prediction_count=prediction_counts.get(user.id, 0)
            )
            for user in users
        ]
        
        return UserListResponse(
            users=user_list,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    user_data: AdminUserCreate,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Create a new user (admin only)"""
    logger.info(f"Admin user creation by: {current_user.username}")
    
    # Check permissions for role assignment
    if user_data.role in [UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN]:
        if not current_user.is_super_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admins can create admin users"
            )
    
    try:
        # Check if user already exists
        existing_user = await db.execute(
            select(User).where(
                or_(User.email == user_data.email, User.username == user_data.username)
            )
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email or username already exists"
            )
        
        # Create new user
        hashed_password = AuthManager.get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role=UserRole(user_data.role.value),
            is_active=True,
            is_verified=True,  # Admin-created users are auto-verified
            created_by=current_user.id,
            notes=user_data.notes
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="create_user",
            request=request,
            target_user_id=db_user.id,
            details={
                "username": db_user.username,
                "email": db_user.email,
                "role": db_user.role.value
            }
        )
        
        logger.info(f"User created by admin: {db_user.username}")
        
        return AdminUserResponse(
            id=db_user.id,
            email=db_user.email,
            username=db_user.username,
            full_name=db_user.full_name,
            role=UserRoleEnum(db_user.role.value),
            is_active=db_user.is_active,
            is_verified=db_user.is_verified,
            created_at=db_user.created_at,
            updated_at=db_user.updated_at,
            last_login=db_user.last_login,
            created_by=db_user.created_by,
            notes=db_user.notes
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user_by_admin(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Get user details by ID (admin only)"""
    logger.info(f"Admin user detail access by: {current_user.username}")
    
    try:
        user = await AuthManager.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="view_user_detail",
            request=request,
            target_user_id=user.id
        )
        
        # Get prediction count
        prediction_count_result = await db.execute(
            select(func.count(SoilPrediction.id)).where(SoilPrediction.user_id == user.id)
        )
        prediction_count = prediction_count_result.scalar()
        
        return AdminUserResponse(
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
            notes=user.notes,
            prediction_count=prediction_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user details"
        )

@router.put("/users/{user_id}", response_model=AdminUserResponse)
async def update_user_by_admin(
    user_id: str,
    user_update: AdminUserUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Update user by admin"""
    logger.info(f"Admin user update by: {current_user.username}")
    
    try:
        target_user = await AuthManager.get_user_by_id(db, user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check permissions
        if not PermissionChecker.can_edit_user(current_user, target_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to edit this user"
            )
        
        # Check role assignment permissions
        if user_update.role and user_update.role in [UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN]:
            if not current_user.is_super_admin():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only super admins can assign admin roles"
                )
        
        # Check for conflicts if updating email or username
        changes = {}
        
        if user_update.email and user_update.email != target_user.email:
            existing = await AuthManager.get_user_by_email(db, user_update.email)
            if existing and existing.id != target_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            changes["email"] = user_update.email
            target_user.email = user_update.email
        
        if user_update.username and user_update.username != target_user.username:
            existing = await AuthManager.get_user_by_username(db, user_update.username)
            if existing and existing.id != target_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            changes["username"] = user_update.username
            target_user.username = user_update.username
        
        # Update other fields
        if user_update.full_name is not None:
            changes["full_name"] = user_update.full_name
            target_user.full_name = user_update.full_name
        
        if user_update.is_active is not None:
            changes["is_active"] = user_update.is_active
            target_user.is_active = user_update.is_active
        
        if user_update.is_verified is not None:
            changes["is_verified"] = user_update.is_verified
            target_user.is_verified = user_update.is_verified
        
        if user_update.role is not None:
            changes["role"] = user_update.role.value
            target_user.role = UserRole(user_update.role.value)
        
        if user_update.notes is not None:
            changes["notes"] = user_update.notes
            target_user.notes = user_update.notes
        
        await db.commit()
        await db.refresh(target_user)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="update_user",
            request=request,
            target_user_id=target_user.id,
            details={"changes": changes}
        )
        
        logger.info(f"User updated by admin: {target_user.username}")
        
        return AdminUserResponse(
            id=target_user.id,
            email=target_user.email,
            username=target_user.username,
            full_name=target_user.full_name,
            role=UserRoleEnum(target_user.role.value),
            is_active=target_user.is_active,
            is_verified=target_user.is_verified,
            created_at=target_user.created_at,
            updated_at=target_user.updated_at,
            last_login=target_user.last_login,
            created_by=target_user.created_by,
            notes=target_user.notes
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.post("/users/{user_id}/reset-password")
async def reset_user_password_by_admin(
    user_id: str,
    password_data: AdminPasswordReset,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Reset user password by admin (no current password required)"""
    logger.info(f"Admin password reset by: {current_user.username}")
    
    try:
        target_user = await AuthManager.get_user_by_id(db, user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check permissions
        if not PermissionChecker.can_edit_user(current_user, target_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to reset this user's password"
            )
        
        # Update password
        target_user.hashed_password = AuthManager.get_password_hash(password_data.new_password)
        await db.commit()
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="reset_user_password",
            request=request,
            target_user_id=target_user.id
        )
        
        logger.info(f"Password reset by admin for user: {target_user.username}")
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error resetting password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.delete("/users/{user_id}")
async def delete_user_by_admin(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Delete user by admin"""
    logger.info(f"Admin user deletion by: {current_user.username}")
    
    try:
        target_user = await AuthManager.get_user_by_id(db, user_id)
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check permissions
        if not PermissionChecker.can_delete_user(current_user, target_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete this user"
            )
        
        # Store user info for logging
        user_info = {
            "username": target_user.username,
            "email": target_user.email,
            "role": target_user.role.value
        }
        
        # Delete user (cascade will handle related records)
        await db.delete(target_user)
        await db.commit()
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="delete_user",
            request=request,
            details={"deleted_user": user_info}
        )
        
        logger.info(f"User deleted by admin: {user_info['username']}")
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

# ============================================================================
# PREDICTION MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/predictions", response_model=AdminPredictionListResponse)
async def get_all_predictions(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    is_flagged: Optional[bool] = Query(None, description="Filter by flagged status"),
    fertility_status: Optional[str] = Query(None, description="Filter by fertility status"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order")
):
    """Get all predictions with filtering and pagination (admin only)"""
    logger.info(f"Admin predictions list accessed by: {current_user.username}")
    
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="view_all_predictions",
            request=request,
            details={"user_id": user_id, "is_flagged": is_flagged, "fertility_status": fertility_status}
        )
        
        # Build base query
        stmt = select(SoilPrediction).options(selectinload(SoilPrediction.user))
        count_stmt = select(func.count(SoilPrediction.id))
        
        # Apply filters
        conditions = []
        
        if user_id:
            conditions.append(SoilPrediction.user_id == user_id)
        
        if is_flagged is not None:
            conditions.append(SoilPrediction.is_flagged == is_flagged)
        
        if fertility_status:
            conditions.append(SoilPrediction.fertility_prediction == fertility_status)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))
        
        # Apply sorting
        if hasattr(SoilPrediction, sort_by):
            sort_column = getattr(SoilPrediction, sort_by)
            if sort_order == "desc":
                stmt = stmt.order_by(desc(sort_column))
            else:
                stmt = stmt.order_by(sort_column)
        
        # Apply pagination
        offset = (page - 1) * size
        stmt = stmt.offset(offset).limit(size)
        
        # Execute queries
        predictions_result = await db.execute(stmt)
        predictions = predictions_result.scalars().all()
        
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Convert to response format
        prediction_list = [
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
            for pred in predictions
        ]
        
        return AdminPredictionListResponse(
            predictions=prediction_list,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    except Exception as e:
        logger.error(f"Error fetching predictions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch predictions"
        )

@router.put("/predictions/{prediction_id}", response_model=AdminPredictionResponse)
async def update_prediction_by_admin(
    prediction_id: str,
    prediction_update: AdminPredictionUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Update prediction by admin (flag/unflag, add notes)"""
    logger.info(f"Admin prediction update by: {current_user.username}")
    
    try:
        # Get prediction with user
        stmt = select(SoilPrediction).options(selectinload(SoilPrediction.user)).where(SoilPrediction.id == prediction_id)
        result = await db.execute(stmt)
        prediction = result.scalar_one_or_none()
        
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction not found"
            )
        
        # Update fields
        changes = {}
        if prediction_update.is_flagged is not None:
            changes["is_flagged"] = prediction_update.is_flagged
            prediction.is_flagged = prediction_update.is_flagged
        
        if prediction_update.admin_notes is not None:
            changes["admin_notes"] = prediction_update.admin_notes
            prediction.admin_notes = prediction_update.admin_notes
        
        await db.commit()
        await db.refresh(prediction)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="update_prediction",
            request=request,
            target_prediction_id=prediction.id,
            target_user_id=prediction.user_id,
            details={"changes": changes}
        )
        
        logger.info(f"Prediction updated by admin: {prediction_id}")
        
        return AdminPredictionResponse(
            id=prediction.id,
            user_id=prediction.user_id,
            username=prediction.user.username,
            user_email=prediction.user.email,
            simplified_texture=prediction.simplified_texture,
            soil_ph=float(prediction.soil_ph) if prediction.soil_ph else None,
            nitrogen=float(prediction.nitrogen) if prediction.nitrogen else None,
            phosphorus=float(prediction.phosphorus) if prediction.phosphorus else None,
            potassium=float(prediction.potassium) if prediction.potassium else None,
            fertility_prediction=prediction.fertility_prediction,
            fertility_confidence=float(prediction.fertility_confidence) if prediction.fertility_confidence else None,
            fertilizer_recommendation=prediction.fertilizer_recommendation,
            fertilizer_confidence=float(prediction.fertilizer_confidence) if prediction.fertilizer_confidence else None,
            is_flagged=prediction.is_flagged or False,
            admin_notes=prediction.admin_notes,
            created_at=prediction.created_at,
            location_name=prediction.location_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update prediction"
        )

@router.delete("/predictions/{prediction_id}")
async def delete_prediction_by_admin(
    prediction_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Delete prediction by admin"""
    logger.info(f"Admin prediction deletion by: {current_user.username}")
    
    try:
        # Get prediction
        stmt = select(SoilPrediction).options(selectinload(SoilPrediction.user)).where(SoilPrediction.id == prediction_id)
        result = await db.execute(stmt)
        prediction = result.scalar_one_or_none()
        
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction not found"
            )
        
        # Store prediction info for logging
        prediction_info = {
            "user_id": str(prediction.user_id),
            "username": prediction.user.username,
            "fertility_prediction": prediction.fertility_prediction,
            "created_at": prediction.created_at.isoformat()
        }
        
        # Delete prediction
        await db.delete(prediction)
        await db.commit()
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="delete_prediction",
            request=request,
            target_user_id=prediction.user_id,
            details={"deleted_prediction": prediction_info}
        )
        
        logger.info(f"Prediction deleted by admin: {prediction_id}")
        return {"message": "Prediction deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prediction"
        )

# ============================================================================
# AUDIT LOG ENDPOINTS
# ============================================================================

@router.get("/audit-logs", response_model=AuditLogResponse)
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

# ============================================================================
# STATISTICS ENDPOINTS
# ============================================================================

@router.get("/stats", response_model=UserStatsResponse)
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

# ============================================================================
# AGROVET MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/agrovets")
async def get_all_agrovets(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_verified: Optional[bool] = Query(None, description="Filter by verified status")
):
    """Get all agrovets with filtering (admin only)"""
    logger.info(f"Admin agrovets list accessed by: {current_user.username}")
    
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="view_all_agrovets",
            request=request
        )
        
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
        agrovets_result = await db.execute(stmt)
        agrovets = agrovets_result.scalars().all()
        
        count_result = await db.execute(count_stmt)
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch agrovets"
        )

@router.put("/agrovets/{agrovet_id}")
async def update_agrovet_by_admin(
    agrovet_id: str,
    agrovet_update: dict,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Update agrovet by admin"""
    logger.info(f"Admin agrovet update by: {current_user.username}")
    
    try:
        agrovet = await db.execute(select(Agrovet).where(Agrovet.id == agrovet_id))
        agrovet = agrovet.scalar_one_or_none()
        
        if not agrovet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agrovet not found"
            )
        
        # Update allowed fields
        changes = {}
        updatable_fields = ['is_active', 'is_verified', 'admin_notes', 'name', 'address', 'phone', 'email', 'rating']
        
        for field in updatable_fields:
            if field in agrovet_update:
                changes[field] = agrovet_update[field]
                setattr(agrovet, field, agrovet_update[field])
        
        await db.commit()
        await db.refresh(agrovet)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="update_agrovet",
            request=request,
            target_agrovet_id=agrovet.id,
            details={"changes": changes}
        )
        
        logger.info(f"Agrovet updated by admin: {agrovet_id}")
        return {"message": "Agrovet updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating agrovet: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update agrovet"
        )