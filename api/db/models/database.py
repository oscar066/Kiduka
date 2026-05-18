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
from sqlalchemy.orm import declarative_base, relationship, Mapped
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
    """
    Enhanced User model representing a registered account on the platform.
    
    Attributes:
        id (UUID): Primary key.
        email (str): Unique email address used for login and communication.
        username (str): Unique display name for the user.
        hashed_password (str): Bcrypt hashed password.
        full_name (str): User's real name.
        role (UserRole): Role-based access level (USER, ADMIN, SUPER_ADMIN).
        is_active (bool): Whether the account is currently enabled.
        is_verified (bool): Whether the user's email has been verified.
        created_at (datetime): Timestamp of account creation.
        updated_at (datetime): Timestamp of last account update.
        last_login (datetime): Timestamp of the most recent successful login.
        created_by (UUID): The ID of the admin who created this account, if applicable.
        notes (str): Administrative notes regarding this user.
    """
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
    """
    Soil prediction model storing historical analysis results for a specific location.
    
    Attributes:
        id (UUID): Primary key.
        user_id (UUID): Foreign key linking to the User who requested the prediction.
        session_id (str): Reference to the session during which the prediction occurred.
        soil_ph (Numeric): The inputted or measured pH level.
        nitrogen (Numeric): Model-predicted or inputted Nitrogen level.
        phosphorus (Numeric): Model-predicted or inputted Phosphorus level.
        potassium (Numeric): Model-predicted or inputted Potassium level.
        organic_carbon (Numeric): Model-predicted or inputted Organic Carbon level.
        calcium (Numeric): Model-predicted or inputted Calcium level.
        magnesium (Numeric): Model-predicted or inputted Magnesium level.
        location_lat (Numeric): Latitude of the tested soil.
        location_lng (Numeric): Longitude of the tested soil.
        location_name (str): Human-readable name for the location.
        soil_health_index (Numeric): The calculated composite health score.
        initial_soil_fertility_status (str): Basic classification before advanced processing.
        soil_fertility_status (str): Final classification label (e.g., 'Healthy', 'Poor').
        mentions (JSONB): Structured warnings or notable traits identified during analysis.
        recommendations (JSONB): Actionable advice for improving the soil.
        prediction_mode (str): Indicates if the prediction was 'FORMULA' or 'ML' based.
        confidence_data (JSONB): Statistical confidence metrics from the ML models.
        nutrients (JSONB): Categorical labels and scores for individual nutrients.
        is_flagged (bool): Indicates if an admin has flagged this prediction for review.
        admin_notes (Text): Administrative comments regarding this prediction.
    """
    __tablename__ = "soil_predictions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_id = Column(String(255))
    
    # Input soil data
    # simplified_texture = Column(String(50)) # Removed
    soil_ph = Column(Numeric(4, 2))
    nitrogen = Column(Numeric(10, 2))
    phosphorus = Column(Numeric(10, 2))
    potassium = Column(Numeric(10, 2))
    organic_carbon = Column(Numeric(5, 2))
    calcium = Column(Numeric(10, 2))
    magnesium = Column(Numeric(10, 2))
    location_lat = Column(Numeric(10, 8))
    location_lng = Column(Numeric(11, 8))
    location_name = Column(String(255))
    
    # Analysis results
    soil_health_index = Column(Numeric(5, 2))
    initial_soil_fertility_status = Column(String(100))
    soil_fertility_status = Column(String(100))
    mentions = Column(JSONB, nullable=False, server_default='[]')
    recommendations = Column(JSONB, nullable=False, server_default='[]')
    
    # ML Metadata
    prediction_mode = Column(String(50), nullable=True) # "FORMULA" or "ML"
    confidence_data = Column(JSONB, nullable=True)    # Store confidence metrics
    nutrients = Column(JSONB, nullable=True)          # Store uniform nutrient scores/labels
    
    # Metadata and Admin
    is_flagged = Column(Boolean, default=False)
    admin_notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="predictions")
    agrovets: Mapped[List["Agrovet"]] = relationship("Agrovet", secondary=prediction_agrovets, back_populates="predictions")

class Agrovet(Base):
    """
    Agrovet model representing a physical agricultural supply store.
    
    Attributes:
        id (UUID): Primary key.
        name (str): Business name of the agrovet.
        latitude (Numeric): GPS latitude of the physical store.
        longitude (Numeric): GPS longitude of the physical store.
        products (ARRAY): List of product categories available.
        prices (ARRAY): Corresponding typical prices for products.
        address (Text): Physical street address.
        phone (str): Contact phone number.
        email (str): Contact email address.
        rating (Numeric): Aggregate customer rating.
        services (ARRAY): List of additional services provided (e.g., 'Soil Testing').
        is_active (bool): Whether the store is currently operational.
        is_verified (bool): Indicates if the store details have been verified by admins.
        admin_notes (Text): Internal notes maintained by administrators.
        created_by (UUID): Foreign key linking to the admin who added the store.
    """
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
    """
    User session model for tracking active authentications and security.
    
    Attributes:
        id (UUID): Primary key.
        user_id (UUID): Foreign key linking to the authenticated User.
        session_token (str): The unique JWT or session identifier.
        expires_at (datetime): The precise timestamp when this session expires.
        created_at (datetime): Timestamp when the session was initiated.
        last_accessed (datetime): Timestamp of the last API request using this session.
        ip_address (str): The IP address from which the session was initiated.
        user_agent (Text): The client browser or application identifier.
        is_active (bool): Flag to manually revoke or invalidate the session.
    """
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
    """
    Audit log model for tracking sensitive administrative actions.
    
    Attributes:
        id (UUID): Primary key.
        admin_user_id (UUID): Foreign key linking to the admin who performed the action.
        target_user_id (UUID): Optional foreign key to the user affected by the action.
        target_prediction_id (UUID): Optional foreign key to a targeted prediction record.
        target_agrovet_id (UUID): Optional foreign key to a targeted agrovet record.
        action (str): A standardized string describing the operation (e.g., 'delete_user').
        details (JSONB): Additional context or payload diffs related to the action.
        ip_address (str): The IP address of the admin performing the action.
        user_agent (Text): The client software used by the admin.
        created_at (datetime): Timestamp when the action was recorded.
    """
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