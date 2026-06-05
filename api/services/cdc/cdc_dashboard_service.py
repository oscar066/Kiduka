"""
CDC dashboard statistics service.

Computes the aggregated metrics and recent activity feed displayed on the
CDC dashboard's overview panel. All queries are scoped to the requesting
CDC user so each officer sees only their own activity.
"""
import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, func, desc
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
    CDCDashboardResponse,
    CDCDashboardStats,
    CDCRecentActivityItem,
    NotificationStatusEnum,
)

logger = logging.getLogger(__name__)


class CDCDashboardService:
    """
    Computes aggregated CDC dashboard statistics scoped to a single CDC user.

    All counts and activity items are derived exclusively from analyses
    initiated by the requesting CDC officer, ensuring clean per-officer
    metrics even in a multi-CDC deployment.

    Args:
        db (AsyncSession): The asynchronous database session.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialise the CDCDashboardService.

        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db

    async def get_dashboard(
        self,
        cdc_user_id: UUID,
        recent_limit: int = 10,
    ) -> CDCDashboardResponse:
        """
        Fetch the full CDC dashboard payload for the given CDC user.

        Combines aggregated statistics (totals, 7-day windows) with a
        recent-activity feed showing the latest analyses and their
        notification status.

        Args:
            cdc_user_id (UUID): The UUID of the CDC user making the request.
            recent_limit (int): Maximum number of recent activity items to return.
                Defaults to 10.

        Returns:
            CDCDashboardResponse: Stats block + recent activity feed.

        Raises:
            Exception: Propagates unexpected database errors.
        """
        logger.info(
            "[CDCDashboardService] Building dashboard for CDC user %s", cdc_user_id
        )

        try:
            stats = await self._compute_stats(cdc_user_id)
            recent = await self._get_recent_activity(cdc_user_id, recent_limit)

            return CDCDashboardResponse(
                stats=stats,
                recent_activity=recent,
            )

        except Exception as exc:
            logger.error(
                "[CDCDashboardService] Error building dashboard for %s: %s",
                cdc_user_id, exc
            )
            raise

    # Private helpers
    async def _compute_stats(self, cdc_user_id: UUID) -> CDCDashboardStats:
        """
        Run aggregation queries to populate the CDC dashboard stats block.

        Queries computed:
        - total_farmers_served   — distinct farmer IDs in CDC-attributed predictions
        - total_analyses_done    — total CDC-attributed predictions
        - total_notifications_sent — all notification records sent by this CDC
        - successful_notifications — notifications with SENT or PARTIAL status
        - pending_notifications   — analyses with no dispatch record yet
        - recent_analyses         — analyses in the last 7 days
        - recent_notifications    — notifications in the last 7 days

        Args:
            cdc_user_id (UUID): The CDC user whose stats to compute.

        Returns:
            CDCDashboardStats: Populated stats Pydantic model.
        """
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)

        # --- Total distinct farmers served ---
        farmers_result = await self.db.execute(
            select(func.count(func.distinct(SoilPrediction.user_id))).where(
                SoilPrediction.performed_by_cdc_id == cdc_user_id
            )
        )
        total_farmers_served = farmers_result.scalar() or 0

        # --- Total analyses performed ---
        analyses_result = await self.db.execute(
            select(func.count(SoilPrediction.id)).where(
                SoilPrediction.performed_by_cdc_id == cdc_user_id
            )
        )
        total_analyses = analyses_result.scalar() or 0

        # --- Total notification dispatches ---
        notif_result = await self.db.execute(
            select(func.count(CDCNotification.id)).where(
                CDCNotification.sent_by_cdc_id == cdc_user_id
            )
        )
        total_notifications = notif_result.scalar() or 0

        # --- Successful / partial notifications ---
        success_result = await self.db.execute(
            select(func.count(CDCNotification.id)).where(
                CDCNotification.sent_by_cdc_id == cdc_user_id,
                CDCNotification.status.in_([
                    NotificationStatus.SENT,
                    NotificationStatus.PARTIAL,
                ]),
            )
        )
        successful_notifications = success_result.scalar() or 0

        # --- Pending: analyses with no notification record yet ---
        # Subquery: prediction IDs that HAVE a notification record
        notified_pred_ids = select(CDCNotification.prediction_id).where(
            CDCNotification.sent_by_cdc_id == cdc_user_id
        ).scalar_subquery()

        pending_result = await self.db.execute(
            select(func.count(SoilPrediction.id)).where(
                SoilPrediction.performed_by_cdc_id == cdc_user_id,
                SoilPrediction.id.not_in(notified_pred_ids),
            )
        )
        pending_notifications = pending_result.scalar() or 0

        # --- Recent analyses (7-day window) ---
        recent_analyses_result = await self.db.execute(
            select(func.count(SoilPrediction.id)).where(
                SoilPrediction.performed_by_cdc_id == cdc_user_id,
                SoilPrediction.created_at >= seven_days_ago,
            )
        )
        recent_analyses = recent_analyses_result.scalar() or 0

        # --- Recent notifications (7-day window) ---
        recent_notif_result = await self.db.execute(
            select(func.count(CDCNotification.id)).where(
                CDCNotification.sent_by_cdc_id == cdc_user_id,
                CDCNotification.created_at >= seven_days_ago,
            )
        )
        recent_notifications = recent_notif_result.scalar() or 0

        return CDCDashboardStats(
            total_farmers_served=total_farmers_served,
            total_analyses_done=total_analyses,
            total_notifications_sent=total_notifications,
            successful_notifications=successful_notifications,
            pending_notifications=pending_notifications,
            recent_analyses=recent_analyses,
            recent_notifications=recent_notifications,
        )

    async def _get_recent_activity(
        self,
        cdc_user_id: UUID,
        limit: int,
    ) -> list:
        """
        Fetch the most recent CDC-attributed predictions with notification status.

        For each prediction, checks whether at least one notification has been
        sent and surfaces the latest notification's status.

        Args:
            cdc_user_id (UUID): The CDC user's UUID.
            limit (int): Maximum number of records to return.

        Returns:
            list[CDCRecentActivityItem]: Activity feed items, newest first.
        """
        pred_result = await self.db.execute(
            select(SoilPrediction)
            .options(
                selectinload(SoilPrediction.user),
                selectinload(SoilPrediction.notifications),
            )
            .where(SoilPrediction.performed_by_cdc_id == cdc_user_id)
            .order_by(desc(SoilPrediction.created_at))
            .limit(limit)
        )
        predictions = pred_result.scalars().all()

        activity = []
        for pred in predictions:
            # Derive notification status from the most recent notification record
            latest_notif = (
                max(pred.notifications, key=lambda n: n.created_at)
                if pred.notifications
                else None
            )
            notification_sent   = latest_notif is not None
            notification_status = (
                latest_notif.status.value if latest_notif else None
            )

            activity.append(
                CDCRecentActivityItem(
                    prediction_id=pred.id,
                    farmer_username=pred.user.username if pred.user else "Unknown",
                    farmer_name=pred.user.full_name if pred.user else None,
                    soil_fertility_status=pred.soil_fertility_status,
                    soil_health_index=float(pred.soil_health_index or 0),
                    cdc_notes=pred.cdc_notes,
                    notification_sent=notification_sent,
                    notification_status=notification_status,
                    created_at=pred.created_at,
                )
            )

        return activity
