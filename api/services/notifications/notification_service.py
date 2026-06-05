"""
Orchestration layer for CDC → Farmer notifications.

This service coordinates the email and SMS sub-services to deliver soil
analysis results. It also writes a ``CDCNotification`` record to the database
so that the CDC dashboard can display delivery history and the farmer's
dashboard can show when they were notified.

Usage example (inside a CDC router handler):
    service = NotificationService(db)
    result  = await service.send_results(
        prediction   = prediction_obj,
        farmer       = farmer_user,
        cdc_user     = cdc_user,
        method       = NotificationMethod.BOTH,
        custom_message = "Great to meet you on the farm today!",
    )
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from api.db.models.database import (
    CDCNotification,
    NotificationMethod,
    NotificationStatus,
    SoilPrediction,
    User,
)
from api.services.notifications.email_service import EmailService
from api.services.notifications.sms_service import SMSService

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Orchestrates the delivery of soil analysis results from a CDC to a farmer.

    Responsibilities:
    - Validate that the farmer has the necessary contact details for the
      requested delivery channel(s).
    - Invoke EmailService and / or SMSService as appropriate.
    - Persist a ``CDCNotification`` record capturing the outcome.
    - Return the persisted record for the caller to include in the API response.

    Args:
        db (AsyncSession): Async SQLAlchemy session injected by FastAPI.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialise the notification service and its channel sub-services.

        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db
        self.email_service = EmailService()
        self.sms_service = SMSService()

    async def send_results(
        self,
        prediction: SoilPrediction,
        farmer: User,
        cdc_user: User,
        method: NotificationMethod,
        custom_message: Optional[str] = None,
    ) -> CDCNotification:
        """
        Dispatch analysis results to the farmer and persist the delivery record.

        Validates contact data availability for each requested channel before
        attempting dispatch. Each channel is attempted independently so a
        failure in one does not block the other.

        Args:
            prediction (SoilPrediction): The prediction whose results are being sent.
            farmer (User): The farmer receiving the notification.
            cdc_user (User): The CDC officer dispatching the results.
            method (NotificationMethod): EMAIL, SMS, or BOTH.
            custom_message (Optional[str]): Optional personal note to include.

        Returns:
            CDCNotification: The persisted notification record with delivery status.

        Raises:
            ValueError: If the farmer has no valid contact information for the
                requested channel(s).
        """
        logger.info(
            "[NotificationService] Dispatching results for prediction %s "
            "to farmer %s via %s",
            prediction.id,
            farmer.username,
            method.value,
        )

        # Pre-flight: validate contact details availability
        self._validate_contact_details(farmer, method)

        # Initialise per-channel tracking variables
        email_status = "skipped"
        sms_status   = "skipped"
        error_parts  = []  # collect per-channel error descriptions

        cdc_full_name = cdc_user.full_name or cdc_user.username
        farmer_full_name = farmer.full_name or farmer.username

        # Build shared payload components once (avoids redundant computation)
        soil_health_index    = float(prediction.soil_health_index or 0)
        soil_fertility_status = prediction.soil_fertility_status or "Unknown"
        recommendations      = prediction.recommendations or []
        location_name        = prediction.location_name
        prediction_id_str    = str(prediction.id)

        # Email channel
        if method in (NotificationMethod.EMAIL, NotificationMethod.BOTH):
            if farmer.email:
                email_ok = await self.email_service.send_analysis_results(
                    farmer_email          = farmer.email,
                    farmer_name           = farmer_full_name,
                    cdc_name              = cdc_full_name,
                    soil_health_index     = soil_health_index,
                    soil_fertility_status = soil_fertility_status,
                    recommendations       = recommendations,
                    location_name         = location_name,
                    custom_message        = custom_message,
                    prediction_id         = prediction_id_str,
                )
                email_status = "sent" if email_ok else "failed"
                if not email_ok:
                    error_parts.append("email delivery failed")
                logger.info(
                    "[NotificationService] Email to %s — %s",
                    farmer.email, email_status
                )
            else:
                # Should not happen after validation, but guard defensively
                email_status = "skipped"
                error_parts.append("farmer has no email address on file")

        # SMS channel
        if method in (NotificationMethod.SMS, NotificationMethod.BOTH):
            if farmer.phone_number:
                sms_ok = await self.sms_service.send_analysis_results(
                    phone_number          = farmer.phone_number,
                    farmer_name           = farmer_full_name,
                    cdc_name              = cdc_full_name,
                    soil_health_index     = soil_health_index,
                    soil_fertility_status = soil_fertility_status,
                    custom_message        = custom_message,
                    prediction_id         = prediction_id_str,
                )
                sms_status = "sent" if sms_ok else "failed"
                if not sms_ok:
                    error_parts.append("SMS delivery failed")
                logger.info(
                    "[NotificationService] SMS to %s — %s",
                    farmer.phone_number, sms_status
                )
            else:
                sms_status = "skipped"
                error_parts.append("farmer has no phone number on file")

        # Determine overall status
        overall_status = self._compute_overall_status(
            method, email_status, sms_status
        )
        error_message = "; ".join(error_parts) if error_parts else None

        # Persist CDCNotification record
        notification = CDCNotification(
            prediction_id   = prediction.id,
            sent_by_cdc_id  = cdc_user.id,
            farmer_id       = farmer.id,
            method          = method,
            status          = overall_status,
            email_status    = email_status,
            sms_status      = sms_status,
            error_message   = error_message,
            sent_at         = datetime.now(timezone.utc),
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        logger.info(
            "[NotificationService] Notification record %s created — status: %s",
            notification.id,
            overall_status.value,
        )
        return notification

    # Private helpers

    @staticmethod
    def _validate_contact_details(
        farmer: User, method: NotificationMethod
    ) -> None:
        """
        Verify that the farmer has the required contact info for the chosen channel.

        Args:
            farmer (User): The farmer whose contact details are checked.
            method (NotificationMethod): The requested delivery channel(s).

        Raises:
            ValueError: Descriptive message indicating which contact field is missing.
        """
        if method == NotificationMethod.EMAIL and not farmer.email:
            raise ValueError(
                f"Farmer '{farmer.username}' has no email address on file. "
                "Cannot send email notification."
            )
        if method == NotificationMethod.SMS and not farmer.phone_number:
            raise ValueError(
                f"Farmer '{farmer.username}' has no phone number on file. "
                "Cannot send SMS notification."
            )
        if method == NotificationMethod.BOTH:
            missing = []
            if not farmer.email:
                missing.append("email address")
            if not farmer.phone_number:
                missing.append("phone number")
            if len(missing) == 2:
                raise ValueError(
                    f"Farmer '{farmer.username}' has neither an email address nor a "
                    "phone number on file. Cannot dispatch any notification."
                )
            # One missing but not both — we'll dispatch what we can and log
            if missing:
                logger.warning(
                    "[NotificationService] Farmer '%s' is missing %s. "
                    "Will dispatch only available channel.",
                    farmer.username,
                    " and ".join(missing),
                )

    @staticmethod
    def _compute_overall_status(
        method: NotificationMethod,
        email_status: str,
        sms_status: str,
    ) -> NotificationStatus:
        """
        Derive the aggregate delivery status from per-channel results.

        Logic:
        - EMAIL only:  sent → SENT, failed → FAILED
        - SMS only:    sent → SENT, failed → FAILED
        - BOTH:        both sent → SENT, one sent → PARTIAL, both failed → FAILED
        - Skipped channels are excluded from the success/failure calculation.

        Args:
            method (NotificationMethod): The requested channel(s).
            email_status (str): 'sent' | 'failed' | 'skipped'
            sms_status (str): 'sent' | 'failed' | 'skipped'

        Returns:
            NotificationStatus: The derived aggregate status enum value.
        """
        if method == NotificationMethod.EMAIL:
            return (
                NotificationStatus.SENT
                if email_status == "sent"
                else NotificationStatus.FAILED
            )

        if method == NotificationMethod.SMS:
            return (
                NotificationStatus.SENT
                if sms_status == "sent"
                else NotificationStatus.FAILED
            )

        # BOTH channels requested — evaluate what actually went through
        succeeded = sum(
            1 for s in (email_status, sms_status) if s == "sent"
        )
        attempted = sum(
            1 for s in (email_status, sms_status) if s != "skipped"
        )

        if succeeded == attempted and succeeded > 0:
            return NotificationStatus.SENT
        elif succeeded > 0:
            return NotificationStatus.PARTIAL
        else:
            return NotificationStatus.FAILED
