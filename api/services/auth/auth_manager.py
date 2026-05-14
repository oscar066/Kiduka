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
        """
        Fetch a user from the database by their email address.
        
        Args:
            db (AsyncSession): The asynchronous database session.
            email (str): The email address to search for.
            
        Returns:
            Optional[User]: The found User object, or None if no match exists.
        """
        try:
            result = await db.execute(select(User).where(User.email == email))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}")
            return None
    
    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """
        Fetch a user from the database by their username.
        
        Args:
            db (AsyncSession): The asynchronous database session.
            username (str): The username to search for.
            
        Returns:
            Optional[User]: The found User object, or None if no match exists.
        """
        try:
            result = await db.execute(select(User).where(User.username == username))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching user by username: {e}")
            return None
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: Union[str, uuid.UUID]) -> Optional[User]:
        """
        Fetch a user from the database by their primary key UUID.
        
        Handles conversion of string representations to UUID objects automatically.
        
        Args:
            db (AsyncSession): The asynchronous database session.
            user_id (Union[str, uuid.UUID]): The unique identifier to search for.
            
        Returns:
            Optional[User]: The found User object, or None if no match exists.
        """
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
        """
        Authenticate a user using either their username or email against a plaintext password.
        
        Additionally, updates the user's `last_login` timestamp upon a successful verification.
        
        Args:
            db (AsyncSession): The asynchronous database session.
            username_or_email (str): The provided login identifier.
            password (str): The provided plaintext password to verify.
            
        Returns:
            Optional[User]: The authenticated User object, or None if authentication fails.
        """
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
        """
        Persist a record of an administrative action to the audit log.
        
        Captures the actor, the action performed, the target entities (if any),
        along with metadata such as IP address and user agent if a request context is provided.
        
        Args:
            db (AsyncSession): The asynchronous database session.
            admin_user_id (uuid.UUID): The UUID of the admin performing the action.
            action (str): A brief string describing the action (e.g., 'delete_user').
            request (Request, optional): The HTTP request triggering the action (used for IP/User-Agent).
            target_user_id (Optional[uuid.UUID]): The UUID of the user affected by this action.
            target_prediction_id (Optional[uuid.UUID]): The UUID of the prediction affected.
            target_agrovet_id (Optional[uuid.UUID]): The UUID of the agrovet affected.
            details (Optional[dict]): JSON-serializable dictionary with additional context.
        """
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
