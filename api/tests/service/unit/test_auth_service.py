"""
Unit tests for AuthService
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from api.services.auth.auth_service import AuthService
from api.schema.auth_schema import UserCreate, UserLogin, UserUpdate
from api.db.models.database import User, UserRole

class TestAuthService:
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return AsyncMock(spec=AsyncSession)
    
    @pytest.fixture
    def auth_service(self, mock_db):
        """AuthService instance with mocked database"""
        return AuthService(mock_db)
    
    @pytest.fixture
    def sample_user(self):
        """Sample user for testing"""
        return User(
            id="test-user-id",
            email="test@example.com",
            username="testuser",
            full_name="Test User",
            role=UserRole.USER,
            is_active=True,
            is_verified=False
        )
    
    @pytest.mark.asyncio
    async def test_register_user_success(self, auth_service, mock_db):
        """Test successful user registration"""
        user_data = UserCreate(
            email="test@example.com",
            username="testuser",
            password="password123",
            full_name="Test User"
        )
        
        # Mock that user doesn't exist
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        
        # Mock commit and refresh
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        result = await auth_service.register_user(user_data)
        
        # Verify user was created
        assert result.email == user_data.email
        assert result.username == user_data.username
        assert result.full_name == user_data.full_name
        assert result.role == "user"
        assert result.is_active == True
        assert result.is_verified == False
        
        # Verify database operations
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_register_user_already_exists(self, auth_service, mock_db):
        """Test registration when user already exists"""
        user_data = UserCreate(
            email="test@example.com",
            username="testuser",
            password="password123",
            full_name="Test User"
        )
        
        # Mock that user already exists
        mock_db.execute.return_value.scalar_one_or_none.return_value = User()
        
        # Should raise ValueError
        with pytest.raises(ValueError, match="User with this email or username already exists"):
            await auth_service.register_user(user_data)
    
    @pytest.mark.asyncio
    async def test_update_user_success(self, auth_service, mock_db, sample_user):
        """Test successful user update"""
        user_update = UserUpdate(
            full_name="Updated Name",
            email="updated@example.com"
        )
        
        # Mock that new email doesn't exist
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        result = await auth_service.update_user(sample_user, user_update)
        
        # Verify updates
        assert result.full_name == "Updated Name"
        assert result.email == "updated@example.com"
        
        # Verify database operations
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_user_email_conflict(self, auth_service, mock_db, sample_user):
        """Test user update with email conflict"""
        user_update = UserUpdate(email="existing@example.com")
        
        # Mock that email already exists
        mock_db.execute.return_value.scalar_one_or_none.return_value = User()
        
        # Should raise ValueError
        with pytest.raises(ValueError, match="Email already registered"):
            await auth_service.update_user(sample_user, user_update)
    
    def test_get_user_permissions(self, auth_service, sample_user):
        """Test getting user permissions"""
        result = auth_service.get_user_permissions(sample_user)
        
        assert result["user_id"] == sample_user.id
        assert result["username"] == sample_user.username
        assert result["permissions"]["role"] == "user"
        assert result["permissions"]["is_admin"] == False
        assert result["permissions"]["is_super_admin"] == False
        assert result["permissions"]["can_view_admin_panel"] == False