"""
Enhanced authentication routes using service layer pattern
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.schema.auth_schema import (
    UserCreate, UserLogin, UserResponse, UserUpdate, 
    Token, PasswordChange
)
from api.services.auth.auth_service import AuthService
from api.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency to get auth service
async def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """Dependency to get auth service instance"""
    return AuthService(db)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Register a new user (always creates regular user)"""
    try:
        return await auth_service.register_user(user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )

@router.post("/login", response_model=Token)
async def login_user(
    user_credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Authenticate user and return access token with role information"""
    try:
        token_data = await auth_service.login_user(user_credentials)
        return Token(**token_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )
    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    # Create a temporary service instance for conversion (no DB operations needed)
    auth_service = AuthService(None)
    return auth_service._user_to_response(current_user)

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Update current user information (users can only update basic info)"""
    try:
        return await auth_service.update_user(current_user, user_update)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Change user password"""
    try:
        await auth_service.change_password(
            current_user, 
            password_data.current_password, 
            password_data.new_password
        )
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

@router.delete("/me")
async def delete_current_user(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Delete current user account (users can delete their own accounts)"""
    try:
        await auth_service.delete_user(current_user)
        return {"message": "User account deleted successfully"}
    except Exception as e:
        logger.error(f"Unexpected error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user account"
        )

@router.get("/permissions")
async def get_user_permissions(
    current_user: User = Depends(get_current_user)
):
    """Get current user's permissions and role information"""
    # Create a temporary service instance (no DB operations needed)
    auth_service = AuthService(None)
    return auth_service.get_user_permissions(current_user)