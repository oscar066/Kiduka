"""
CDC (Community Development Coordinator) business logic service.

This service handles all CDC-specific operations:
- Paginated farmer search and profile lookup
- Running soil analyses on behalf of farmers (with CDC attribution)
- Retrieving CDC activity history with notification status
- Fetching a farmer's full prediction history for CDC review

The service reuses the existing PredictionService prediction workflow so
CDC-initiated analyses are identical in quality to self-service ones — the
only difference is the ``performed_by_cdc_id`` column being populated.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, desc, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.db.models.database import (
    CDCNotification,
    NotificationStatus,
    SoilPrediction,
    User,
    UserRole,
)
from api.schema.cdc_schema import (
    CDCAnalysisRequest,
    CDCPredictionResponse,
    CDCRecentActivityItem,
    FarmerBasicResponse,
    FarmerDetailResponse,
    FarmerListResponse,
    NotificationHistoryItem,
    NotificationHistoryResponse,
    NotificationMethodEnum,
    NotificationStatusEnum,
)
from api.schema.schema import SoilData
from api.services.prediction.prediction_service import PredictionService
from api.utils.dependencies import dependency_manager

logger = logging.getLogger(__name__)


class CDCService:
    """
    Service layer for all CDC-facing operations.

    Instantiated per-request via FastAPI dependency injection, receiving a
    shared async SQLAlchemy session.

    Args:
        db (AsyncSession): The asynchronous database session.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialise the CDCService.

        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db

    # Farmer lookup

    async def get_farmers(
        self,
        page: int = 1,
        size: int = 20,
        search: Optional[str] = None,
    ) -> FarmerListResponse:
        """
        Return a paginated, searchable list of farmer (USER-role) accounts.

        Only accounts with the USER role are surfaced; CDC, ADMIN, and
        SUPER_ADMIN accounts are excluded from the listing.

        Args:
            page (int): Target page number (1-indexed). Defaults to 1.
            size (int): Records per page. Defaults to 20.
            search (Optional[str]): Keyword to filter by username, email, or
                full name. Case-insensitive substring match.

        Returns:
            FarmerListResponse: Paginated list of farmer profiles with basic
                statistics (prediction count, last analysis date).

        Raises:
            Exception: Propagates any unexpected database error to the caller.
        """
        logger.info(
            "[CDCService] Fetching farmers — page=%d, size=%d, search=%r",
            page, size, search
        )

        try:
            # Base filter: only USER role accounts
            conditions = [User.role == UserRole.USER]

            if search:
                conditions.append(
                    or_(
                        User.username.ilike(f"%{search}%"),
                        User.email.ilike(f"%{search}%"),
                        User.full_name.ilike(f"%{search}%"),
                    )
                )

            where_clause = and_(*conditions)

            # Count query
            count_result = await self.db.execute(
                select(func.count(User.id)).where(where_clause)
            )
            total = count_result.scalar() or 0

            # Data query with pagination
            offset = (page - 1) * size
            users_result = await self.db.execute(
                select(User)
                .where(where_clause)
                .order_by(desc(User.created_at))
                .offset(offset)
                .limit(size)
            )
            users = users_result.scalars().all()

            # Batch-load prediction counts and last analysis dates
            farmer_ids = [u.id for u in users]
            pred_stats = await self._get_farmer_prediction_stats(farmer_ids)

            farmers = [
                FarmerBasicResponse(
                    id=u.id,
                    username=u.username,
                    full_name=u.full_name,
                    email=u.email,
                    phone_number=u.phone_number,
                    is_active=u.is_active,
                    prediction_count=pred_stats.get(u.id, {}).get("count", 0),
                    last_analysis=pred_stats.get(u.id, {}).get("last", None),
                )
                for u in users
            ]

            return FarmerListResponse(
                farmers=farmers,
                total=total,
                page=page,
                size=size,
                pages=max(1, (total + size - 1) // size),
            )

        except Exception as exc:
            logger.error("[CDCService] Error fetching farmers: %s", exc)
            raise

    async def get_farmer_by_id(self, farmer_id: UUID) -> Optional[FarmerDetailResponse]:
        """
        Retrieve a single farmer's detailed profile by their UUID.

        Args:
            farmer_id (UUID): The UUID of the farmer account to fetch.

        Returns:
            Optional[FarmerDetailResponse]: The farmer's full profile, or None
                if no USER-role account with that ID exists.

        Raises:
            Exception: Propagates any unexpected database error.
        """
        try:
            result = await self.db.execute(
                select(User).where(
                    and_(User.id == farmer_id, User.role == UserRole.USER)
                )
            )
            farmer = result.scalar_one_or_none()
            if not farmer:
                return None

            # Fetch prediction stats for this single farmer
            stats = await self._get_farmer_prediction_stats([farmer.id])
            farmer_stats = stats.get(farmer.id, {})

            return FarmerDetailResponse(
                id=farmer.id,
                username=farmer.username,
                full_name=farmer.full_name,
                email=farmer.email,
                phone_number=farmer.phone_number,
                is_active=farmer.is_active,
                prediction_count=farmer_stats.get("count", 0),
                last_analysis=farmer_stats.get("last"),
                created_at=farmer.created_at,
                updated_at=farmer.updated_at,
            )

        except Exception as exc:
            logger.error(
                "[CDCService] Error fetching farmer %s: %s", farmer_id, exc
            )
            raise

    # Analysis: running a prediction on behalf of a farmer

    async def run_analysis_for_farmer(
        self,
        request: CDCAnalysisRequest,
        cdc_user: User,
    ) -> CDCPredictionResponse:
        """
        Execute a soil analysis for a farmer and stamp it with CDC attribution.

        The soil data provided in ``request`` is forwarded to the existing
        ``PredictionService`` which handles ML gap-filling, health index
        computation, and agrovet lookup. The resulting ``SoilPrediction``
        record is then updated with:
        - ``performed_by_cdc_id`` — the CDC user's UUID
        - ``cdc_notes``           — the CDC's field observations

        Args:
            request (CDCAnalysisRequest): Soil data and metadata for the analysis,
                including the target farmer's UUID and optional field notes.
            cdc_user (User): The authenticated CDC user performing the analysis.

        Returns:
            CDCPredictionResponse: Enriched prediction result with CDC attribution
                and notification status (False on creation, updated after dispatch).

        Raises:
            ValueError: If the target farmer does not exist, is not a USER-role
                account, or if prediction service dependencies are unavailable.
            Exception: Propagates unexpected database or service errors.
        """
        logger.info(
            "[CDCService] Running analysis for farmer %s by CDC %s",
            request.farmer_id,
            cdc_user.username,
        )

        try:
            # Verify target farmer exists and is a USER-role account
            farmer_result = await self.db.execute(
                select(User).where(
                    and_(
                        User.id == request.farmer_id,
                        User.role == UserRole.USER,
                    )
                )
            )
            farmer = farmer_result.scalar_one_or_none()
            if not farmer:
                raise ValueError(
                    f"Farmer with ID '{request.farmer_id}' not found or is not a "
                    "USER-role account."
                )

            # Build the SoilData object expected by PredictionService.
            # SoilData uses 'ph', 'latitude', 'longitude' — map from the
            # CDC request which uses 'soil_ph', 'location_lat', 'location_lng'.
            soil_data = SoilData(
                ph=request.soil_ph,
                n=request.n,
                p=request.p,
                k=request.k,
                organic_carbon=request.organic_carbon,
                ca=request.ca,
                mg=request.mg,
                latitude=request.location_lat,
                longitude=request.location_lng,
                location_name=request.location_name,
            )

            # Delegate to the existing prediction service (keeps prediction
            # logic centralised and avoids duplication)
            prediction_service = PredictionService(self.db)
            prediction_response = await prediction_service.create_prediction(
                soil_data=soil_data,
                user=farmer,  # prediction is stored under the farmer's account
            )

            # Fetch the freshly persisted SoilPrediction record so we can
            # add the CDC attribution columns
            pred_result = await self.db.execute(
                select(SoilPrediction).where(
                    SoilPrediction.id == prediction_response.prediction_id
                )
            )
            prediction = pred_result.scalar_one_or_none()

            if prediction:
                prediction.performed_by_cdc_id = cdc_user.id
                prediction.cdc_notes = request.cdc_notes
                await self.db.commit()
                await self.db.refresh(prediction)

            logger.info(
                "[CDCService] Analysis complete — prediction %s attributed to CDC %s",
                prediction_response.prediction_id,
                cdc_user.username,
            )

            return CDCPredictionResponse(
                prediction_id=prediction_response.prediction_id,
                farmer_id=farmer.id,
                farmer_username=farmer.username,
                farmer_name=farmer.full_name,
                performed_by_cdc_id=cdc_user.id,
                cdc_username=cdc_user.username,
                cdc_notes=request.cdc_notes,
                soil_health_index=float(prediction_response.soil_health_index),
                soil_fertility_status=prediction_response.soil_fertility_status,
                recommendations=prediction_response.recommendations or [],
                mentions=prediction_response.mentions or [],
                notification_sent=False,  # freshly created — not yet dispatched
                created_at=prediction.created_at if prediction else datetime.now(timezone.utc),
            )

        except ValueError:
            raise
        except Exception as exc:
            await self.db.rollback()
            logger.error(
                "[CDCService] Error running analysis for farmer %s: %s",
                request.farmer_id, exc
            )
            raise

    # CDC activity history

    async def get_cdc_activity(
        self,
        cdc_user_id: UUID,
        page: int = 1,
        size: int = 20,
    ) -> NotificationHistoryResponse:
        """
        Return a paginated history of all notifications sent by this CDC user.

        Results are ordered most-recent-first.

        Args:
            cdc_user_id (UUID): The CDC user whose notification history to fetch.
            page (int): Target page number (1-indexed). Defaults to 1.
            size (int): Records per page. Defaults to 20.

        Returns:
            NotificationHistoryResponse: Paginated notification history with farmer
                and delivery details.

        Raises:
            Exception: Propagates unexpected database errors.
        """
        try:
            offset = (page - 1) * size

            # Total count
            count_result = await self.db.execute(
                select(func.count(CDCNotification.id)).where(
                    CDCNotification.sent_by_cdc_id == cdc_user_id
                )
            )
            total = count_result.scalar() or 0

            # Fetch page of notifications with farmer join
            notif_result = await self.db.execute(
                select(CDCNotification)
                .options(selectinload(CDCNotification.farmer))
                .where(CDCNotification.sent_by_cdc_id == cdc_user_id)
                .order_by(desc(CDCNotification.created_at))
                .offset(offset)
                .limit(size)
            )
            notifications = notif_result.scalars().all()

            items = [
                NotificationHistoryItem(
                    id=n.id,
                    prediction_id=n.prediction_id,
                    farmer_username=n.farmer.username if n.farmer else "Unknown",
                    farmer_name=n.farmer.full_name if n.farmer else None,
                    method=NotificationMethodEnum(n.method.value),
                    status=NotificationStatusEnum(n.status.value),
                    sent_at=n.sent_at,
                    created_at=n.created_at,
                )
                for n in notifications
            ]

            return NotificationHistoryResponse(
                notifications=items,
                total=total,
                page=page,
                size=size,
                pages=max(1, (total + size - 1) // size),
            )

        except Exception as exc:
            logger.error(
                "[CDCService] Error fetching activity for CDC %s: %s",
                cdc_user_id, exc
            )
            raise

    async def get_farmer_predictions(
        self,
        farmer_id: UUID,
        page: int = 1,
        size: int = 20,
    ) -> dict:
        """
        Retrieve the full prediction history for a specific farmer.

        Returns raw prediction records enriched with CDC attribution details
        so the CDC can see both self-service and CDC-initiated analyses.

        Args:
            farmer_id (UUID): The farmer's UUID.
            page (int): Target page number. Defaults to 1.
            size (int): Records per page. Defaults to 20.

        Returns:
            dict: Paginated payload with ``predictions``, ``total``, ``page``,
                ``size``, and ``pages`` keys.

        Raises:
            Exception: Propagates unexpected database errors.
        """
        try:
            offset = (page - 1) * size

            count_result = await self.db.execute(
                select(func.count(SoilPrediction.id)).where(
                    SoilPrediction.user_id == farmer_id
                )
            )
            total = count_result.scalar() or 0

            pred_result = await self.db.execute(
                select(SoilPrediction)
                .options(selectinload(SoilPrediction.cdc_user))
                .where(SoilPrediction.user_id == farmer_id)
                .order_by(desc(SoilPrediction.created_at))
                .offset(offset)
                .limit(size)
            )
            predictions = pred_result.scalars().all()

            items = []
            for pred in predictions:
                items.append({
                    "prediction_id":        str(pred.id),
                    "soil_health_index":    float(pred.soil_health_index or 0),
                    "soil_fertility_status": pred.soil_fertility_status,
                    "location_name":        pred.location_name,
                    "cdc_notes":            pred.cdc_notes,
                    "performed_by_cdc":     bool(pred.performed_by_cdc_id),
                    "cdc_username": (
                        pred.cdc_user.username if pred.cdc_user else None
                    ),
                    "recommendations": pred.recommendations or [],
                    "created_at":           pred.created_at.isoformat(),
                })

            return {
                "predictions": items,
                "total":       total,
                "page":        page,
                "size":        size,
                "pages":       max(1, (total + size - 1) // size),
            }

        except Exception as exc:
            logger.error(
                "[CDCService] Error fetching predictions for farmer %s: %s",
                farmer_id, exc
            )
            raise

    # Private helpers

    async def _get_farmer_prediction_stats(
        self, farmer_ids: list
    ) -> dict:
        """
        Batch-fetch prediction count and last-analysis timestamp for a list of farmers.

        Args:
            farmer_ids (list): List of User UUID values to query.

        Returns:
            dict: Mapping of user_id → {"count": int, "last": Optional[datetime]}.
        """
        if not farmer_ids:
            return {}

        result = await self.db.execute(
            select(
                SoilPrediction.user_id,
                func.count(SoilPrediction.id).label("count"),
                func.max(SoilPrediction.created_at).label("last"),
            )
            .where(SoilPrediction.user_id.in_(farmer_ids))
            .group_by(SoilPrediction.user_id)
        )
        rows = result.all()
        return {row.user_id: {"count": row.count, "last": row.last} for row in rows}
