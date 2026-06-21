
"""
Admin user management service - handles all user-related business logic
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_, and_, update, delete
from sqlalchemy.orm import selectinload

from api.db.models.database import User, SoilPrediction, UserRole
from api.schema.auth_schema import (
    AdminUserCreate, AdminUserResponse, AdminUserUpdate, UserListResponse,
    AdminPasswordReset, UserRoleEnum
)
from api.services.auth.auth_service import AuthService
from api.services.auth.auth_manager import AuthManager
from api.services.auth.core import AuthSecurityManager

logger = logging.getLogger(__name__)

class AdminUserService:
    """
    Service responsible for administrative management of users.
    
    Provides capabilities for filtering users, creating accounts with specific roles,
    resetting passwords, and enforcing role-based access control (RBAC) hierarchies.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the AdminUserService.
        
        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db
    
    async def get_users_with_filters(
        self,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
        role: Optional[UserRoleEnum] = None,
        is_active: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> UserListResponse:
        """
        Retrieve a paginated, filtered, and sorted list of users for the admin dashboard.
        
        Args:
            page (int): Target page number. Defaults to 1.
            size (int): Number of records per page. Defaults to 20.
            search (Optional[str]): A keyword to filter usernames, emails, or full names.
            role (Optional[UserRoleEnum]): Filter by a specific user role.
            is_active (Optional[bool]): Filter by account activation status.
            sort_by (str): The column name to sort by. Defaults to 'created_at'.
            sort_order (str): Sort direction ('asc' or 'desc'). Defaults to 'desc'.
            
        Returns:
            UserListResponse: A payload containing the paginated users and total counts.
            
        Raises:
            Exception: If an unexpected database query error occurs.
        """
        logger.info(f"Fetching users with filters: search={search}, role={role}, is_active={is_active}")
        
        try:
            # Build base query
            stmt = select(User)
            count_stmt = select(func.count(User.id))
            
            # Apply filters
            conditions = []
            
            if search:
                search_condition = or_(
                    User.username.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    User.full_name.ilike(f"%{search}%")
                )
                conditions.append(search_condition)
            
            if role:
                conditions.append(User.role == UserRole(role.value))
            
            if is_active is not None:
                conditions.append(User.is_active == is_active)
            
            if conditions:
                stmt = stmt.where(and_(*conditions))
                count_stmt = count_stmt.where(and_(*conditions))
            
            # Apply sorting
            if hasattr(User, sort_by):
                sort_column = getattr(User, sort_by)
                if sort_order == "desc":
                    stmt = stmt.order_by(desc(sort_column))
                else:
                    stmt = stmt.order_by(sort_column)
            
            # Apply pagination
            offset = (page - 1) * size
            stmt = stmt.offset(offset).limit(size).options(selectinload(User.assigned_cdc))

            # Execute queries
            users_result = await self.db.execute(stmt)
            users = users_result.scalars().all()
            
            count_result = await self.db.execute(count_stmt)
            total = count_result.scalar()
            
            # Get prediction counts for each user
            prediction_counts = await self._get_prediction_counts([user.id for user in users])
            
            # Convert to response format
            user_list = [
                AdminUserResponse(
                    id=user.id,
                    email=user.email,
                    username=user.username,
                    full_name=user.full_name,
                    role=UserRoleEnum(user.role.value),
                    is_active=user.is_active,
                    is_verified=user.is_verified,
                    created_at=user.created_at,
                    updated_at=user.updated_at,
                    last_login=user.last_login,
                    created_by=user.created_by,
                    notes=user.notes,
                    prediction_count=prediction_counts.get(user.id, 0),
                    assigned_cdc_id=user.assigned_cdc_id,
                    assigned_cdc_username=user.assigned_cdc.username if user.assigned_cdc else None,
                )
                for user in users
            ]
            
            return UserListResponse(
                users=user_list,
                total=total,
                page=page,
                size=size,
                pages=(total + size - 1) // size
            )
            
        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            raise
    
    async def create_user(
        self, 
        user_data: AdminUserCreate, 
        created_by: User
    ) -> AdminUserResponse:
        """
        Create a new user account on behalf of an administrator.
        
        Enforces RBAC limits, ensuring that only Super Admins can create other Admin
        or Super Admin accounts. Accounts created here are automatically set as verified.
        
        Args:
            user_data (AdminUserCreate): The registration payload.
            created_by (User): The authenticated admin user creating the account.
            
        Returns:
            AdminUserResponse: The newly created user's profile.
            
        Raises:
            ValueError: If the current admin lacks permissions, or if the email/username is taken.
        """
        logger.info(f"Creating user {user_data.username} by admin {created_by.username}")
        
        # Validate permissions for role assignment.
        # Only SUPER_ADMIN may create other ADMIN or SUPER_ADMIN accounts.
        # Both ADMIN and SUPER_ADMIN may create CDC accounts.
        if user_data.role in [UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN]:
            if not created_by.is_super_admin():
                raise ValueError("Only super admins can create admin users")
        
        try:
            # Check if user already exists
            if await self._user_exists(user_data.email, user_data.username):
                raise ValueError("User with this email or username already exists")
            
            # Create new user — admin-created accounts are auto-verified
            hashed_password = AuthSecurityManager.get_password_hash(user_data.password)
            db_user = User(
                email=user_data.email,
                username=user_data.username,
                hashed_password=hashed_password,
                full_name=user_data.full_name,
                phone_number=getattr(user_data, "phone_number", None),
                role=UserRole(user_data.role.value),
                is_active=True,
                is_verified=True,  # Admin-created users are auto-verified
                created_by=created_by.id,
                notes=user_data.notes
            )
            
            self.db.add(db_user)
            await self.db.commit()
            await self.db.refresh(db_user)
            
            logger.info(f"User created by admin: {db_user.username}")
            return self._user_to_admin_response(db_user)
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating user: {e}")
            raise
    
    async def get_user_by_id(self, user_id: str) -> Optional[AdminUserResponse]:
        """
        Fetch detailed information about a single user by their UUID.
        
        Args:
            user_id (str): The UUID string of the target user.
            
        Returns:
            Optional[AdminUserResponse]: The detailed profile including prediction counts, 
                or None if the user is not found.
        """
        try:
            user = await AuthManager.get_user_by_id(self.db, user_id)
            if not user:
                return None
            
            # Get prediction count
            prediction_count_result = await self.db.execute(
                select(func.count(SoilPrediction.id)).where(SoilPrediction.user_id == user.id)
            )
            prediction_count = prediction_count_result.scalar()
            
            response = self._user_to_admin_response(user)
            response.prediction_count = prediction_count
            return response
            
        except Exception as e:
            logger.error(f"Error fetching user details: {e}")
            raise
    
    async def update_user(
        self, 
        user_id: str, 
        user_update: AdminUserUpdate, 
        updated_by: User
    ) -> AdminUserResponse:
        """
        Update a user's profile and settings from the admin panel.
        
        Enforces hierarchical permissions:
        - Regular Admins can only edit standard Users.
        - Only Super Admins can promote/demote roles to/from Admin levels.
        
        Args:
            user_id (str): The UUID string of the user to update.
            user_update (AdminUserUpdate): The requested changes.
            updated_by (User): The authenticated admin performing the update.
            
        Returns:
            AdminUserResponse: The successfully updated user profile.
            
        Raises:
            ValueError: If the user is not found, permissions are insufficient, 
                or a unique constraint (like email) is violated.
        """
        logger.info(f"Updating user {user_id} by admin {updated_by.username}")
        
        try:
            target_user = await AuthManager.get_user_by_id(self.db, user_id)
            if not target_user:
                raise ValueError("User not found")
            
            # Check permissions
            if not self._can_edit_user(updated_by, target_user):
                raise ValueError("Insufficient permissions to edit this user")
            
            # Check role assignment permissions
            if user_update.role and user_update.role in [UserRoleEnum.ADMIN, UserRoleEnum.SUPER_ADMIN]:
                if not updated_by.is_super_admin():
                    raise ValueError("Only super admins can assign admin roles")
            
            # Validate and update fields
            changes = {}
            
            if user_update.email and user_update.email != target_user.email:
                if await self._email_exists(user_update.email, exclude_user_id=target_user.id):
                    raise ValueError("Email already registered")
                changes["email"] = user_update.email
                target_user.email = user_update.email
            
            if user_update.username and user_update.username != target_user.username:
                if await self._username_exists(user_update.username, exclude_user_id=target_user.id):
                    raise ValueError("Username already taken")
                changes["username"] = user_update.username
                target_user.username = user_update.username
            
            # Update other fields
            if user_update.full_name is not None:
                changes["full_name"] = user_update.full_name
                target_user.full_name = user_update.full_name
            
            if user_update.is_active is not None:
                changes["is_active"] = user_update.is_active
                target_user.is_active = user_update.is_active
            
            if user_update.is_verified is not None:
                changes["is_verified"] = user_update.is_verified
                target_user.is_verified = user_update.is_verified
            
            if user_update.role is not None:
                changes["role"] = user_update.role.value
                target_user.role = UserRole(user_update.role.value)
            
            if user_update.notes is not None:
                changes["notes"] = user_update.notes
                target_user.notes = user_update.notes
            
            await self.db.commit()
            await self.db.refresh(target_user)
            
            logger.info(f"User updated by admin: {target_user.username}")
            return self._user_to_admin_response(target_user)
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating user: {e}")
            raise
    
    async def reset_user_password(
        self, 
        user_id: str, 
        new_password: str, 
        reset_by: User
    ) -> None:
        """
        Forcefully reset a user's password without needing their current password.
        
        Args:
            user_id (str): The UUID string of the user account.
            new_password (str): The new plaintext password to enforce.
            reset_by (User): The admin user triggering the reset.
            
        Raises:
            ValueError: If the user is not found or the admin lacks hierarchical permission.
        """
        logger.info(f"Password reset for user {user_id} by admin {reset_by.username}")
        
        try:
            target_user = await AuthManager.get_user_by_id(self.db, user_id)
            if not target_user:
                raise ValueError("User not found")
            
            # Check permissions
            if not self._can_edit_user(reset_by, target_user):
                raise ValueError("Insufficient permissions to reset this user's password")
            
            # Update password
            target_user.hashed_password = AuthSecurityManager.get_password_hash(new_password)
            await self.db.commit()
            
            logger.info(f"Password reset by admin for user: {target_user.username}")
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error resetting password: {e}")
            raise
    
    async def delete_user(self, user_id: str, deleted_by: User) -> Dict[str, Any]:
        """
        Permanently delete a user account from the system.
        
        Args:
            user_id (str): The UUID string of the user to delete.
            deleted_by (User): The admin user issuing the deletion command.
            
        Returns:
            Dict[str, Any]: A summary of the deleted user's details for logging purposes.
            
        Raises:
            ValueError: If the user is not found or the admin lacks hierarchical permission.
        """
        logger.info(f"Deleting user {user_id} by admin {deleted_by.username}")
        
        try:
            target_user = await AuthManager.get_user_by_id(self.db, user_id)
            if not target_user:
                raise ValueError("User not found")
            
            # Check permissions
            if not self._can_delete_user(deleted_by, target_user):
                raise ValueError("Insufficient permissions to delete this user")
            
            # Store user info for logging
            user_info = {
                "username": target_user.username,
                "email": target_user.email,
                "role": target_user.role.value
            }
            
            # Delete user (cascade will handle related records)
            await self.db.delete(target_user)
            await self.db.commit()
            
            logger.info(f"User deleted by admin: {user_info['username']}")
            return {"deleted_user": user_info}
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting user: {e}")
            raise
    
    # Helper methods
    async def _user_exists(self, email: str, username: str) -> bool:
        """Check if user exists by email or username."""
        result = await self.db.execute(
            select(User).where(or_(User.email == email, User.username == username))
        )
        return result.scalar_one_or_none() is not None
    
    async def _email_exists(self, email: str, exclude_user_id: str = None) -> bool:
        """Check if an email is already taken by a different user."""
        query = select(User).where(User.email == email)
        if exclude_user_id:
            query = query.where(User.id != exclude_user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
    
    async def _username_exists(self, username: str, exclude_user_id: str = None) -> bool:
        """Check if a username is already taken by a different user."""
        query = select(User).where(User.username == username)
        if exclude_user_id:
            query = query.where(User.id != exclude_user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
    
    async def _get_prediction_counts(self, user_ids: List[str]) -> Dict[str, int]:
        """
        Aggregate total prediction counts for a batch of users.
        
        Args:
            user_ids (List[str]): List of user UUID strings.
            
        Returns:
            Dict[str, int]: Mapping of user_id to their prediction count.
        """
        if not user_ids:
            return {}
        
        prediction_counts_result = await self.db.execute(
            select(SoilPrediction.user_id, func.count(SoilPrediction.id))
            .where(SoilPrediction.user_id.in_(user_ids))
            .group_by(SoilPrediction.user_id)
        )
        return dict(prediction_counts_result.all())
    
    def _can_edit_user(self, current_user: User, target_user: User) -> bool:
        """
        Enforce RBAC rules to determine if a user can be edited by the current session user.

        - SUPER_ADMIN can edit anyone.
        - ADMIN can edit USER and CDC accounts (not other admins).
        - All others can only edit themselves.
        """
        if current_user.is_super_admin():
            return True
        elif current_user.is_admin():
            # Admins can edit regular farmers and CDC officers, not other admins
            return target_user.role in [UserRole.USER, UserRole.CDC]
        else:
            # Regular users / CDC users can only edit themselves
            return current_user.id == target_user.id

    def _can_delete_user(self, current_user: User, target_user: User) -> bool:
        """
        Enforce RBAC rules to determine if a user can be deleted by the current session user.

        - SUPER_ADMIN can delete anyone except themselves.
        - ADMIN can delete USER and CDC accounts only.
        - All others can delete themselves.
        """
        if current_user.is_super_admin():
            # Super admins can delete anyone except themselves
            return current_user.id != target_user.id
        elif current_user.is_admin():
            # Admins can delete regular farmers and CDC officers only
            return target_user.role in [UserRole.USER, UserRole.CDC]
        else:
            # Regular users / CDC users can delete themselves
            return current_user.id == target_user.id
    
    def _user_to_admin_response(self, user: User) -> AdminUserResponse:
        """Convert a User database model to the AdminUserResponse schema."""
        return AdminUserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=UserRoleEnum(user.role.value),
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login=user.last_login,
            created_by=user.created_by,
            notes=user.notes,
            assigned_cdc_id=user.assigned_cdc_id,
            assigned_cdc_username=getattr(user.assigned_cdc, "username", None),
        )