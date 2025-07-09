
"""
Admin user management endpoints
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_, and_
from sqlalchemy.orm import selectinload

from api.db.connection import get_db
from api.db.models.database import User, SoilPrediction, UserRole
from api.schema.auth_schema import (
    AdminUserCreate, AdminUserResponse, AdminUserUpdate, UserListResponse,
    AdminPasswordReset, UserRoleEnum
)
from api.utils.auth import (
    get_current_admin_user, AuthManager, PermissionChecker
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=UserListResponse)
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

@router.post("/", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
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

@router.get("/{user_id}", response_model=AdminUserResponse)
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

@router.put("/{user_id}", response_model=AdminUserResponse)
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

@router.post("/{user_id}/reset-password")
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

@router.delete("/{user_id}")
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