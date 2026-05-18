"""
Unit tests for PredictionHistoryService
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from api.services.prediction.prediction_history_service import PredictionHistoryService


class TestGetUserPredictions:

    @pytest.fixture
    def service(self, mock_db):
        return PredictionHistoryService(mock_db)

    async def test_returns_paginated_response(self, service, mock_db, sample_user, sample_prediction):
        mock_db.execute.return_value.scalars.return_value.all.return_value = [sample_prediction]
        mock_db.execute.return_value.scalar.return_value = 1

        result = await service.get_user_predictions(sample_user, page=1, size=10)

        assert result.total == 1
        assert result.page == 1
        assert result.size == 10
        assert result.pages == 1

    async def test_returns_empty_when_no_predictions(self, service, mock_db, sample_user):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        mock_db.execute.return_value.scalar.return_value = 0

        result = await service.get_user_predictions(sample_user)

        assert result.total == 0
        assert result.predictions == []

    async def test_page_calculation(self, service, mock_db, sample_user):
        mock_db.execute.return_value.scalars.return_value.all.return_value = []
        mock_db.execute.return_value.scalar.return_value = 25

        result = await service.get_user_predictions(sample_user, page=1, size=10)

        assert result.pages == 3


class TestGetPredictionDetail:

    @pytest.fixture
    def service(self, mock_db):
        return PredictionHistoryService(mock_db)

    async def test_returns_history_when_found(self, service, mock_db, sample_user, sample_prediction):
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_prediction

        result = await service.get_prediction_detail(sample_user, str(sample_prediction.id))

        assert result is not None
        assert result.id == sample_prediction.id

    async def test_returns_none_when_not_found(self, service, mock_db, sample_user):
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        result = await service.get_prediction_detail(sample_user, str(uuid.uuid4()))

        assert result is None

    async def test_only_returns_own_prediction(self, service, mock_db, sample_user):
        # DB returns None because user_id filter excludes other users' predictions
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        result = await service.get_prediction_detail(sample_user, str(uuid.uuid4()))

        assert result is None


class TestDeletePrediction:

    @pytest.fixture
    def service(self, mock_db):
        return PredictionHistoryService(mock_db)

    async def test_delete_existing_prediction_returns_true(
        self, service, mock_db, sample_user, sample_prediction
    ):
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_prediction

        result = await service.delete_prediction(sample_user, str(sample_prediction.id))

        assert result is True
        mock_db.delete.assert_called_once_with(sample_prediction)
        mock_db.commit.assert_called_once()

    async def test_delete_missing_prediction_returns_false(self, service, mock_db, sample_user):
        mock_db.execute.return_value.scalar_one_or_none.return_value = None

        result = await service.delete_prediction(sample_user, str(uuid.uuid4()))

        assert result is False
        mock_db.delete.assert_not_called()

    async def test_delete_rolls_back_on_error(self, service, mock_db, sample_user, sample_prediction):
        mock_db.execute.return_value.scalar_one_or_none.return_value = sample_prediction
        mock_db.delete.side_effect = Exception("DB error")

        with pytest.raises(Exception):
            await service.delete_prediction(sample_user, str(sample_prediction.id))

        mock_db.rollback.assert_called_once()


class TestPredictionToHistory:

    @pytest.fixture
    def service(self, mock_db):
        return PredictionHistoryService(mock_db)

    def test_converts_prediction_to_history(self, service, sample_prediction):
        result = service._prediction_to_history(sample_prediction)

        assert result is not None
        assert result.id == sample_prediction.id
        assert result.soil_ph == float(sample_prediction.soil_ph)
        assert result.soil_health_index == float(sample_prediction.soil_health_index)
        assert result.soil_fertility_status == sample_prediction.soil_fertility_status

    def test_handles_none_numeric_fields_gracefully(self, service, sample_prediction):
        sample_prediction.soil_ph = None
        sample_prediction.nitrogen = None
        sample_prediction.calcium = None

        result = service._prediction_to_history(sample_prediction)

        assert result is not None
        assert result.soil_ph is None
        assert result.nitrogen is None
        assert result.calcium is None

    def test_converts_empty_agrovets(self, service, sample_prediction):
        sample_prediction.agrovets = []

        result = service._prediction_to_history(sample_prediction)

        assert result.agrovets == []
