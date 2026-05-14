"""
Unit tests for AuthService
"""
import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from api.services.auth.auth_service import AuthService
from api.services.auth.core import AuthSecurityManager
from api.schema.auth_schema import UserCreate, UserLogin, UserUpdate
from api.db.models.database import User, UserRole


class TestAuthServiceRegistration:

    @pytest.fixture
    def auth_service(self, mock_db):
        return AuthService(mock_db)

    async def test_register_user_success(self, auth_service, mock_db):
        user_data = UserCreate(
            email="new@example.com",
            username="newuser",
            password="securepass",
            full_name="New User",
        )
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        result = await auth_service.register_user(user_data)

        assert result.email == user_data.email
        assert result.username == user_data.username
        assert result.full_name == user_data.full_name
        assert result.role == "user"
        assert result.is_active is True
        assert result.is_verified is False
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

    async def test_register_user_duplicate_raises(self, auth_service, mock_db):
        user_data = UserCreate(
            email="existing@example.com",
            username="existinguser",
            password="securepass",
            full_name="Existing",
        )
        mock_db.execute.return_value.scalar_one_or_none.return_value = User()

        with pytest.raises(ValueError, match="User with this email or username already exists"):
            await auth_service.register_user(user_data)

    async def test_register_rolls_back_on_db_error(self, auth_service, mock_db):
        user_data = UserCreate(
            email="fail@example.com",
            username="failuser",
            password="securepass",
            full_name="Fail",
        )
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        mock_db.commit.side_effect = Exception("DB error")

        with pytest.raises(Exception, match="DB error"):
            await auth_service.register_user(user_data)

        mock_db.rollback.assert_called_once()


class TestAuthServiceLogin:

    @pytest.fixture
    def auth_service(self, mock_db):
        return AuthService(mock_db)

    async def test_login_success(self, auth_service, mock_db, sample_user):
        credentials = UserLogin(username_or_email="regularuser", password="correctpass")
        sample_user.role = UserRole.USER

        with patch("api.services.auth.auth_service.AuthManager") as mock_mgr:
            mock_mgr.authenticate_user = AsyncMock(return_value=sample_user)
            result = await auth_service.login_user(credentials)

        assert "access_token" in result
        assert result["token_type"] == "bearer"
        assert result["user_role"] == "user"

    async def test_login_wrong_credentials_raises(self, auth_service, mock_db):
        credentials = UserLogin(username_or_email="nobody", password="wrongpass1")

        with patch("api.services.auth.auth_service.AuthManager") as mock_mgr:
            mock_mgr.authenticate_user = AsyncMock(return_value=None)

            with pytest.raises(ValueError, match="Incorrect username/email or password"):
                await auth_service.login_user(credentials)

    async def test_login_inactive_user_raises(self, auth_service, mock_db, sample_user):
        sample_user.is_active = False
        credentials = UserLogin(username_or_email="regularuser", password="correctpass")

        with patch("api.services.auth.auth_service.AuthManager") as mock_mgr:
            mock_mgr.authenticate_user = AsyncMock(return_value=sample_user)

            with pytest.raises(ValueError, match="Account is deactivated"):
                await auth_service.login_user(credentials)


class TestAuthServiceUpdate:

    @pytest.fixture
    def auth_service(self, mock_db):
        return AuthService(mock_db)

    async def test_update_user_full_name(self, auth_service, mock_db, sample_user):
        update = UserUpdate(full_name="Updated Name")
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        result = await auth_service.update_user(sample_user, update)

        assert result.full_name == "Updated Name"
        mock_db.commit.assert_called_once()

    async def test_update_user_email_success(self, auth_service, mock_db, sample_user):
        update = UserUpdate(email="updated@example.com")
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        result = await auth_service.update_user(sample_user, update)

        assert result.email == "updated@example.com"

    async def test_update_user_email_already_taken(self, auth_service, mock_db, sample_user):
        update = UserUpdate(email="taken@example.com")
        mock_db.execute.return_value.scalar_one_or_none.return_value = User()

        with pytest.raises(ValueError, match="Email already registered"):
            await auth_service.update_user(sample_user, update)

    async def test_update_rolls_back_on_error(self, auth_service, mock_db, sample_user):
        update = UserUpdate(full_name="Will Fail")
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        mock_db.commit.side_effect = Exception("commit failed")

        with pytest.raises(Exception):
            await auth_service.update_user(sample_user, update)

        mock_db.rollback.assert_called_once()


class TestAuthServicePassword:

    @pytest.fixture
    def auth_service(self, mock_db):
        return AuthService(mock_db)

    async def test_change_password_success(self, auth_service, mock_db, sample_user):
        real_hash = AuthSecurityManager.get_password_hash("oldpassword1")
        sample_user.hashed_password = real_hash

        await auth_service.change_password(sample_user, "oldpassword1", "newpassword1")

        assert AuthSecurityManager.verify_password("newpassword1", sample_user.hashed_password)
        mock_db.commit.assert_called_once()

    async def test_change_password_wrong_current_raises(self, auth_service, mock_db, sample_user):
        real_hash = AuthSecurityManager.get_password_hash("correctpass1")
        sample_user.hashed_password = real_hash

        with pytest.raises(ValueError, match="Current password is incorrect"):
            await auth_service.change_password(sample_user, "wrongpass123", "newpassword1")


class TestAuthServiceDelete:

    @pytest.fixture
    def auth_service(self, mock_db):
        return AuthService(mock_db)

    async def test_delete_user_success(self, auth_service, mock_db, sample_user):
        await auth_service.delete_user(sample_user)

        mock_db.delete.assert_called_once_with(sample_user)
        mock_db.commit.assert_called_once()

    async def test_delete_rolls_back_on_error(self, auth_service, mock_db, sample_user):
        mock_db.delete.side_effect = Exception("delete failed")

        with pytest.raises(Exception):
            await auth_service.delete_user(sample_user)

        mock_db.rollback.assert_called_once()


class TestAuthServicePermissions:

    @pytest.fixture
    def auth_service(self, mock_db):
        return AuthService(mock_db)

    def test_regular_user_permissions(self, auth_service, sample_user):
        result = auth_service.get_user_permissions(sample_user)

        assert result["username"] == sample_user.username
        perms = result["permissions"]
        assert perms["role"] == "user"
        assert perms["is_admin"] is False
        assert perms["is_super_admin"] is False
        assert perms["can_view_admin_panel"] is False

    def test_admin_user_permissions(self, auth_service, admin_user):
        result = auth_service.get_user_permissions(admin_user)

        perms = result["permissions"]
        assert perms["role"] == "admin"
        assert perms["is_admin"] is True
        assert perms["is_super_admin"] is False
        assert perms["can_view_admin_panel"] is True
        assert perms["can_manage_users"] is True

    def test_super_admin_permissions(self, auth_service, super_admin_user):
        result = auth_service.get_user_permissions(super_admin_user)

        perms = result["permissions"]
        assert perms["role"] == "super_admin"
        assert perms["is_super_admin"] is True
        assert perms["can_create_admin_users"] is True
        assert perms["can_delete_admin_users"] is True
