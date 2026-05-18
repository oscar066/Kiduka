from datetime import timedelta
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from api.db.models.database import User, UserRole
from api.schema.auth_schema import UserCreate, UserLogin, UserUpdate, UserResponse, UserRoleEnum
from api.services.auth.core import AuthSecurityManager, ACCESS_TOKEN_EXPIRE_MINUTES
from api.services.auth.auth_manager import AuthManager

logger = logging.getLogger(__name__)

class AuthService:
    """
    Service class handling business logic for authentication and user management.
    
    This class isolates the core authentication logic (registration, login, profile updates)
    from the FastAPI routing layer, interacting directly with the database.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the AuthService.
        
        Args:
            db (AsyncSession): The asynchronous SQLAlchemy database session.
        """
        self.db = db  
          
    async def register_user(self, user_data: UserCreate) -> UserResponse:
        """
        Register a new user in the system.
        
        Performs checks to ensure uniqueness of the username and email, hashes
        the user's password, and persists the new user to the database with
        a default 'USER' role.
        
        Args:
            user_data (UserCreate): The user's registration details.
            
        Returns:
            UserResponse: The newly created user's profile information.
            
        Raises:
            ValueError: If a user with the provided email or username already exists.
        """
        logger.info(f"Registration attempt for user: {user_data.username}")
        
        # Check if user already exists
        if await self._user_exists(user_data.email, user_data.username):
            raise ValueError("User with this email or username already exists")
        
        try:
            # Create new user
            hashed_password = AuthSecurityManager.get_password_hash(user_data.password)
            db_user = User(
                email=user_data.email,
                username=user_data.username,
                hashed_password=hashed_password,
                full_name=user_data.full_name,
                role=UserRole.USER,  # Always USER role for public registration
                is_active=True,
                is_verified=False  # Requires email verification or admin approval
            )
            
            self.db.add(db_user)
            await self.db.commit()
            await self.db.refresh(db_user)
            
            logger.info(f"User registered successfully: {db_user.username}")
            return self._user_to_response(db_user)
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error registering user: {e}")
            raise
    
    async def login_user(self, credentials: UserLogin) -> dict:
        """
        Authenticate a user and generate a JWT access token.
        
        Validates the provided credentials against the database. If successful,
        generates a JWT containing the user's ID, username, and role.
        
        Args:
            credentials (UserLogin): The login payload containing username/email and password.
            
        Returns:
            dict: A dictionary containing the access token, token type, expiry time, and role.
            
        Raises:
            ValueError: If the credentials are incorrect or the account is deactivated.
        """
        logger.info(f"Login attempt for: {credentials.username_or_email}")
        
        user = await AuthManager.authenticate_user(
            self.db, credentials.username_or_email, credentials.password
        )
        
        if not user:
            raise ValueError("Incorrect username/email or password")
        
        if not user.is_active:
            raise ValueError("Account is deactivated")
        
        # Create access token with role information
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = AuthSecurityManager.create_access_token(
            data={
                "sub": str(user.id),
                "username": user.username,
                "role": user.role.value
            },
            expires_delta=access_token_expires
        )
        
        logger.info(f"User logged in successfully: {user.username} (role: {user.role.value})")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user_role": UserRoleEnum(user.role.value)
        }
    
    async def update_user(self, user: User, user_update: UserUpdate) -> UserResponse:
        """
        Update basic information for an existing user.
        
        Validates that any new email or username is not already taken by another user.
        
        Args:
            user (User): The authenticated user object to update.
            user_update (UserUpdate): The fields containing the updated values.
            
        Returns:
            UserResponse: The updated user profile information.
            
        Raises:
            ValueError: If the new email or username is already in use by another account.
        """
        logger.info(f"User update request for: {user.username}")
        
        try:
            # Validate email uniqueness if updating email
            if user_update.email and user_update.email != user.email:
                if await self._email_exists(user_update.email, exclude_user_id=user.id):
                    raise ValueError("Email already registered")
                user.email = user_update.email
            
            # Validate username uniqueness if updating username
            if user_update.username and user_update.username != user.username:
                if await self._username_exists(user_update.username, exclude_user_id=user.id):
                    raise ValueError("Username already taken")
                user.username = user_update.username
            
            # Update other basic fields
            if user_update.full_name is not None:
                user.full_name = user_update.full_name
            
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"User updated successfully: {user.username}")
            return self._user_to_response(user)
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating user: {e}")
            raise
    
    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        """
        Change a user's password after verifying their current password.
        
        Args:
            user (User): The authenticated user requesting the password change.
            current_password (str): The user's existing plaintext password.
            new_password (str): The new plaintext password to set.
            
        Raises:
            ValueError: If the current password provided is incorrect.
        """
        logger.info(f"Password change request for: {user.username}")
        
        # Verify current password
        if not AuthSecurityManager.verify_password(current_password, user.hashed_password):
            raise ValueError("Current password is incorrect")
        
        try:
            # Update password
            user.hashed_password = AuthSecurityManager.get_password_hash(new_password)
            await self.db.commit()
            
            logger.info(f"Password changed successfully for: {user.username}")
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error changing password: {e}")
            raise
    
    async def delete_user(self, user: User) -> None:
        """
        Delete a user account from the database.
        
        Args:
            user (User): The user object to be deleted.
        """
        logger.info(f"User deletion request for: {user.username}")
        
        try:
            await self.db.delete(user)
            await self.db.commit()
            
            logger.info(f"User deleted successfully: {user.username}")
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting user: {e}")
            raise

    async def send_verification_email(self, user: User) -> None:
        # Send email logic here
        pass

    async def verify_email(self, token: str) -> User:
        # Verify email logic here
        pass
    
    def get_user_permissions(self, user: User) -> dict:
        """
        Generate a detailed map of feature permissions based on the user's role.
        
        Args:
            user (User): The user to evaluate permissions for.
            
        Returns:
            dict: A dictionary mapping feature names to boolean access flags.
        """
        permissions = {
            "role": user.role.value,
            "is_admin": user.is_admin(),
            "is_super_admin": user.is_super_admin(),
            "can_view_admin_panel": user.is_admin(),
            "can_manage_users": user.is_admin(),
            "can_view_all_predictions": user.is_admin(),
            "can_view_audit_logs": user.is_admin(),
            "can_manage_agrovets": user.is_admin(),
            "can_create_admin_users": user.is_super_admin(),
            "can_delete_admin_users": user.is_super_admin()
        }
        
        return {
            "user_id": user.id,
            "username": user.username,
            "permissions": permissions
        }
    
    # Helper methods
    async def _user_exists(self, email: str, username: str) -> bool:
        """
        Check if a user exists by email or username.
        
        Args:
            email (str): The email address to check.
            username (str): The username to check.
            
        Returns:
            bool: True if a user exists with either the email or username, False otherwise.
        """
        result = await self.db.execute(
            select(User).where(or_(User.email == email, User.username == username))
        )
        return result.scalar_one_or_none() is not None
    
    async def _email_exists(self, email: str, exclude_user_id: str = None) -> bool:
        """
        Check if an email is already registered, optionally excluding a specific user.
        
        Args:
            email (str): The email address to verify.
            exclude_user_id (str, optional): A user ID to exclude from the check (e.g., during self-update).
            
        Returns:
            bool: True if the email is in use, False otherwise.
        """
        query = select(User).where(User.email == email)
        if exclude_user_id:
            query = query.where(User.id != exclude_user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
    
    async def _username_exists(self, username: str, exclude_user_id: str = None) -> bool:
        """
        Check if a username is already taken, optionally excluding a specific user.
        
        Args:
            username (str): The username to verify.
            exclude_user_id (str, optional): A user ID to exclude from the check.
            
        Returns:
            bool: True if the username is taken, False otherwise.
        """
        query = select(User).where(User.username == username)
        if exclude_user_id:
            query = query.where(User.id != exclude_user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
    
    def _user_to_response(self, user: User) -> UserResponse:
        """
        Convert a SQLAlchemy User model instance to a Pydantic UserResponse.
        
        Args:
            user (User): The database user model.
            
        Returns:
            UserResponse: The serialized user data safe for API responses.
        """
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=UserRoleEnum(user.role.value),
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login=user.last_login
        )