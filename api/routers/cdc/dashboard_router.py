"""
CDC dashboard endpoints.

Provides the CDC with a personalised overview of their work:
- Aggregated statistics (total farmers served, analyses done, notifications)
- Recent activity feed (latest analyses with notification status)

All endpoints require the CDC or SUPER_ADMIN role.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.schema.cdc_schema import CDCDashboardResponse
from api.services.auth.auth_manager import AuthManager
from api.services.cdc.cdc_dashboard_service import CDCDashboardService
from api.utils.auth import get_current_cdc_user

logger = logging.getLogger(__name__)

router = APIRouter()


# Dependency helpers

async def get_cdc_dashboard_service(
    db: AsyncSession = Depends(get_db),
) -> CDCDashboardService:
    """
    FastAPI dependency that injects a CDCDashboardService instance.

    Args:
        db (AsyncSession): The async database session.

    Returns:
        CDCDashboardService: An initialised CDC dashboard service.
    """
    return CDCDashboardService(db)


# Dashboard overview

@router.get("", response_model=CDCDashboardResponse)
async def get_cdc_dashboard(
    current_user: User = Depends(get_current_cdc_user),
    dashboard_service: CDCDashboardService = Depends(get_cdc_dashboard_service),
    request: Request = None,
):
    """
    Retrieve the full CDC dashboard payload for the authenticated user.

    Returns aggregated statistics scoped to the requesting CDC officer
    alongside a recent-activity feed showing the latest analyses and their
    notification delivery status.

    Statistics included:
    - total_farmers_served   — distinct farmers analysed by this CDC
    - total_analyses_done    — total soil analyses performed
    - total_notifications_sent — total dispatch attempts
    - successful_notifications — SENT or PARTIAL dispatches
    - pending_notifications   — analyses not yet sent to the farmer
    - recent_analyses         — analyses in the past 7 days
    - recent_notifications    — dispatches in the past 7 days

    Args:
        current_user (User): The authenticated CDC (or SUPER_ADMIN) user.
        dashboard_service (CDCDashboardService): Dashboard statistics service.
        request (Request): Raw HTTP request for audit logging.

    Returns:
        CDCDashboardResponse: Statistics + recent activity feed.

    Raises:
        HTTPException: 500 if an unexpected server error occurs.
    """
    try:
        # Log the dashboard access
        await AuthManager.log_admin_action(
            db=dashboard_service.db,
            admin_user_id=current_user.id,
            action="cdc_view_dashboard",
            request=request,
        )

        return await dashboard_service.get_dashboard(cdc_user_id=current_user.id)

    except Exception as exc:
        logger.error(
            "[CDC dashboard] Error building dashboard for %s: %s",
            current_user.username, exc
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load CDC dashboard",
        )
