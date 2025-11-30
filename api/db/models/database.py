"""
Enhanced database models with role-based authentication
"""
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, String, Boolean, DateTime, Numeric, Text, 
    ForeignKey, Table, ARRAY, JSON, Enum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func
import enum

Base = declarative_base()

# User roles enum
class UserRole(enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

# Association table for many-to-many relationship between predictions and agrovets
prediction_agrovets = Table(
    'prediction_agrovets',
    Base.metadata,
    Column('prediction_id', UUID(as_uuid=True), ForeignKey('soil_predictions.id'), primary_key=True),
    Column('agrovet_id', UUID(as_uuid=True), ForeignKey('agrovets.id'), primary_key=True),
    Column('distance_km', Numeric(6, 2))
)

class User(Base):
    """Enhanced User model with role-based authentication"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    
    # Role-based fields
    role = Column(
        Enum(UserRole, name="user_role", values_callable=lambda obj: [e.value for e in obj]),
        nullable=False, 
        default=UserRole.USER
    )
    
    # Status fields
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Additional admin fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)  # Admin notes about the user
    
    # Relationships
    predictions: Mapped[List["SoilPrediction"]] = relationship("SoilPrediction", back_populates="user")
    sessions: Mapped[List["UserSession"]] = relationship("UserSession", back_populates="user")
    created_users: Mapped[List["User"]] = relationship("User", remote_side=[id])
    
    def is_admin(self) -> bool:
        """Check if user has admin privileges"""
        return self.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    
    def is_super_admin(self) -> bool:
        """Check if user is a super admin"""
        return self.role == UserRole.SUPER_ADMIN
    
    def can_manage_user(self, target_user: "User") -> bool:
        """Check if this user can manage another user"""
        if self.role == UserRole.SUPER_ADMIN:
            return True
        elif self.role == UserRole.ADMIN:
            # Admins can manage regular users but not other admins
            return target_user.role == UserRole.USER
        else:
            # Regular users can only manage themselves
            return self.id == target_user.id

class SoilPrediction(Base):
    """Soil prediction model to store prediction history"""
    __tablename__ = "soil_predictions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_id = Column(String(255))
    
    # Input soil data
    simplified_texture = Column(String(50))
    soil_ph = Column(Numeric(4, 2))
    nitrogen = Column(Numeric(10, 2))
    phosphorus = Column(Numeric(10, 2))
    potassium = Column(Numeric(10, 2))
    organic_matter = Column(Numeric(5, 2))
    calcium = Column(Numeric(10, 2))
    magnesium = Column(Numeric(10, 2))
    copper = Column(Numeric(10, 2))
    iron = Column(Numeric(10, 2))
    zinc = Column(Numeric(10, 2))
    location_lat = Column(Numeric(10, 8))
    location_lng = Column(Numeric(11, 8))
    location_name = Column(String(255))
    
    # Core prediction results
    fertility_prediction = Column(String(50))
    fertility_confidence = Column(Numeric(5, 4))
    fertilizer_recommendation = Column(String(100))
    fertilizer_confidence = Column(Numeric(5, 4))
    
    # Structured AI response (stored as JSON)
    structured_response = Column(JSONB, nullable=True)
    
    # Admin fields
    is_flagged = Column(Boolean, default=False)  # Admin can flag problematic predictions
    admin_notes = Column(Text, nullable=True)    # Admin notes about this prediction
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="predictions")
    agrovets: Mapped[List["Agrovet"]] = relationship("Agrovet", secondary=prediction_agrovets, back_populates="predictions")

class Agrovet(Base):
    """Agrovet model updated to match actual API response structure"""
    __tablename__ = "agrovets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Core required fields (matching API response)
    name = Column(String(255), nullable=False)
    latitude = Column(Numeric(10, 8), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=False)
    products = Column(ARRAY(String), nullable=False, default=[])
    prices = Column(ARRAY(Numeric(10, 2)), nullable=False, default=[])
    
    # Additional optional fields
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(255))
    rating = Column(Numeric(2, 1))
    services = Column(ARRAY(String))
    
    # Admin management fields
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)  # Admin verification
    admin_notes = Column(Text, nullable=True)     # Admin notes
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    predictions: Mapped[List["SoilPrediction"]] = relationship("SoilPrediction", secondary=prediction_agrovets, back_populates="agrovets")
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])

class UserSession(Base):
    """User session model for session management"""
    __tablename__ = "user_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed = Column(DateTime(timezone=True), server_default=func.now())
    
    # Session metadata for admin monitoring
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")

class AdminAuditLog(Base):
    """Audit log for admin actions"""
    __tablename__ = "admin_audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    target_prediction_id = Column(UUID(as_uuid=True), ForeignKey("soil_predictions.id"), nullable=True)
    target_agrovet_id = Column(UUID(as_uuid=True), ForeignKey("agrovets.id"), nullable=True)
    
    action = Column(String(100), nullable=False)  # e.g., "view_user_data", "delete_prediction", etc.
    details = Column(JSONB, nullable=True)        # Additional action details
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    admin_user: Mapped["User"] = relationship("User", foreign_keys=[admin_user_id])
    target_user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[target_user_id])
    target_prediction: Mapped[Optional["SoilPrediction"]] = relationship("SoilPrediction")
    target_agrovet: Mapped[Optional["Agrovet"]] = relationship("Agrovet")