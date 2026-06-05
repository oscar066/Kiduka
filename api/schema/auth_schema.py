"""
Enhanced authentication schemas with role-based access control.

This module defines Pydantic models used for data validation, serialization,
and deserialization of user authentication and management payloads.
"""
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum

class UserRoleEnum(str, Enum):
    """
    Enumeration of user roles within the system.

    Attributes:
        USER (str): Standard farmer account with basic permissions.
        CDC (str): Community Development Coordinator — can run analyses for farmers
            and dispatch results via email / SMS.
        ADMIN (str): Administrative user with elevated management privileges.
        SUPER_ADMIN (str): Super administrator with full system permissions,
            including the ability to create Admin and CDC accounts.
    """
    USER = "user"
    CDC = "cdc"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class UserBase(BaseModel):
    """
    Base user schema containing common attributes for all user-related models.
    
    Attributes:
        email (EmailStr): The user's email address.
        username (str): The unique username (between 3 and 50 characters).
        full_name (Optional[str]): The user's full name, if provided.
    """
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None

class UserCreate(UserBase):
    """
    Schema for creating a new standard user.
    
    Inherits attributes from UserBase.
    
    Attributes:
        password (str): The plaintext password (will be hashed before storage).
    """
    password: str = Field(..., min_length=8, max_length=100)

class AdminUserCreate(UserCreate):
    """
    Schema for creating a user account via the admin panel.

    Only existing administrators (ADMIN or SUPER_ADMIN) can use this endpoint.
    Role assignment rules:
    - Both ADMIN and SUPER_ADMIN can create USER and CDC accounts.
    - Only SUPER_ADMIN can create other ADMIN or SUPER_ADMIN accounts.

    Inherits attributes from UserCreate.

    Attributes:
        role (UserRoleEnum): The role assigned to the new user. Defaults to USER.
        phone_number (Optional[str]): Contact phone for SMS notifications (required for CDC-served farmers).
        notes (Optional[str]): Optional administrative notes about the user.
    """
    role: UserRoleEnum = Field(default=UserRoleEnum.USER)
    phone_number: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=1000)

class UserLogin(BaseModel):
    """
    Schema for user login credentials.
    
    Attributes:
        username_or_email (str): The user's username or email address.
        password (str): The user's plaintext password.
    """
    username_or_email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    """
    Schema for serializing a user object to return in API responses.

    Inherits attributes from UserBase.

    Attributes:
        id (uuid.UUID): The unique identifier of the user.
        role (UserRoleEnum): The user's role.
        phone_number (Optional[str]): Contact phone number, used for SMS notifications.
        is_active (bool): Indicates if the user account is active.
        is_verified (bool): Indicates if the user's email has been verified.
        created_at (datetime): The timestamp when the user was created.
        updated_at (datetime): The timestamp when the user was last updated.
        last_login (Optional[datetime]): The timestamp of the user's last login.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: UserRoleEnum
    phone_number: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

class AdminUserResponse(UserResponse):
    """
    Extended user schema for administrative views.
    
    Inherits attributes from UserResponse.
    
    Attributes:
        created_by (Optional[uuid.UUID]): The ID of the admin who created this user, if applicable.
        notes (Optional[str]): Administrative notes about the user.
        prediction_count (Optional[int]): Total number of predictions made by the user.
        session_count (Optional[int]): Total number of sessions initiated by the user.
    """
    created_by: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    prediction_count: Optional[int] = None
    session_count: Optional[int] = None

class UserUpdate(BaseModel):
    """
    Schema for users to update their own profile information.
    
    All fields are optional; only provided fields will be updated.
    
    Attributes:
        email (Optional[EmailStr]): The new email address.
        username (Optional[str]): The new username.
        full_name (Optional[str]): The new full name.
        is_active (Optional[bool]): Flag to deactivate the account.
    """
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class AdminUserUpdate(UserUpdate):
    """
    Schema for administrators to update any user's profile.
    
    Inherits attributes from UserUpdate.
    
    Attributes:
        role (Optional[UserRoleEnum]): The new role to assign to the user.
        is_verified (Optional[bool]): Admin override for email verification status.
        notes (Optional[str]): Updated administrative notes.
    """
    role: Optional[UserRoleEnum] = None
    is_verified: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=1000)

class Token(BaseModel):
    """
    Schema for returning access tokens upon successful authentication.
    
    Attributes:
        access_token (str): The JWT access token.
        token_type (str): The type of token (usually "bearer").
        expires_in (int): Number of seconds until the token expires.
        user_role (UserRoleEnum): The role of the authenticated user.
    """
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_role: UserRoleEnum

class TokenData(BaseModel):
    """
    Schema for data extracted from a verified JWT token.
    
    Attributes:
        user_id (Optional[str]): The extracted user ID.
        username (Optional[str]): The extracted username.
        role (Optional[UserRoleEnum]): The extracted user role.
    """
    user_id: Optional[str] = None
    username: Optional[str] = None
    role: Optional[UserRoleEnum] = None

class PasswordChange(BaseModel):
    """
    Schema for users to change their own password.
    
    Attributes:
        current_password (str): The user's current plaintext password.
        new_password (str): The user's new plaintext password.
    """
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8, max_length=100)

class AdminPasswordReset(BaseModel):
    """
    Schema for administrators to reset a user's password without knowing the current one.
    
    Attributes:
        new_password (str): The new plaintext password to assign to the user.
    """
    new_password: str = Field(..., min_length=8, max_length=100)

class PasswordReset(BaseModel):
    """
    Schema for initiating a password reset via email.
    
    Attributes:
        email (EmailStr): The email address associated with the account to recover.
    """
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """
    Schema for confirming a password reset using a token sent via email.
    
    Attributes:
        token (str): The secure token sent to the user's email.
        new_password (str): The newly chosen plaintext password.
    """
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

# Admin management schemas
class UserListResponse(BaseModel):
    """
    Paginated schema for listing users in the admin dashboard.
    
    Attributes:
        users (List[AdminUserResponse]): List of user objects for the current page.
        total (int): Total number of users in the system matching the query.
        page (int): The current page number.
        size (int): The number of users per page.
        pages (int): The total number of available pages.
    """
    users: List[AdminUserResponse]
    total: int
    page: int
    size: int
    pages: int

class UserStatsResponse(BaseModel):
    """
    Schema for reporting aggregated user statistics to the admin dashboard.
    
    Attributes:
        total_users (int): Total number of registered users.
        active_users (int): Total number of non-deactivated users.
        verified_users (int): Total number of users who have verified their emails.
        users_by_role (dict): A mapping of UserRoleEnum to the count of users in that role.
        recent_registrations (int): Number of users registered recently (e.g., in the last 7 days).
        total_predictions (int): Total number of predictions made across all users.
    """
    total_users: int
    active_users: int
    verified_users: int
    users_by_role: dict
    recent_registrations: int
    total_predictions: int

class AuditLogEntry(BaseModel):
    """
    Schema representing a single audit log entry for administrative actions.
    
    Attributes:
        id (uuid.UUID): Unique identifier for the log entry.
        admin_user_id (uuid.UUID): ID of the administrator who performed the action.
        admin_username (str): Username of the administrator.
        target_user_id (Optional[uuid.UUID]): ID of the user affected by the action, if any.
        target_username (Optional[str]): Username of the affected user, if any.
        action (str): Description of the action performed.
        details (Optional[dict]): Additional JSON details regarding the action.
        ip_address (Optional[str]): IP address from which the action was initiated.
        created_at (datetime): Timestamp when the action occurred.
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    admin_user_id: uuid.UUID
    admin_username: str
    target_user_id: Optional[uuid.UUID] = None
    target_username: Optional[str] = None
    action: str
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: datetime

class AuditLogResponse(BaseModel):
    """
    Paginated schema for listing audit logs in the admin dashboard.
    
    Attributes:
        logs (List[AuditLogEntry]): List of audit log entries for the current page.
        total (int): Total number of audit logs matching the query.
        page (int): The current page number.
        size (int): The number of logs per page.
        pages (int): The total number of available pages.
    """
    logs: List[AuditLogEntry]
    total: int
    page: int
    size: int
    pages: int

# Prediction management schemas for admin
class AdminPredictionResponse(BaseModel):
    """
    Enhanced schema for viewing detailed soil prediction logs in the admin dashboard.
    
    Attributes:
        id (uuid.UUID): Unique identifier of the prediction.
        user_id (uuid.UUID): ID of the user who made the prediction.
        username (str): Username of the user.
        user_email (str): Email of the user.
        soil_ph (Optional[float]): The provided soil pH.
        nitrogen (Optional[float]): Nitrogen value provided.
        phosphorus (Optional[float]): Phosphorus value provided.
        potassium (Optional[float]): Potassium value provided.
        organic_carbon (Optional[float]): Organic carbon value provided.
        calcium (Optional[float]): Calcium value provided.
        magnesium (Optional[float]): Magnesium value provided.
        soil_health_index (float): Computed overall health index.
        initial_soil_fertility_status (Optional[str]): Model-predicted starting fertility status.
        soil_fertility_status (Optional[str]): Final fertility status after processing.
        mentions (List[str]): Keywords or specific entities mentioned in the AI explanation.
        recommendations (List[str]): Actionable advice generated for the user.
        is_flagged (bool): Indicates if this prediction was flagged for review.
        admin_notes (Optional[str]): Administrative notes concerning this prediction.
        created_at (datetime): Timestamp when the prediction was generated.
        location_lat (Optional[float]): Latitude of the tested soil location.
        location_lng (Optional[float]): Longitude of the tested soil location.
        location_name (Optional[str]): Resolved name or address of the location.
    """
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    user_email: str
    
    # Soil data
    soil_ph: Optional[float]
    nitrogen: Optional[float]
    phosphorus: Optional[float]
    potassium: Optional[float]
    organic_carbon: Optional[float]
    calcium: Optional[float]
    magnesium: Optional[float]
    
    # Analysis results
    soil_health_index: float
    initial_soil_fertility_status: Optional[str] = None
    soil_fertility_status: Optional[str] = None
    mentions: List[str] = []
    recommendations: List[str] = []
    
    # Admin fields
    is_flagged: bool
    admin_notes: Optional[str]
    
    # Metadata
    created_at: datetime
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    location_name: Optional[str] = None

class AdminPredictionUpdate(BaseModel):
    """
    Schema for updating metadata on a user's prediction from the admin panel.
    
    Attributes:
        is_flagged (Optional[bool]): Set or unset the review flag.
        admin_notes (Optional[str]): Overwrite administrative notes.
    """
    is_flagged: Optional[bool] = None
    admin_notes: Optional[str] = Field(None, max_length=1000)

class AdminPredictionListResponse(BaseModel):
    """
    Paginated schema for listing predictions in the admin dashboard.
    
    Attributes:
        predictions (List[AdminPredictionResponse]): List of prediction objects for the current page.
        total (int): Total number of predictions matching the query.
        page (int): The current page number.
        size (int): The number of predictions per page.
        pages (int): The total number of available pages.
    """
    predictions: List[AdminPredictionResponse]
    total: int
    page: int
    size: int
    pages: int

# Dashboard schemas
class AdminDashboardStats(BaseModel):
    """
    Schema representing aggregated high-level statistics for the admin dashboard overview.
    
    Attributes:
        total_users (int): Total registered users.
        active_users (int): Total non-deactivated users.
        total_predictions (int): Total predictions made system-wide.
        flagged_predictions (int): Total predictions flagged for review.
        recent_users (int): Users registered within the recent tracking window.
        recent_predictions (int): Predictions made within the recent tracking window.
        users_by_role (dict): Count of users mapped by UserRoleEnum.
        predictions_by_status (dict): Count of predictions mapped by fertility status.
    """
    total_users: int
    active_users: int
    total_predictions: int
    flagged_predictions: int
    recent_users: int
    recent_predictions: int
    users_by_role: dict
    predictions_by_status: dict

class AdminDashboardResponse(BaseModel):
    """
    Comprehensive schema consolidating statistics, recent users, and recent predictions 
    for the admin dashboard's initial load.
    
    Attributes:
        stats (AdminDashboardStats): High-level numerical statistics.
        recent_users (List[AdminUserResponse]): A list of recently registered users.
        recent_predictions (List[AdminPredictionResponse]): A list of recently generated predictions.
        recent_audit_logs (List[AuditLogEntry]): A list of recent administrative actions.
    """
    stats: AdminDashboardStats
    recent_users: List[AdminUserResponse]
    recent_predictions: List[AdminPredictionResponse]
    recent_audit_logs: List[AuditLogEntry]