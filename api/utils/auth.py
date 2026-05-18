"""
Enhanced authentication utilities with role-based access control
"""
import os
import logging
from typing import Optional
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from api.db.connection import get_db
from api.db.models.database import User, UserRole
from api.services.auth.auth_manager import AuthManager
from api.services.auth.core import AuthSecurityManager

logger = logging.getLogger(__name__)

# HTTP Bearer token scheme
security = HTTPBearer()

# Role-based dependency functions
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency that validates the JWT and returns the current authenticated user.
    
    Args:
        credentials (HTTPAuthorizationCredentials): The Bearer token extracted from the request headers.
        db (AsyncSession): The database session.
        
    Returns:
        User: The authenticated SQLAlchemy User instance.
        
    Raises:
        HTTPException: If the token is invalid, missing, or the user is inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = AuthSecurityManager.verify_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception
    
    user = await AuthManager.get_user_by_id(db, token_data.user_id)
    if user is None:
        raise credentials_exception
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user

async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    FastAPI dependency that enforces admin-level access control.
    
    Args:
        current_user (User): The user resolved by `get_current_user`.
        
    Returns:
        User: The authenticated User, guaranteed to be at least an ADMIN.
        
    Raises:
        HTTPException: 403 Forbidden if the user is not an admin.
    """
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def get_current_super_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    FastAPI dependency that enforces strict super-admin access control.
    
    Args:
        current_user (User): The user resolved by `get_current_user`.
        
    Returns:
        User: The authenticated User, guaranteed to be a SUPER_ADMIN.
        
    Raises:
        HTTPException: 403 Forbidden if the user is not a super admin.
    """
    if not current_user.is_super_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin privileges required"
        )
    return current_user

# Optional authentication dependency (for endpoints that work with or without auth)
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    FastAPI dependency that returns a user if a valid token is provided, but does not error if missing.
    Useful for endpoints with mixed public/private behavior.
    
    Args:
        credentials (Optional[HTTPAuthorizationCredentials]): The Bearer token, if present.
        db (AsyncSession): The database session.
        
    Returns:
        Optional[User]: The authenticated User, or None if unauthenticated.
    """
    if not credentials:
        return None
    
    try:
        token_data = AuthSecurityManager.verify_token(credentials.credentials)
        if token_data is None:
            return None
        
        user = await AuthManager.get_user_by_id(db, token_data.user_id)
        if user is None or not user.is_active:
            return None
            
        return user
    except Exception as e:
        logger.warning(f"Optional auth failed: {e}")
        return None

# Permission checking utilities
class PermissionChecker:
    """
    Utility class grouping static methods for evaluating role-based permissions.
    """
    
    @staticmethod
    def can_view_user_data(current_user: User, target_user: User) -> bool:
        """Check if current user can view target user's data"""
        if current_user.is_admin():
            return True
        return current_user.id == target_user.id
    
    @staticmethod
    def can_edit_user(current_user: User, target_user: User) -> bool:
        """Check if current user can edit target user"""
        if current_user.is_super_admin():
            return True
        elif current_user.is_admin():
            # Admins can edit regular users but not other admins
            return target_user.role == UserRole.USER
        else:
            # Regular users can only edit themselves
            return current_user.id == target_user.id
    
    @staticmethod
    def can_delete_user(current_user: User, target_user: User) -> bool:
        """Check if current user can delete target user"""
        if current_user.is_super_admin():
            # Super admins can delete anyone except themselves
            return current_user.id != target_user.id
        elif current_user.is_admin():
            # Admins can delete regular users only
            return target_user.role == UserRole.USER
        else:
            # Regular users can delete themselves
            return current_user.id == target_user.id
    
    @staticmethod
    def can_manage_predictions(current_user: User, target_user: User = None) -> bool:
        """Check if current user can manage predictions"""
        if current_user.is_admin():
            return True
        if target_user:
            return current_user.id == target_user.id
        return False
    
    @staticmethod
    def can_view_audit_logs(current_user: User) -> bool:
        """Check if current user can view audit logs"""
        return current_user.is_admin()

# Decorator for admin actions with automatic logging
def log_admin_action(action_name: str):
    """
    Decorator that automatically intercepts a router function call to log an administrative action.
    
    Extracts the `current_user` and `db` from the decorated function's arguments to 
    record the action in the `AdminAuditLog` table.
    
    Args:
        action_name (str): The descriptive identifier of the action (e.g., 'update_agrovet').
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract parameters from kwargs
            request = kwargs.get('request')
            current_user = None
            db = None
            
            # Find current_user and db in function parameters
            for arg in args:
                if isinstance(arg, User):
                    current_user = arg
                    break
            
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                elif key == 'db' and hasattr(value, 'execute'):
                    db = value
            
            # Execute the function
            result = await func(*args, **kwargs)
            
            # Log the action if we have the necessary components
            if current_user and db and current_user.is_admin():
                try:
                    await AuthManager.log_admin_action(
                        db=db,
                        admin_user_id=current_user.id,
                        action=action_name,
                        request=request
                    )
                except Exception as e:
                    logger.error(f"Failed to log admin action {action_name}: {e}")
            
            return result
        return wrapper
    return decorator