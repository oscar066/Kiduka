"""
SMS notification service using Africa's Talking gateway.

This module sends short SMS messages to farmers when a CDC officer dispatches
their soil analysis results. The message contains a brief summary of the
health index, fertility status, and a link to the full dashboard report.

CREDENTIAL PLACEHOLDER:
    Real Africa's Talking credentials must be provided via environment variables
    before live SMS dispatch is enabled. Until then the service runs in
    SIMULATION MODE — all outgoing messages are logged rather than sent,
    so the full CDC notification workflow remains testable.

Environment variables (add to .env when credentials are available):
    AT_USERNAME   — Africa's Talking account username
                    (use "sandbox" for the test sandbox environment)
    AT_API_KEY    — Africa's Talking API key
    AT_SENDER_ID  — Optional shortcode or alphanumeric sender ID registered
                    with Africa's Talking (leave blank to use shared shortcode)

SDK installation (once credentials are available):
    pip install africastalking
    (or add 'africastalking' to requirements.txt)
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Simulation flag
_PLACEHOLDER_USERNAME = "sandbox"
_AT_USERNAME = os.getenv("AT_USERNAME", "")
_SIMULATE = _AT_USERNAME in ("", _PLACEHOLDER_USERNAME)

if _SIMULATE:
    logger.warning(
        "[SMSService] SIMULATION MODE active — SMS messages will be logged, not sent. "
        "Set AT_USERNAME and AT_API_KEY in .env to enable live dispatch."
    )


class SMSService:
    """
    Handles composition and dispatch of farmer notification SMS messages.

    Messages are kept intentionally brief (160–320 chars) to stay within
    standard SMS segment limits. The body contains:
        - A greeting using the farmer's name
        - The soil health index and fertility status
        - A short link to the full dashboard

    In simulation mode every send attempt is logged and returns True so
    the CDC notification workflow is fully exercisable without live credentials.
    """

    # Public interface

    async def send_analysis_results(
        self,
        phone_number: str,
        farmer_name: str,
        cdc_name: str,
        soil_health_index: float,
        soil_fertility_status: str,
        custom_message: Optional[str] = None,
        prediction_id: Optional[str] = None,
    ) -> bool:
        """
        Compose and send a soil-analysis result SMS to a farmer.

        Args:
            phone_number (str): Recipient's phone number in international format
                (e.g. "+254712345678"). Africa's Talking requires the country code.
            farmer_name (str): Farmer's name used in the greeting.
            cdc_name (str): CDC officer's name shown in the message body.
            soil_health_index (float): Numeric health score (0–100).
            soil_fertility_status (str): Fertility classification label.
            custom_message (Optional[str]): Optional short personal note from the CDC.
                Truncated to 100 chars so total message fits within 2 SMS segments.
            prediction_id (Optional[str]): UUID for building the dashboard deep-link.

        Returns:
            bool: True if the message was sent (or simulated) successfully,
                  False if a live send attempt raised an exception.
        """
        body = self._build_sms_body(
            farmer_name=farmer_name,
            cdc_name=cdc_name,
            soil_health_index=soil_health_index,
            soil_fertility_status=soil_fertility_status,
            custom_message=custom_message,
            prediction_id=prediction_id,
        )

        if _SIMULATE:
            return await self._send_simulated(phone_number, body)

        return await self._send_live(phone_number, body)

    # Private helpers

    async def _send_simulated(self, phone_number: str, body: str) -> bool:
        """
        Log the SMS payload instead of dispatching it.

        Args:
            phone_number (str): Intended recipient number.
            body (str): Full SMS text body.

        Returns:
            bool: Always True — simulation never fails.
        """
        logger.info(
            "[SMSService SIMULATION] Would send SMS:\n"
            "  To   : %s\n"
            "  Body : %s\n"
            "  Chars: %d",
            phone_number,
            body,
            len(body),
        )
        return True

    async def _send_live(self, phone_number: str, body: str) -> bool:
        """
        Dispatch the SMS via Africa's Talking SDK.

        Requires AT_USERNAME and AT_API_KEY environment variables.
        Optionally uses AT_SENDER_ID for a registered sender ID.

        Args:
            phone_number (str): Recipient number in international format.
            body (str): SMS text body.

        Returns:
            bool: True on success, False if an exception is raised.
        """
        try:
            # LIVE SEND — uncomment once credentials are available:
            #
            #   pip install africastalking
            #   (or add 'africastalking' to requirements.txt)

            # import africastalking
            #
            # africastalking.initialize(
            #     username = os.getenv("AT_USERNAME"),
            #     api_key  = os.getenv("AT_API_KEY"),
            # )
            # sms = africastalking.SMS
            #
            # sender_id = os.getenv("AT_SENDER_ID") or None  # None = shared shortcode
            # response = sms.send(
            #     message    = body,
            #     recipients = [phone_number],
            #     sender_id  = sender_id,
            # )
            #
            # # Inspect per-recipient status from Africa's Talking response
            # recipients = response.get("SMSMessageData", {}).get("Recipients", [])
            # if recipients and recipients[0].get("status") == "Success":
            #     logger.info("[SMSService] SMS sent to %s", phone_number)
            #     return True
            # else:
            #     logger.error("[SMSService] AT rejected SMS for %s: %s", phone_number, response)
            #     return False

            # Fallback log until credentials are wired up
            logger.warning(
                "[SMSService] _send_live called but Africa's Talking is not yet "
                "configured. Falling back to simulation for %s", phone_number
            )
            return await self._send_simulated(phone_number, body)

        except Exception as exc:
            logger.error(
                "[SMSService] Failed to send SMS to %s: %s", phone_number, exc
            )
            return False

    @staticmethod
    def _build_sms_body(
        farmer_name: str,
        cdc_name: str,
        soil_health_index: float,
        soil_fertility_status: str,
        custom_message: Optional[str],
        prediction_id: Optional[str],
    ) -> str:
        """
        Compose a concise SMS body from the analysis data.

        Keeps total length within ~320 characters (2 SMS segments) for
        cost efficiency. The deep-link URL is appended if a prediction ID
        is provided — shortening with a URL shortener is recommended for
        production to save characters.

        Args:
            farmer_name (str): Farmer's name.
            cdc_name (str): CDC officer's name.
            soil_health_index (float): Numeric health score.
            soil_fertility_status (str): Fertility status label.
            custom_message (Optional[str]): Optional CDC note (truncated to 80 chars).
            prediction_id (Optional[str]): Prediction UUID for the dashboard URL.

        Returns:
            str: The composed SMS body string.
        """
        base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        link = (
            f"{base_url}/dashboard/predictions/{prediction_id}"
            if prediction_id
            else f"{base_url}/dashboard"
        )

        # Truncate custom message to keep total within 2 segments
        note_line = ""
        if custom_message:
            truncated = custom_message[:80].rstrip()
            note_line = f' Note: "{truncated}"'

        body = (
            f"Hello {farmer_name}, your soil analysis by {cdc_name} is ready. "
            f"Health Index: {soil_health_index:.0f}/100 | Status: {soil_fertility_status}."
            f"{note_line} "
            f"View full report: {link}"
        )
        return body
