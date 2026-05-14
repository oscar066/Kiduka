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
    """
    FastAPI dependency that injects an AuthService instance.
    
    Args:
        db (AsyncSession): The asynchronous SQLAlchemy database session.
        
    Returns:
        AuthService: An initialized authentication service ready for use.
    """
    return AuthService(db)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Register a new standard user in the system.
    
    This endpoint always assigns the 'user' role. To create administrative users,
    the admin-specific registration endpoint must be used.
    
    Args:
        user_data (UserCreate): The registration payload containing email, username, and password.
        auth_service (AuthService): The injected authentication service.
        
    Returns:
        UserResponse: The newly created user object (excluding sensitive data like password hashes).
        
    Raises:
        HTTPException: If validation fails (e.g., username or email already exists) with status 400.
        HTTPException: If an unexpected server error occurs during creation with status 500.
    """
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
    """
    Authenticate a user and return a JWT access token.
    
    Args:
        user_credentials (UserLogin): The login payload containing username/email and password.
        auth_service (AuthService): The injected authentication service.
        
    Returns:
        Token: A JSON payload containing the JWT access token, token type, expiry time, and user role.
        
    Raises:
        HTTPException: If authentication fails (incorrect credentials) with status 401.
        HTTPException: If an unexpected error occurs during login with status 500.
    """
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
    """
    Retrieve the authenticated user's profile information.
    
    Args:
        current_user (User): The user object injected via the 'get_current_user' dependency.
        
    Returns:
        UserResponse: Serialized profile data for the authenticated user.
    """
    # Create a temporary service instance for conversion (no DB operations needed)
    auth_service = AuthService(None)
    return auth_service._user_to_response(current_user)

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Update the authenticated user's profile information.
    
    Standard users are only permitted to update basic fields (e.g., username, email, full_name).
    
    Args:
        user_update (UserUpdate): The subset of user fields to be modified.
        current_user (User): The authenticated user object.
        auth_service (AuthService): The injected authentication service.
        
    Returns:
        UserResponse: The newly updated profile data.
        
    Raises:
        HTTPException: If validation fails (e.g., email conflicts) with status 400.
        HTTPException: If an unexpected error occurs during the update process with status 500.
    """
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
    """
    Change the authenticated user's password.
    
    Requires the user to verify their current password before providing a new one.
    
    Args:
        password_data (PasswordChange): Payload containing the current and new passwords.
        current_user (User): The authenticated user object.
        auth_service (AuthService): The injected authentication service.
        
    Returns:
        dict: A simple success message.
        
    Raises:
        HTTPException: If the current password validation fails with status 400.
        HTTPException: If an unexpected error occurs with status 500.
    """
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
    """
    Permanently delete the authenticated user's account from the system.
    
    Args:
        current_user (User): The authenticated user object requesting deletion.
        auth_service (AuthService): The injected authentication service.
        
    Returns:
        dict: A simple success message upon successful deletion.
        
    Raises:
        HTTPException: If deletion fails for an unexpected reason with status 500.
    """
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
    """
    Retrieve the current user's role and system permissions.
    
    Args:
        current_user (User): The authenticated user.
        
    Returns:
        dict: Information regarding the user's role and feature-level access capabilities.
    """
    # Create a temporary service instance (no DB operations needed)
    auth_service = AuthService(None)
    return auth_service.get_user_permissions(current_user)