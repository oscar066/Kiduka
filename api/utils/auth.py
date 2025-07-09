"""
Enhanced authentication utilities with role-based access control
"""
import os
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, update, func

from api.db.connection import get_db
from api.db.models.database import User, AdminAuditLog, UserRole
from api.schema.auth_schema import TokenData, UserRoleEnum

logger = logging.getLogger(__name__)

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "300"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme
security = HTTPBearer()

class AuthManager:
    """Authentication manager"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Generate password hash"""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token with role information"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Optional[TokenData]:
        """Verify JWT token and extract data including role"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            username: str = payload.get("username")
            role: str = payload.get("role")
            
            if user_id is None:
                return None
                
            token_data = TokenData(
                user_id=user_id, 
                username=username,
                role=UserRoleEnum(role) if role else UserRoleEnum.USER
            )
            return token_data
        except (JWTError, ValueError) as e:
            logger.warning(f"JWT verification failed: {e}")
            return None
    
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            result = await db.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}")
            return None
    
    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """Get user by username"""
        try:
            result = await db.execute(select(User).where(User.username == username))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user by username: {e}")
            return None
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: Union[str, uuid.UUID]) -> Optional[User]:
        """Get user by ID"""
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)
            
            result = await db.execute(select(User).where(User.id == user_id))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
            return None
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, username_or_email: str, password: str) -> Optional[User]:
        """Authenticate user with username/email and password"""
        # Try to find user by email first, then by username
        user = await AuthManager.get_user_by_email(db, username_or_email)
        if not user:
            user = await AuthManager.get_user_by_username(db, username_or_email)
        
        if not user:
            return None
            
        if not AuthManager.verify_password(password, user.hashed_password):
            return None
        
        # Update last login
        try:
            await db.execute(
                update(User)
                .where(User.id == user.id)
                .values(last_login=datetime.now(timezone.utc))
            )
            await db.commit()
        except Exception as e:
            logger.warning(f"Failed to update last login for user {user.username}: {e}")
            
        return user

    @staticmethod
    async def log_admin_action(
        db: AsyncSession,
        admin_user_id: uuid.UUID,
        action: str,
        request: Request = None,
        target_user_id: Optional[uuid.UUID] = None,
        target_prediction_id: Optional[uuid.UUID] = None,
        target_agrovet_id: Optional[uuid.UUID] = None,
        details: Optional[dict] = None
    ):
        """Log admin actions for audit trail"""
        try:
            audit_log = AdminAuditLog(
                admin_user_id=admin_user_id,
                target_user_id=target_user_id,
                target_prediction_id=target_prediction_id,
                target_agrovet_id=target_agrovet_id,
                action=action,
                details=details,
                ip_address=request.client.host if request else None,
                user_agent=request.headers.get("user-agent") if request else None
            )
            
            db.add(audit_log)
            await db.commit()
            logger.info(f"Admin action logged: {action} by user {admin_user_id}")
            
        except Exception as e:
            logger.error(f"Failed to log admin action: {e}")
            await db.rollback()

# Role-based dependency functions
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """FastAPI dependency to get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = AuthManager.verify_token(credentials.credentials)
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
    """FastAPI dependency to get current admin user"""
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

async def get_current_super_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """FastAPI dependency to get current super admin user"""
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
    """FastAPI dependency to get current user (optional)"""
    if not credentials:
        return None
    
    try:
        token_data = AuthManager.verify_token(credentials.credentials)
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
    """Utility class for checking permissions"""
    
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
    """Decorator to automatically log admin actions"""
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