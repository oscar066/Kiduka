import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Union
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from api.db.models.database import User, AdminAuditLog
from api.schema.auth_schema import TokenData, UserRoleEnum
from .core import AuthSecurityManager

logger = logging.getLogger(__name__)

class AuthManager:
    """Core Authentication and Database Utility Manager"""
    
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
            
        if not AuthSecurityManager.verify_password(password, user.hashed_password):
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
