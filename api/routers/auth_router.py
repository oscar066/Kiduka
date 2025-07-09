"""
Enhanced authentication routes with role-based access control
"""
import logging
from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from api.db.connection import get_db
from api.db.models.database import User, UserRole
from api.schema.auth_schema import (
    UserCreate, UserLogin, UserResponse, UserUpdate, 
    Token, PasswordChange, UserRoleEnum
)
from api.utils.auth import AuthManager, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user (always creates regular user)"""
    logger.info(f"Registration attempt for user: {user_data.username}")
    
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
    
    # Create new user (always as regular user via public registration)
    try:
        hashed_password = AuthManager.get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            role=UserRole.USER,  # Always USER role for public registration
            is_active=True,
            is_verified=False  # Requires email verification or admin approval
        )
        
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
        logger.info(f"User registered successfully: {db_user.username}")
        return UserResponse(
            id=db_user.id,
            email=db_user.email,
            username=db_user.username,
            full_name=db_user.full_name,
            role=UserRoleEnum(db_user.role.value),
            is_active=db_user.is_active,
            is_verified=db_user.is_verified,
            created_at=db_user.created_at,
            updated_at=db_user.updated_at,
            last_login=db_user.last_login
        )
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )

@router.post("/login", response_model=Token)
async def login_user(
    user_credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return access token with role information"""
    logger.info(f"Login attempt for: {user_credentials.username_or_email}")
    
    user = await AuthManager.authenticate_user(
        db, user_credentials.username_or_email, user_credentials.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated"
        )
    
    # Create access token with role information
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthManager.create_access_token(
        data={
            "sub": str(user.id), 
            "username": user.username,
            "role": user.role.value
        },
        expires_delta=access_token_expires
    )
    
    logger.info(f"User logged in successfully: {user.username} (role: {user.role.value})")
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_role=UserRoleEnum(user.role.value)
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        role=UserRoleEnum(current_user.role.value),
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        last_login=current_user.last_login
    )

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user information (users can only update basic info)"""
    logger.info(f"User update request for: {current_user.username}")
    
    try:
        # Check for conflicts if updating email or username
        if user_update.email and user_update.email != current_user.email:
            existing = await AuthManager.get_user_by_email(db, user_update.email)
            if existing and existing.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            current_user.email = user_update.email
        
        if user_update.username and user_update.username != current_user.username:
            existing = await AuthManager.get_user_by_username(db, user_update.username)
            if existing and existing.id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
            current_user.username = user_update.username
        
        # Update other basic fields (users cannot change role or admin fields)
        if user_update.full_name is not None:
            current_user.full_name = user_update.full_name
        
        # Regular users cannot change is_active status (only admins can)
        # user_update.is_active is ignored for regular users
        
        await db.commit()
        await db.refresh(current_user)
        
        logger.info(f"User updated successfully: {current_user.username}")
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            full_name=current_user.full_name,
            role=UserRoleEnum(current_user.role.value),
            is_active=current_user.is_active,
            is_verified=current_user.is_verified,
            created_at=current_user.created_at,
            updated_at=current_user.updated_at,
            last_login=current_user.last_login
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

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""
    logger.info(f"Password change request for: {current_user.username}")
    
    # Verify current password
    if not AuthManager.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    try:
        # Update password
        current_user.hashed_password = AuthManager.get_password_hash(password_data.new_password)
        await db.commit()
        
        logger.info(f"Password changed successfully for: {current_user.username}")
        return {"message": "Password changed successfully"}
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

@router.delete("/me")
async def delete_current_user(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete current user account (users can delete their own accounts)"""
    logger.info(f"User deletion request for: {current_user.username}")
    
    try:
        await db.delete(current_user)
        await db.commit()
        
        logger.info(f"User deleted successfully: {current_user.username}")
        return {"message": "User account deleted successfully"}
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user account"
        )

@router.get("/permissions")
async def get_user_permissions(
    current_user: User = Depends(get_current_user)
):
    """Get current user's permissions and role information"""
    permissions = {
        "role": current_user.role.value,
        "is_admin": current_user.is_admin(),
        "is_super_admin": current_user.is_super_admin(),
        "can_view_admin_panel": current_user.is_admin(),
        "can_manage_users": current_user.is_admin(),
        "can_view_all_predictions": current_user.is_admin(),
        "can_view_audit_logs": current_user.is_admin(),
        "can_manage_agrovets": current_user.is_admin(),
        "can_create_admin_users": current_user.is_super_admin(),
        "can_delete_admin_users": current_user.is_super_admin()
    }
    
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "permissions": permissions
    }