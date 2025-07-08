"""
Enhanced authentication schemas with role-based access control
"""
import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum

# User role enum for Pydantic
class UserRoleEnum(str, Enum):
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None

class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=8, max_length=100)

class AdminUserCreate(UserCreate):
    """Admin user creation schema (only admins can set roles)"""
    role: UserRoleEnum = Field(default=UserRoleEnum.USER)
    notes: Optional[str] = Field(None, max_length=1000)

class UserLogin(BaseModel):
    """User login schema"""
    username_or_email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    """User response schema"""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    role: UserRoleEnum
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

class AdminUserResponse(UserResponse):
    """Extended user response for admin views"""
    created_by: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    prediction_count: Optional[int] = None
    session_count: Optional[int] = None

class UserUpdate(BaseModel):
    """User update schema"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class AdminUserUpdate(UserUpdate):
    """Admin user update schema (admins can update more fields)"""
    role: Optional[UserRoleEnum] = None
    is_verified: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=1000)

class Token(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_role: UserRoleEnum

class TokenData(BaseModel):
    """Token data schema"""
    user_id: Optional[str] = None
    username: Optional[str] = None
    role: Optional[UserRoleEnum] = None

class PasswordChange(BaseModel):
    """Password change schema"""
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8, max_length=100)

class AdminPasswordReset(BaseModel):
    """Admin password reset schema (no current password required)"""
    new_password: str = Field(..., min_length=8, max_length=100)

class PasswordReset(BaseModel):
    """Password reset schema"""
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

# Admin management schemas
class UserListResponse(BaseModel):
    """User list response for admin dashboard"""
    users: List[AdminUserResponse]
    total: int
    page: int
    size: int
    pages: int

class UserStatsResponse(BaseModel):
    """User statistics for admin dashboard"""
    total_users: int
    active_users: int
    verified_users: int
    users_by_role: dict
    recent_registrations: int
    total_predictions: int

class AuditLogEntry(BaseModel):
    """Audit log entry schema"""
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
    """Audit log list response"""
    logs: List[AuditLogEntry]
    total: int
    page: int
    size: int
    pages: int

# Prediction management schemas for admin
class AdminPredictionResponse(BaseModel):
    """Enhanced prediction response for admin views"""
    model_config = ConfigDict(from_attributes=True)
    
    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    user_email: str
    
    # Soil data
    simplified_texture: Optional[str]
    soil_ph: Optional[float]
    nitrogen: Optional[float]
    phosphorus: Optional[float]
    potassium: Optional[float]
    
    # Predictions
    fertility_prediction: Optional[str]
    fertility_confidence: Optional[float]
    fertilizer_recommendation: Optional[str]
    fertilizer_confidence: Optional[float]
    
    # Admin fields
    is_flagged: bool
    admin_notes: Optional[str]
    
    # Metadata
    created_at: datetime
    location_name: Optional[str] = None

class AdminPredictionUpdate(BaseModel):
    """Admin prediction update schema"""
    is_flagged: Optional[bool] = None
    admin_notes: Optional[str] = Field(None, max_length=1000)

class AdminPredictionListResponse(BaseModel):
    """Admin prediction list response"""
    predictions: List[AdminPredictionResponse]
    total: int
    page: int
    size: int
    pages: int

# Dashboard schemas
class AdminDashboardStats(BaseModel):
    """Admin dashboard statistics"""
    total_users: int
    active_users: int
    total_predictions: int
    flagged_predictions: int
    recent_users: int
    recent_predictions: int
    users_by_role: dict
    predictions_by_status: dict

class AdminDashboardResponse(BaseModel):
    """Complete admin dashboard response"""
    stats: AdminDashboardStats
    recent_users: List[AdminUserResponse]
    recent_predictions: List[AdminPredictionResponse]
    recent_audit_logs: List[AuditLogEntry]