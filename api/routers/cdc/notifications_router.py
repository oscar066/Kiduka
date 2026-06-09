"""
CDC notification dispatch endpoints.

Allows a CDC officer to send soil analysis results to a farmer via email,
SMS, or both channels simultaneously. Every dispatch attempt is recorded
in the ``cdc_notifications`` table so both the CDC and farmer dashboards
can show delivery status.

All endpoints require the CDC or SUPER_ADMIN role.
"""
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import (
    CDCNotification,
    NotificationMethod,
    SoilPrediction,
    User,
    UserRole,
)
from api.schema.cdc_schema import (
    CDCNotificationResponse,
    CDCSendResultsRequest,
    NotificationHistoryResponse,
    NotificationMethodEnum,
    NotificationStatusEnum,
)
from api.services.auth.auth_manager import AuthManager
from api.services.cdc.cdc_service import CDCService
from api.services.notifications.notification_service import NotificationService
from api.utils.auth import get_current_cdc_user

logger = logging.getLogger(__name__)

router = APIRouter()


# Dependency helpers

async def get_cdc_service(db: AsyncSession = Depends(get_db)) -> CDCService:
    """
    FastAPI dependency that injects a CDCService instance.

    Args:
        db (AsyncSession): The async database session.

    Returns:
        CDCService: An initialised CDC service.
    """
    return CDCService(db)


async def get_notification_service(
    db: AsyncSession = Depends(get_db),
) -> NotificationService:
    """
    FastAPI dependency that injects a NotificationService instance.

    Args:
        db (AsyncSession): The async database session.

    Returns:
        NotificationService: An initialised notification orchestrator.
    """
    return NotificationService(db)


# Send results

@router.post("/send", response_model=CDCNotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_results_to_farmer(
    send_request: CDCSendResultsRequest,
    current_user: User = Depends(get_current_cdc_user),
    db: AsyncSession = Depends(get_db),
    notification_service: NotificationService = Depends(get_notification_service),
    request: Request = None,
):
    """
    Dispatch soil analysis results to a farmer via email, SMS, or both.

    The CDC selects a prediction and a delivery channel. The service will:
    1. Verify the prediction exists and was performed by this CDC officer.
    2. Verify the farmer has the required contact details for the channel.
    3. Dispatch the email and/or SMS (simulated in development mode).
    4. Persist a ``CDCNotification`` record capturing the outcome.

    Args:
        send_request (CDCSendResultsRequest): Prediction UUID, delivery
            channel, and optional personal note from the CDC.
        current_user (User): The authenticated CDC user triggering the dispatch.
        db (AsyncSession): Database session (for prediction/farmer lookup).
        notification_service (NotificationService): Notification orchestrator.
        request (Request): Raw HTTP request for audit logging.

    Returns:
        CDCNotificationResponse: Delivery outcome with per-channel status.

    Raises:
        HTTPException: 404 if the prediction is not found.
        HTTPException: 403 if the prediction was not performed by this CDC.
        HTTPException: 400 if the farmer is missing required contact details.
        HTTPException: 500 if an unexpected error occurs.
    """
    try:
        # -- Fetch the prediction with its farmer relationship
        pred_result = await db.execute(
            select(SoilPrediction)
            .options(selectinload(SoilPrediction.user))
            .where(SoilPrediction.id == send_request.prediction_id)
        )
        prediction = pred_result.scalar_one_or_none()

        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prediction '{send_request.prediction_id}' not found",
            )

        # -- Authorisation: the prediction must belong to this CDC officer.
        #    SUPER_ADMIN may dispatch any prediction regardless of attribution.
        if not current_user.is_super_admin():
            if prediction.performed_by_cdc_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "You can only send results for analyses you performed. "
                        "This prediction was not attributed to your account."
                    ),
                )

        # -- Retrieve the farmer account
        farmer = prediction.user
        if not farmer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated farmer account not found",
            )

        # -- Map Pydantic enum → DB enum
        db_method = NotificationMethod(send_request.method.value)

        # -- Dispatch via NotificationService
        notification = await notification_service.send_results(
            prediction=prediction,
            farmer=farmer,
            cdc_user=current_user,
            method=db_method,
            custom_message=send_request.custom_message,
        )

        # -- Audit log
        await AuthManager.log_admin_action(
            db=db,
            admin_user_id=current_user.id,
            action="cdc_send_results",
            request=request,
            target_user_id=farmer.id,
            target_prediction_id=prediction.id,
            details={
                "notification_id":  str(notification.id),
                "method":           send_request.method.value,
                "status":           notification.status.value,
                "email_status":     notification.email_status,
                "sms_status":       notification.sms_status,
            },
        )

        return CDCNotificationResponse(
            notification_id=notification.id,
            prediction_id=notification.prediction_id,
            farmer_id=notification.farmer_id,
            method=NotificationMethodEnum(notification.method.value),
            status=NotificationStatusEnum(notification.status.value),
            email_status=notification.email_status,
            sms_status=notification.sms_status,
            error_message=notification.error_message,
            sent_at=notification.sent_at,
        )

    except HTTPException:
        raise
    except ValueError as exc:
        # Raised by NotificationService when contact details are missing
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("[CDC notifications] Error dispatching results: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send results to farmer",
        )


# Notification history

@router.get("/history", response_model=NotificationHistoryResponse)
async def get_notification_history(
    current_user: User = Depends(get_current_cdc_user),
    cdc_service: CDCService = Depends(get_cdc_service),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Records per page"),
):
    """
    Retrieve the notification dispatch history for the authenticated CDC user.

    Returns a paginated list of all notification records created by this
    officer, ordered most-recent-first. Each record includes the farmer
    details, delivery channel, and per-channel status.

    Args:
        current_user (User): The authenticated CDC user.
        cdc_service (CDCService): CDC service for history queries.
        request (Request): Raw HTTP request for audit logging.
        page (int): Target page number. Defaults to 1.
        size (int): Records per page (max 100). Defaults to 20.

    Returns:
        NotificationHistoryResponse: Paginated notification records.

    Raises:
        HTTPException: 500 if an unexpected server error occurs.
    """
    try:
        return await cdc_service.get_cdc_activity(
            cdc_user_id=current_user.id,
            page=page,
            size=size,
        )

    except Exception as exc:
        logger.error(
            "[CDC notifications] Error fetching history for %s: %s",
            current_user.username, exc
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve notification history",
        )
