"""
Admin user management endpoints using service layer
"""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.schema.auth_schema import (
    AdminUserCreate, AdminUserResponse, AdminUserUpdate, UserListResponse,
    AdminPasswordReset, UserRoleEnum
)
from api.services.admin.user_service import AdminUserService
from api.utils.auth import get_current_admin_user
from api.utils.auth import get_current_admin_user
from api.services.auth.auth_manager import AuthManager

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency to get admin user service
async def get_admin_user_service(db: AsyncSession = Depends(get_db)) -> AdminUserService:
    return AdminUserService(db)

@router.get("", response_model=UserListResponse)
async def get_all_users(
    current_user: User = Depends(get_current_admin_user),
    user_service: AdminUserService = Depends(get_admin_user_service),
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
    try:
        # Log admin action
        await AuthManager.log_admin_action(
            db=user_service.db,
            admin_user_id=current_user.id,
            action="view_all_users",
            request=request,
            details={"search": search, "role": role, "is_active": is_active}
        )
        
        # Delegate to service
        return await user_service.get_users_with_filters(
            page=page,
            size=size,
            search=search,
            role=role,
            is_active=is_active,
            sort_by=sort_by,
            sort_order=sort_order
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
    user_service: AdminUserService = Depends(get_admin_user_service),
    request: Request = None
):
    """Create a new user (admin only)"""
    try:
        result = await user_service.create_user(user_data, current_user)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=user_service.db,
            admin_user_id=current_user.id,
            action="create_user",
            request=request,
            target_user_id=result.id,
            details={
                "username": result.username,
                "email": result.email,
                "role": result.role
            }
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

@router.get("/{user_id}", response_model=AdminUserResponse)
async def get_user_by_admin(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
    user_service: AdminUserService = Depends(get_admin_user_service),
    request: Request = None
):
    """Get user details by ID (admin only)"""
    try:
        result = await user_service.get_user_by_id(user_id)
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=user_service.db,
            admin_user_id=current_user.id,
            action="view_user_detail",
            request=request,
            target_user_id=result.id
        )
        
        return result
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
    user_service: AdminUserService = Depends(get_admin_user_service),
    request: Request = None
):
    """Update user by admin"""
    try:
        result = await user_service.update_user(user_id, user_update, current_user)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=user_service.db,
            admin_user_id=current_user.id,
            action="update_user",
            request=request,
            target_user_id=result.id,
            details={"updated_fields": user_update.model_dump(exclude_unset=True)}
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
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
    user_service: AdminUserService = Depends(get_admin_user_service),
    request: Request = None
):
    """Reset user password by admin (no current password required)"""
    try:
        await user_service.reset_user_password(user_id, password_data.new_password, current_user)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=user_service.db,
            admin_user_id=current_user.id,
            action="reset_user_password",
            request=request,
            target_user_id=user_id
        )
        
        return {"message": "Password reset successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.delete("/{user_id}")
async def delete_user_by_admin(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
    user_service: AdminUserService = Depends(get_admin_user_service),
    request: Request = None
):
    """Delete user by admin"""
    try:
        result = await user_service.delete_user(user_id, current_user)
        
        # Log admin action
        await AuthManager.log_admin_action(
            db=user_service.db,
            admin_user_id=current_user.id,
            action="delete_user",
            request=request,
            details=result
        )
        
        return {"message": "User deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )