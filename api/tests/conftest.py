"""
Shared pytest fixtures for all tests
"""
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.models.database import User, SoilPrediction, UserRole


@pytest.fixture
def mock_db():
    """Async database session mock"""
    db = AsyncMock(spec=AsyncSession)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    db.rollback = AsyncMock()
    return db


@pytest.fixture
def user_id():
    return uuid.uuid4()


@pytest.fixture
def admin_id():
    return uuid.uuid4()


@pytest.fixture
def super_admin_id():
    return uuid.uuid4()


@pytest.fixture
def sample_user(user_id):
    """Regular USER role user"""
    user = MagicMock(spec=User)
    user.id = user_id
    user.email = "user@example.com"
    user.username = "regularuser"
    user.full_name = "Regular User"
    user.hashed_password = "$2b$12$fakehash"
    user.role = UserRole.USER
    user.is_active = True
    user.is_verified = False
    user.created_at = datetime(2024, 1, 1)
    user.updated_at = datetime(2024, 1, 1)
    user.last_login = None
    user.created_by = None
    user.notes = None
    user.is_admin = MagicMock(return_value=False)
    user.is_super_admin = MagicMock(return_value=False)
    return user


@pytest.fixture
def admin_user(admin_id):
    """ADMIN role user"""
    user = MagicMock(spec=User)
    user.id = admin_id
    user.email = "admin@example.com"
    user.username = "adminuser"
    user.full_name = "Admin User"
    user.hashed_password = "$2b$12$fakehash"
    user.role = UserRole.ADMIN
    user.is_active = True
    user.is_verified = True
    user.created_at = datetime(2024, 1, 1)
    user.updated_at = datetime(2024, 1, 1)
    user.last_login = None
    user.created_by = None
    user.notes = None
    user.is_admin = MagicMock(return_value=True)
    user.is_super_admin = MagicMock(return_value=False)
    return user


@pytest.fixture
def super_admin_user(super_admin_id):
    """SUPER_ADMIN role user"""
    user = MagicMock(spec=User)
    user.id = super_admin_id
    user.email = "superadmin@example.com"
    user.username = "superadmin"
    user.full_name = "Super Admin"
    user.hashed_password = "$2b$12$fakehash"
    user.role = UserRole.SUPER_ADMIN
    user.is_active = True
    user.is_verified = True
    user.created_at = datetime(2024, 1, 1)
    user.updated_at = datetime(2024, 1, 1)
    user.last_login = None
    user.created_by = None
    user.notes = None
    user.is_admin = MagicMock(return_value=True)
    user.is_super_admin = MagicMock(return_value=True)
    return user


@pytest.fixture
def sample_prediction(user_id):
    """A minimal SoilPrediction mock"""
    pred = MagicMock(spec=SoilPrediction)
    pred.id = uuid.uuid4()
    pred.user_id = user_id
    pred.soil_ph = 6.2
    pred.nitrogen = 0.18
    pred.phosphorus = 25.0
    pred.potassium = 120.0
    pred.organic_carbon = 2.5
    pred.calcium = 1200.0
    pred.magnesium = 200.0
    pred.location_lat = -1.2921
    pred.location_lng = 36.8219
    pred.location_name = "Nairobi"
    pred.soil_health_index = 3.1
    pred.initial_soil_fertility_status = "Moderately Healthy"
    pred.soil_fertility_status = "Moderately Healthy"
    pred.mentions = []
    pred.recommendations = ["Maintain current practices"]
    pred.nutrients = {}
    pred.prediction_mode = "FORMULA"
    pred.confidence_data = {}
    pred.is_flagged = False
    pred.admin_notes = None
    pred.created_at = datetime(2024, 6, 1)
    pred.updated_at = datetime(2024, 6, 1)
    pred.agrovets = []
    return pred
