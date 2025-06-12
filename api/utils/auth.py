"""
Authentication utilities for JWT token handling and password management
"""
import os
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.db.connection import get_db
from api.models.database import User
from api.schema.auth_schema import TokenData

logger = logging.getLogger(__name__)

# Security configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token scheme
security = HTTPBearer()

class AuthManager:
    """Authentication manager class"""
    
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
        """Create JWT access token"""
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
        """Verify JWT token and extract data"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            username: str = payload.get("username")
            
            if user_id is None:
                return None
                
            token_data = TokenData(user_id=user_id, username=username)
            return token_data
        except JWTError as e:
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
            
        return user

# Authentication dependency
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