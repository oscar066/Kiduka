"""
Unit tests for AdminUserService
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from api.services.admin.user_service import AdminUserService
from api.schema.auth_schema import AdminUserCreate, AdminUserUpdate, UserRoleEnum
from api.db.models.database import User, UserRole


class TestGetUsersWithFilters:

    @pytest.fixture
    def service(self, mock_db):
        return AdminUserService(mock_db)

    async def test_returns_paginated_user_list(self, service, mock_db, sample_user):
        mock_db.execute.return_value.scalars.return_value.all.return_value = [sample_user]
        mock_db.execute.return_value.scalar.return_value = 1

        result = await service.get_users_with_filters(page=1, size=20)

        assert result.total == 1
        assert result.page == 1
        assert len(result.users) == 1

    async def test_empty_result_when_no_users(self, service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        mock_db.execute.return_value.scalar.return_value = 0

        result = await service.get_users_with_filters()

        assert result.total == 0
        assert result.users == []

    async def test_pages_calculated_correctly(self, service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        mock_db.execute.return_value.scalar.return_value = 45

        result = await service.get_users_with_filters(page=1, size=20)

        assert result.pages == 3


class TestCreateUser:

    @pytest.fixture
    def service(self, mock_db):
        return AdminUserService(mock_db)

    async def test_super_admin_can_create_admin_user(self, service, mock_db, super_admin_user):
        user_data = AdminUserCreate(
            email="newadmin@example.com",
            username="newadmin",
            password="securepass1",
            full_name="New Admin",
            role=UserRoleEnum.ADMIN,
        )
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        result = await service.create_user(user_data, created_by=super_admin_user)

        assert result.email == user_data.email
        assert result.role == UserRoleEnum.ADMIN
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    async def test_regular_admin_cannot_create_admin_user(self, service, mock_db, admin_user):
        user_data = AdminUserCreate(
            email="another@example.com",
            username="anotheradmin",
            password="securepass1",
            full_name="Another",
            role=UserRoleEnum.ADMIN,
        )

        with pytest.raises(ValueError, match="Only super admins can create admin users"):
            await service.create_user(user_data, created_by=admin_user)

    async def test_duplicate_user_raises(self, service, mock_db, super_admin_user):
        user_data = AdminUserCreate(
            email="dup@example.com",
            username="dupuser",
            password="securepass1",
            full_name="Dup",
            role=UserRoleEnum.USER,
        )
        mock_db.execute.return_value.scalar_one_or_none.return_value = User()

        with pytest.raises(ValueError, match="User with this email or username already exists"):
            await service.create_user(user_data, created_by=super_admin_user)

    async def test_create_rolls_back_on_error(self, service, mock_db, super_admin_user):
        user_data = AdminUserCreate(
            email="fail@example.com",
            username="failuser",
            password="securepass1",
            full_name="Fail",
            role=UserRoleEnum.USER,
        )
        mock_db.execute.return_value.scalar_one_or_none.return_value = None
        mock_db.commit.side_effect = Exception("DB error")

        with pytest.raises(Exception):
            await service.create_user(user_data, created_by=super_admin_user)

        mock_db.rollback.assert_called_once()


class TestUpdateUser:

    @pytest.fixture
    def service(self, mock_db):
        return AdminUserService(mock_db)

    async def test_super_admin_can_update_any_user(self, service, mock_db, super_admin_user, sample_user):
        update = AdminUserUpdate(full_name="Changed Name")

        with patch("api.services.admin.user_service.AuthManager") as mock_mgr:
            mock_mgr.get_user_by_id = AsyncMock(return_value=sample_user)
            mock_db.execute.return_value.scalar_one_or_none.return_value = None

            result = await service.update_user(
                str(sample_user.id), update, updated_by=super_admin_user
            )

        assert result.full_name == "Changed Name"

    async def test_admin_cannot_update_another_admin(self, service, mock_db, admin_user):
        other_admin = MagicMock(spec=User)
        other_admin.id = uuid.uuid4()
        other_admin.role = UserRole.ADMIN
        other_admin.is_admin = MagicMock(return_value=True)
        other_admin.is_super_admin = MagicMock(return_value=False)

        update = AdminUserUpdate(full_name="Hacked")

        with patch("api.services.admin.user_service.AuthManager") as mock_mgr:
            mock_mgr.get_user_by_id = AsyncMock(return_value=other_admin)

            with pytest.raises(ValueError, match="Insufficient permissions"):
                await service.update_user(
                    str(other_admin.id), update, updated_by=admin_user
                )

    async def test_update_nonexistent_user_raises(self, service, mock_db, super_admin_user):
        update = AdminUserUpdate(full_name="Ghost")

        with patch("api.services.admin.user_service.AuthManager") as mock_mgr:
            mock_mgr.get_user_by_id = AsyncMock(return_value=None)

            with pytest.raises(ValueError, match="User not found"):
                await service.update_user(str(uuid.uuid4()), update, updated_by=super_admin_user)


class TestDeleteUser:

    @pytest.fixture
    def service(self, mock_db):
        return AdminUserService(mock_db)

    async def test_super_admin_can_delete_regular_user(
        self, service, mock_db, super_admin_user, sample_user
    ):
        with patch("api.services.admin.user_service.AuthManager") as mock_mgr:
            mock_mgr.get_user_by_id = AsyncMock(return_value=sample_user)

            result = await service.delete_user(str(sample_user.id), deleted_by=super_admin_user)

        assert "deleted_user" in result
        mock_db.delete.assert_called_once_with(sample_user)

    async def test_super_admin_cannot_delete_themselves(
        self, service, mock_db, super_admin_user
    ):
        # target == caller → blocked
        with patch("api.services.admin.user_service.AuthManager") as mock_mgr:
            mock_mgr.get_user_by_id = AsyncMock(return_value=super_admin_user)

            with pytest.raises(ValueError, match="Insufficient permissions"):
                await service.delete_user(str(super_admin_user.id), deleted_by=super_admin_user)

    async def test_delete_nonexistent_user_raises(self, service, mock_db, super_admin_user):
        with patch("api.services.admin.user_service.AuthManager") as mock_mgr:
            mock_mgr.get_user_by_id = AsyncMock(return_value=None)

            with pytest.raises(ValueError, match="User not found"):
                await service.delete_user(str(uuid.uuid4()), deleted_by=super_admin_user)


class TestPermissionHelpers:

    @pytest.fixture
    def service(self, mock_db):
        return AdminUserService(mock_db)

    def test_super_admin_can_edit_anyone(self, service, super_admin_user, sample_user):
        assert service._can_edit_user(super_admin_user, sample_user) is True

    def test_admin_can_edit_regular_user(self, service, admin_user, sample_user):
        assert service._can_edit_user(admin_user, sample_user) is True

    def test_admin_cannot_edit_another_admin(self, service, admin_user):
        other_admin = MagicMock(spec=User)
        other_admin.role = UserRole.ADMIN
        assert service._can_edit_user(admin_user, other_admin) is False

    def test_super_admin_can_delete_regular_user(self, service, super_admin_user, sample_user):
        assert service._can_delete_user(super_admin_user, sample_user) is True

    def test_super_admin_cannot_delete_themselves(self, service, super_admin_user):
        assert service._can_delete_user(super_admin_user, super_admin_user) is False

    def test_admin_can_delete_regular_user(self, service, admin_user, sample_user):
        assert service._can_delete_user(admin_user, sample_user) is True

    def test_admin_cannot_delete_another_admin(self, service, admin_user):
        other_admin = MagicMock(spec=User)
        other_admin.id = uuid.uuid4()
        other_admin.role = UserRole.ADMIN
        assert service._can_delete_user(admin_user, other_admin) is False


class TestResetPassword:

    @pytest.fixture
    def service(self, mock_db):
        return AdminUserService(mock_db)

    async def test_super_admin_can_reset_password(
        self, service, mock_db, super_admin_user, sample_user
    ):
        with patch("api.services.admin.user_service.AuthManager") as mock_mgr:
            mock_mgr.get_user_by_id = AsyncMock(return_value=sample_user)

            await service.reset_user_password(
                str(sample_user.id), "newpassword1", reset_by=super_admin_user
            )

        mock_db.commit.assert_called_once()

    async def test_reset_nonexistent_user_raises(self, service, mock_db, super_admin_user):
        with patch("api.services.admin.user_service.AuthManager") as mock_mgr:
            mock_mgr.get_user_by_id = AsyncMock(return_value=None)

            with pytest.raises(ValueError, match="User not found"):
                await service.reset_user_password(
                    str(uuid.uuid4()), "newpassword1", reset_by=super_admin_user
                )
