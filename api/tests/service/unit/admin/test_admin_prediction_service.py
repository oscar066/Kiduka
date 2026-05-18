"""
Unit tests for AdminPredictionService
"""
import uuid
from unittest.mock import AsyncMock, MagicMock
import pytest

from api.services.admin.prediction_service import AdminPredictionService
from api.schema.auth_schema import AdminPredictionUpdate
from api.db.models.database import SoilPrediction, User


class TestGetPredictionsWithFilters:

    @pytest.fixture
    def service(self, mock_db):
        return AdminPredictionService(mock_db)

    async def test_returns_paginated_list(self, service, mock_db, sample_prediction):
        mock_db.execute.return_value.scalars.return_value.all.return_value = [sample_prediction]
        mock_db.execute.return_value.scalar.return_value = 1

        result = await service.get_predictions_with_filters(page=1, size=20)

        assert result.total == 1
        assert result.page == 1
        assert result.size == 20

    async def test_returns_empty_when_none_exist(self, service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        mock_db.execute.return_value.scalar.return_value = 0

        result = await service.get_predictions_with_filters()

        assert result.total == 0
        assert result.predictions == []

    async def test_pages_calculated_correctly(self, service, mock_db):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        mock_db.execute.return_value.scalar.return_value = 50

        result = await service.get_predictions_with_filters(page=1, size=20)

        assert result.pages == 3


class TestUpdatePrediction:

    @pytest.fixture
    def service(self, mock_db):
        return AdminPredictionService(mock_db)

    async def test_flag_prediction(self, service, mock_db, admin_user, sample_prediction):
        update = AdminPredictionUpdate(is_flagged=True, admin_notes="Suspicious data")
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_prediction

        result = await service.update_prediction(
            str(sample_prediction.id), update, updated_by=admin_user
        )

        assert sample_prediction.is_flagged is True
        assert sample_prediction.admin_notes == "Suspicious data"
        mock_db.commit.assert_called_once()

    async def test_unflag_prediction(self, service, mock_db, admin_user, sample_prediction):
        sample_prediction.is_flagged = True
        update = AdminPredictionUpdate(is_flagged=False, admin_notes="Cleared")
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_prediction

        await service.update_prediction(
            str(sample_prediction.id), update, updated_by=admin_user
        )

        assert sample_prediction.is_flagged is False

    async def test_update_nonexistent_prediction_raises(self, service, mock_db, admin_user):
        update = AdminPredictionUpdate(is_flagged=True)
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        with pytest.raises(ValueError, match="Prediction not found"):
            await service.update_prediction(str(uuid.uuid4()), update, updated_by=admin_user)

    async def test_update_rolls_back_on_error(self, service, mock_db, admin_user, sample_prediction):
        update = AdminPredictionUpdate(is_flagged=True)
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_prediction
        mock_db.commit.side_effect = Exception("DB error")

        with pytest.raises(Exception):
            await service.update_prediction(
                str(sample_prediction.id), update, updated_by=admin_user
            )

        mock_db.rollback.assert_called_once()


class TestDeletePrediction:

    @pytest.fixture
    def service(self, mock_db):
        return AdminPredictionService(mock_db)

    async def test_delete_existing_prediction(self, service, mock_db, admin_user, sample_prediction):
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_prediction

        result = await service.delete_prediction(str(sample_prediction.id), deleted_by=admin_user)

        assert "deleted_prediction" in result
        mock_db.delete.assert_called_once_with(sample_prediction)
        mock_db.commit.assert_called_once()

    async def test_delete_captures_prediction_info(self, service, mock_db, admin_user, sample_prediction):
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_prediction

        result = await service.delete_prediction(str(sample_prediction.id), deleted_by=admin_user)

        info = result["deleted_prediction"]
        assert "user_id" in info
        assert "soil_fertility_status" in info

    async def test_delete_nonexistent_prediction_raises(self, service, mock_db, admin_user):
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        with pytest.raises(ValueError, match="Prediction not found"):
            await service.delete_prediction(str(uuid.uuid4()), deleted_by=admin_user)

    async def test_delete_rolls_back_on_error(self, service, mock_db, admin_user, sample_prediction):
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_prediction
        mock_db.delete.side_effect = Exception("delete failed")

        with pytest.raises(Exception):
            await service.delete_prediction(str(sample_prediction.id), deleted_by=admin_user)

        mock_db.rollback.assert_called_once()


class TestPredictionToAdminResponse:

    @pytest.fixture
    def service(self, mock_db):
        return AdminPredictionService(mock_db)

    def test_converts_all_numeric_fields(self, service, sample_prediction):
        result = service._prediction_to_admin_response(sample_prediction)

        assert result.soil_ph == float(sample_prediction.soil_ph)
        assert result.nitrogen == float(sample_prediction.nitrogen)
        assert result.soil_health_index == float(sample_prediction.soil_health_index)

    def test_handles_none_numeric_fields(self, service, sample_prediction):
        sample_prediction.soil_ph = None
        sample_prediction.calcium = None
        sample_prediction.magnesium = None

        result = service._prediction_to_admin_response(sample_prediction)

        assert result.soil_ph is None
        assert result.calcium is None
        assert result.magnesium is None

    def test_is_flagged_defaults_false(self, service, sample_prediction):
        sample_prediction.is_flagged = None

        result = service._prediction_to_admin_response(sample_prediction)

        assert result.is_flagged is False
