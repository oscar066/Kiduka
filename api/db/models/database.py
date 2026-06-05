"""
Enhanced database models with role-based authentication and CDC support.

This module defines all SQLAlchemy ORM models for the platform, including:
- User accounts with role-based access (USER, CDC, ADMIN, SUPER_ADMIN)
- Soil prediction records with optional CDC attribution
- Agrovets, sessions, and audit logs
- CDC notification tracking for email and SMS dispatch
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


# Enumeration types

class UserRole(enum.Enum):
    """
    User roles defining the access level of each account.

    Attributes:
        USER: Standard farmer account. Can view own dashboard and predictions.
        CDC: Community Development Coordinator. Can run analyses for farmers
            and send results via email / SMS.
        ADMIN: Administrator. Can manage users, predictions, and agrovets.
        SUPER_ADMIN: Full system access, including admin and CDC user creation.
    """
    USER = "user"
    CDC = "cdc"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class NotificationMethod(enum.Enum):
    """
    Delivery channel(s) used when a CDC sends results to a farmer.

    Attributes:
        EMAIL: Send only via email.
        SMS: Send only via SMS (Africa's Talking).
        BOTH: Send via both email and SMS.
    """
    EMAIL = "email"
    SMS = "sms"
    BOTH = "both"


class NotificationStatus(enum.Enum):
    """
    Delivery status of a CDC notification attempt.

    Attributes:
        PENDING: Dispatch has been queued but not yet attempted.
        SENT: All selected channels were dispatched successfully.
        FAILED: One or more channels failed to deliver.
        PARTIAL: Only one of two requested channels succeeded.
    """
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    PARTIAL = "partial"

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

    Supports four access levels: standard farmers (USER), field coordinators
    (CDC), platform administrators (ADMIN), and super administrators (SUPER_ADMIN).

    Attributes:
        id (UUID): Primary key.
        email (str): Unique email address used for login and communication.
        username (str): Unique display name for the user.
        hashed_password (str): Bcrypt hashed password.
        full_name (str): User's real name.
        phone_number (str): Contact phone number, used for SMS notifications.
        role (UserRole): Role-based access level (USER, CDC, ADMIN, SUPER_ADMIN).
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

    # Contact information — phone_number is used for SMS notification delivery
    phone_number = Column(String(20), nullable=True)

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

    # Self-service password reset
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    predictions: Mapped[List["SoilPrediction"]] = relationship(
        "SoilPrediction",
        back_populates="user",
        foreign_keys="SoilPrediction.user_id"
    )
    # Predictions that this CDC user has performed on behalf of farmers
    cdc_performed_predictions: Mapped[List["SoilPrediction"]] = relationship(
        "SoilPrediction",
        back_populates="cdc_user",
        foreign_keys="SoilPrediction.performed_by_cdc_id"
    )
    sessions: Mapped[List["UserSession"]] = relationship("UserSession", back_populates="user")
    created_users: Mapped[List["User"]] = relationship("User", remote_side=[id])
    # Notifications sent by this CDC user
    sent_notifications: Mapped[List["CDCNotification"]] = relationship(
        "CDCNotification",
        back_populates="cdc_user",
        foreign_keys="CDCNotification.sent_by_cdc_id"
    )
    # Notifications received by this farmer
    received_notifications: Mapped[List["CDCNotification"]] = relationship(
        "CDCNotification",
        back_populates="farmer",
        foreign_keys="CDCNotification.farmer_id"
    )

    # Role helper methods

    def is_admin(self) -> bool:
        """Check if user has admin privileges (ADMIN or SUPER_ADMIN only)."""
        return self.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]

    def is_super_admin(self) -> bool:
        """Check if user is a super admin."""
        return self.role == UserRole.SUPER_ADMIN

    def is_cdc(self) -> bool:
        """Check if user is a Community Development Coordinator (CDC)."""
        return self.role == UserRole.CDC

    def is_privileged(self) -> bool:
        """
        Check if user holds any elevated role (CDC, ADMIN, or SUPER_ADMIN).

        Useful for audit logging gates that apply to all non-farmer accounts.
        """
        return self.role in [UserRole.CDC, UserRole.ADMIN, UserRole.SUPER_ADMIN]

    def can_manage_user(self, target_user: "User") -> bool:
        """
        Check if this user can manage (edit/delete) another user.

        Rules:
        - SUPER_ADMIN can manage anyone.
        - ADMIN can manage USER and CDC accounts.
        - All others can only manage themselves.

        Args:
            target_user (User): The user whose account would be managed.

        Returns:
            bool: True if the operation is permitted.
        """
        if self.role == UserRole.SUPER_ADMIN:
            return True
        elif self.role == UserRole.ADMIN:
            # Admins manage regular farmers and CDC officers, not other admins
            return target_user.role in [UserRole.USER, UserRole.CDC]
        else:
            # Regular users / CDC users can only manage themselves
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
        performed_by_cdc_id (UUID): FK to the CDC user who ran this analysis on behalf of
            the farmer. NULL when the farmer ran the analysis themselves.
        cdc_notes (Text): Field observations entered by the CDC during the site visit.
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
    
    # Admin and moderation fields
    is_flagged = Column(Boolean, default=False)
    admin_notes = Column(Text, nullable=True)

    # CDC attribution — set when a CDC officer runs the analysis on behalf of a farmer.
    # If NULL the farmer ran the analysis themselves.
    performed_by_cdc_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )
    # Optional field notes added by the CDC during the on-site visit
    cdc_notes = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="predictions",
        foreign_keys=[user_id]
    )
    # The CDC user who performed this analysis (None if self-service)
    cdc_user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="cdc_performed_predictions",
        foreign_keys=[performed_by_cdc_id]
    )
    agrovets: Mapped[List["Agrovet"]] = relationship(
        "Agrovet",
        secondary=prediction_agrovets,
        back_populates="predictions"
    )
    # Notifications dispatched for this prediction
    notifications: Mapped[List["CDCNotification"]] = relationship(
        "CDCNotification",
        back_populates="prediction"
    )

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


class CDCNotification(Base):
    """
    Tracks every notification dispatched by a CDC officer to a farmer.

    A CDC user can send analysis results to a farmer via email, SMS, or both.
    Each dispatch attempt is recorded here so the CDC dashboard can display
    delivery status and the farmer's dashboard can show when they were notified.

    Attributes:
        id (UUID): Primary key.
        prediction_id (UUID): FK to the SoilPrediction whose results were sent.
        sent_by_cdc_id (UUID): FK to the CDC User who triggered the dispatch.
        farmer_id (UUID): FK to the farmer User who received (or should receive) the results.
        method (NotificationMethod): Channel used — EMAIL, SMS, or BOTH.
        status (NotificationStatus): Current delivery outcome — PENDING, SENT, FAILED, PARTIAL.
        email_status (str): Granular status of the email channel ('sent', 'failed', 'skipped').
        sms_status (str): Granular status of the SMS channel ('sent', 'failed', 'skipped').
        error_message (Text): Error detail when status is FAILED or PARTIAL.
        sent_at (datetime): Timestamp when the dispatch was attempted.
        created_at (datetime): Record creation timestamp.
    """
    __tablename__ = "cdc_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign keys
    prediction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("soil_predictions.id"),
        nullable=False,
        index=True
    )
    sent_by_cdc_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    farmer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Delivery configuration
    method = Column(
        Enum(NotificationMethod, name="notification_method",
             values_callable=lambda obj: [e.value for e in obj]),
        nullable=False
    )

    # Overall delivery status
    status = Column(
        Enum(NotificationStatus, name="notification_status",
             values_callable=lambda obj: [e.value for e in obj]),
        nullable=False,
        default=NotificationStatus.PENDING
    )

    # Per-channel granular status ('sent' | 'failed' | 'skipped' | 'pending')
    email_status = Column(String(20), nullable=True, default="skipped")
    sms_status = Column(String(20), nullable=True, default="skipped")

    # Error details when delivery fails
    error_message = Column(Text, nullable=True)

    # Timestamps
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    prediction: Mapped["SoilPrediction"] = relationship(
        "SoilPrediction",
        back_populates="notifications"
    )
    cdc_user: Mapped["User"] = relationship(
        "User",
        back_populates="sent_notifications",
        foreign_keys=[sent_by_cdc_id]
    )
    farmer: Mapped["User"] = relationship(
        "User",
        back_populates="received_notifications",
        foreign_keys=[farmer_id]
    )