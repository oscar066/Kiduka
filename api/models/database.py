"""
Database models using SQLAlchemy ORM
"""
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, String, Boolean, DateTime, Numeric, Text, 
    ForeignKey, Table, ARRAY, JSON
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func

Base = declarative_base()

# Association table for many-to-many relationship between predictions and agrovets
prediction_agrovets = Table(
    'prediction_agrovets',
    Base.metadata,
    Column('prediction_id', UUID(as_uuid=True), ForeignKey('soil_predictions.id'), primary_key=True),
    Column('agrovet_id', UUID(as_uuid=True), ForeignKey('agrovets.id'), primary_key=True),
    Column('distance_km', Numeric(6, 2))
)

class User(Base):
    """User model for authentication and user management"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    predictions: Mapped[List["SoilPrediction"]] = relationship("SoilPrediction", back_populates="user")
    sessions: Mapped[List["UserSession"]] = relationship("UserSession", back_populates="user")

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
    products = Column(ARRAY(String), nullable=False, default=[])  # Array of product names like ["UREA", "CAN"]
    prices = Column(ARRAY(Numeric(10, 2)), nullable=False, default=[])  # Array of prices corresponding to products
    
    # Additional optional fields for future expansion
    address = Column(Text)
    phone = Column(String(20))
    email = Column(String(255))
    rating = Column(Numeric(2, 1))
    services = Column(ARRAY(String))  # Additional services beyond products
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    predictions: Mapped[List["SoilPrediction"]] = relationship("SoilPrediction", secondary=prediction_agrovets, back_populates="agrovets")

class UserSession(Base):
    """User session model for session management"""
    __tablename__ = "user_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")