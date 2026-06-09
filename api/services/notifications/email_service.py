"""
Email notification service using Resend.

This module is responsible for composing and dispatching HTML email reports
to farmers when a CDC officer sends them their soil analysis results.

CREDENTIAL PLACEHOLDER:
    A Resend API key must be provided via environment variables before
    enabling live dispatch. Until then, the service runs in SIMULATION MODE —
    all outgoing emails are logged rather than actually sent, so the rest of
    the application (CDC workflow, notification records) functions normally
    during development.

Environment variables (add to .env when credentials are available):
    RESEND_API_KEY    — API key from resend.com (starts with re_)
    MAIL_FROM         — Sender address (must use your verified Resend domain)
    MAIL_FROM_NAME    — Sender display name (e.g. "Kiduka Platform")
"""
import os
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Simulation flag — flips to False once a real Resend API key is configured.
_PLACEHOLDER = "re_placeholder"
_RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
_SIMULATE = not _RESEND_API_KEY or _RESEND_API_KEY == _PLACEHOLDER

if _SIMULATE:
    logger.warning(
        "[EmailService] SIMULATION MODE active — emails will be logged, not sent. "
        "Set RESEND_API_KEY in .env to enable live dispatch."
    )


class EmailService:
    """
    Handles composition and dispatch of farmer notification emails via Resend.

    In simulation mode (no RESEND_API_KEY) every send attempt is logged at
    INFO level and returns True so the rest of the notification workflow
    proceeds unaffected.

    When a real API key is present, the Resend SDK is used for delivery via
    the eu-west-1 region configured for kiduka-labs.co.ke.
    """

    # Public interface

    async def send_analysis_results(
        self,
        farmer_email: str,
        farmer_name: str,
        cdc_name: str,
        soil_health_index: float,
        soil_fertility_status: str,
        recommendations: list,
        location_name: Optional[str] = None,
        custom_message: Optional[str] = None,
        prediction_id: Optional[str] = None,
    ) -> bool:
        """
        Compose and send the soil analysis result email to a farmer.

        Builds an HTML email body from the prediction data and dispatches
        it via SMTP (or simulates delivery during development).

        Args:
            farmer_email (str): Recipient email address.
            farmer_name (str): Farmer's display name used in the greeting.
            cdc_name (str): Full name of the CDC officer who performed the analysis.
            soil_health_index (float): Numeric composite health score (0–100).
            soil_fertility_status (str): Human-readable fertility classification.
            recommendations (list): List of actionable improvement strings.
            location_name (Optional[str]): Name of the sampled location.
            custom_message (Optional[str]): Personal note from the CDC to include.
            prediction_id (Optional[str]): UUID string used to build a deep-link URL.

        Returns:
            bool: True if the email was sent (or simulated) successfully,
                  False if a real send attempt raised an exception.
        """
        subject = "Your Soil Analysis Results Are Ready — Kiduka Platform"
        html_body = self._build_html_body(
            farmer_name=farmer_name,
            cdc_name=cdc_name,
            soil_health_index=soil_health_index,
            soil_fertility_status=soil_fertility_status,
            recommendations=recommendations,
            location_name=location_name,
            custom_message=custom_message,
            prediction_id=prediction_id,
        )

        if _SIMULATE:
            return await self._send_simulated(farmer_email, subject, html_body)

        return await self._send_live(farmer_email, subject, html_body)

    # Private helpers

    async def _send_simulated(
        self, recipient: str, subject: str, html_body: str
    ) -> bool:
        """
        Log the email payload instead of dispatching it.

        Args:
            recipient (str): Intended recipient address.
            subject (str): Email subject line.
            html_body (str): Full HTML body of the email.

        Returns:
            bool: Always True — simulation never fails.
        """
        logger.info(
            "[EmailService SIMULATION] Would send email:\n"
            "  To      : %s\n"
            "  Subject : %s\n"
            "  Body    : (HTML, %d chars)\n"
            "  Time    : %s",
            recipient,
            subject,
            len(html_body),
            datetime.utcnow().isoformat(),
        )
        return True

    async def _send_live(
        self, recipient: str, subject: str, html_body: str
    ) -> bool:
        """
        Dispatch the email via Resend SDK.

        Args:
            recipient (str): Intended recipient address.
            subject (str): Email subject line.
            html_body (str): Full HTML body of the email.

        Returns:
            bool: True on success, False if an exception is raised.
        """
        try:
            import resend

            resend.api_key = _RESEND_API_KEY

            from_name = os.getenv("MAIL_FROM_NAME", "Kiduka Platform")
            from_address = os.getenv("MAIL_FROM", "noreply@kiduka-labs.co.ke")

            params: resend.Emails.SendParams = {
                "from": f"{from_name} <{from_address}>",
                "to": [recipient],
                "subject": subject,
                "html": html_body,
            }

            response = resend.Emails.send(params)
            logger.info(
                "[EmailService] Email sent to %s — Resend id: %s",
                recipient,
                response.get("id"),
            )
            return True

        except Exception as exc:
            logger.error("[EmailService] Failed to send email to %s: %s", recipient, exc)
            return False

    async def send_password_reset_email(
        self,
        recipient_email: str,
        recipient_name: str,
        reset_url: str,
    ) -> bool:
        """
        Send a password-reset link to the user.

        Args:
            recipient_email: Destination address.
            recipient_name: Display name for the greeting.
            reset_url: Full URL containing the one-time reset token.

        Returns:
            bool: True if sent (or simulated) successfully.
        """
        subject = "Reset your Kiduka Platform password"
        html_body = self._build_password_reset_html(recipient_name, reset_url)

        if _SIMULATE:
            return await self._send_simulated(recipient_email, subject, html_body)
        return await self._send_live(recipient_email, subject, html_body)

    @staticmethod
    def _build_password_reset_html(name: str, reset_url: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
            <title>Reset your password</title>
        </head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f4f4f4;padding:30px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0"
                               style="background:#fff;border-radius:8px;
                                      box-shadow:0 2px 8px rgba(0,0,0,0.1);
                                      overflow:hidden;">

                            <!-- Header -->
                            <tr>
                                <td style="background:#2c7a3e;padding:24px 32px;">
                                    <h1 style="color:#fff;margin:0;font-size:22px;">
                                        🌱 Kiduka Platform
                                    </h1>
                                    <p style="color:#a8d5b5;margin:4px 0 0;">
                                        Password Reset Request
                                    </p>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style="padding:32px;">
                                    <p style="font-size:16px;color:#333;">
                                        Hi <strong>{name}</strong>,
                                    </p>
                                    <p style="color:#555;line-height:1.6;">
                                        We received a request to reset the password for your
                                        Kiduka Platform account. Click the button below to
                                        choose a new password. This link is valid for
                                        <strong>1 hour</strong>.
                                    </p>

                                    <div style="text-align:center;margin:32px 0;">
                                        <a href="{reset_url}"
                                           style="background:#2c7a3e;color:#fff;
                                                  padding:14px 36px;border-radius:6px;
                                                  text-decoration:none;font-weight:bold;
                                                  font-size:15px;display:inline-block;">
                                            Reset My Password
                                        </a>
                                    </div>

                                    <p style="color:#777;font-size:13px;line-height:1.6;">
                                        If the button doesn't work, copy and paste this link
                                        into your browser:<br/>
                                        <a href="{reset_url}" style="color:#2c7a3e;word-break:break-all;">
                                            {reset_url}
                                        </a>
                                    </p>

                                    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>

                                    <p style="color:#999;font-size:12px;">
                                        If you didn't request a password reset, you can safely
                                        ignore this email — your password will not be changed.
                                    </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background:#f9f9f9;padding:20px 32px;
                                           border-top:1px solid #eee;">
                                    <p style="color:#999;font-size:12px;margin:0;">
                                        This email was sent by the Kiduka Agricultural Platform.
                                        Please do not reply to this email.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

    @staticmethod
    def _build_html_body(
        farmer_name: str,
        cdc_name: str,
        soil_health_index: float,
        soil_fertility_status: str,
        recommendations: list,
        location_name: Optional[str],
        custom_message: Optional[str],
        prediction_id: Optional[str],
    ) -> str:
        """
        Render a clean HTML email template for the soil analysis report.

        Uses inline CSS for broad email-client compatibility. The template
        includes a health-index badge, a fertility status label, an ordered
        recommendations list, and an optional deep-link button to the full
        dashboard.

        Args:
            farmer_name (str): Farmer greeting name.
            cdc_name (str): CDC officer who conducted the analysis.
            soil_health_index (float): Numeric score (0–100).
            soil_fertility_status (str): Classification label.
            recommendations (list): Actionable advice items.
            location_name (Optional[str]): Location label, if available.
            custom_message (Optional[str]): Personal note from the CDC.
            prediction_id (Optional[str]): UUID for dashboard deep-link.

        Returns:
            str: Complete HTML string suitable for use as an email body.
        """
        # Map fertility status to a badge colour
        status_colour_map = {
            "Healthy":              "#27ae60",
            "Moderately Healthy":   "#f39c12",
            "Poor":                 "#e67e22",
            "Very Poor":            "#e74c3c",
        }
        badge_colour = status_colour_map.get(soil_fertility_status, "#7f8c8d")

        # Build the recommendations list HTML
        rec_items = "".join(
            f"<li style='margin-bottom:8px;'>{rec}</li>"
            for rec in (recommendations or ["No specific recommendations at this time."])
        )

        # Optional custom message block
        custom_block = (
            f"""
            <div style="background:#f0f8ff;border-left:4px solid #3498db;
                        padding:12px 16px;margin:16px 0;border-radius:4px;">
                <strong>Note from your CDC officer:</strong><br/>
                {custom_message}
            </div>
            """
            if custom_message
            else ""
        )

        # Optional dashboard link
        dashboard_url = (
            os.getenv("FRONTEND_URL", "http://localhost:3000")
            + f"/dashboard/predictions/{prediction_id}"
            if prediction_id
            else os.getenv("FRONTEND_URL", "http://localhost:3000") + "/dashboard"
        )

        location_line = (
            f"<p style='color:#666;font-size:14px;'>📍 Location: {location_name}</p>"
            if location_name
            else ""
        )

        return f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
            <title>Soil Analysis Results</title>
        </head>
        <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f4f4f4;padding:30px 0;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0"
                               style="background:#fff;border-radius:8px;
                                      box-shadow:0 2px 8px rgba(0,0,0,0.1);
                                      overflow:hidden;">

                            <!-- Header -->
                            <tr>
                                <td style="background:#2c7a3e;padding:24px 32px;">
                                    <h1 style="color:#fff;margin:0;font-size:22px;">
                                        🌱 Kiduka Platform
                                    </h1>
                                    <p style="color:#a8d5b5;margin:4px 0 0;">
                                        Soil Analysis Results
                                    </p>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style="padding:32px;">
                                    <p style="font-size:16px;color:#333;">
                                        Dear <strong>{farmer_name}</strong>,
                                    </p>
                                    <p style="color:#555;">
                                        Your CDC officer, <strong>{cdc_name}</strong>,
                                        has completed a soil analysis for your farm.
                                        Here is a summary of the findings:
                                    </p>

                                    {location_line}

                                    <!-- Health Index -->
                                    <div style="text-align:center;margin:24px 0;">
                                        <div style="display:inline-block;
                                                    background:{badge_colour};
                                                    color:#fff;border-radius:50%;
                                                    width:90px;height:90px;
                                                    line-height:90px;
                                                    font-size:28px;font-weight:bold;">
                                            {soil_health_index:.0f}
                                        </div>
                                        <p style="color:#555;margin-top:8px;">
                                            Soil Health Index (out of 100)
                                        </p>
                                    </div>

                                    <!-- Fertility Status -->
                                    <div style="text-align:center;margin-bottom:24px;">
                                        <span style="background:{badge_colour};
                                                     color:#fff;padding:6px 20px;
                                                     border-radius:20px;
                                                     font-weight:bold;font-size:15px;">
                                            {soil_fertility_status}
                                        </span>
                                    </div>

                                    {custom_block}

                                    <!-- Recommendations -->
                                    <h3 style="color:#2c7a3e;border-bottom:2px solid #e8f5e9;
                                               padding-bottom:8px;">
                                        Recommendations
                                    </h3>
                                    <ol style="color:#444;line-height:1.7;">
                                        {rec_items}
                                    </ol>

                                    <!-- Dashboard CTA -->
                                    <div style="text-align:center;margin-top:32px;">
                                        <a href="{dashboard_url}"
                                           style="background:#2c7a3e;color:#fff;
                                                  padding:12px 30px;border-radius:6px;
                                                  text-decoration:none;font-weight:bold;
                                                  font-size:15px;">
                                            View Full Report on Dashboard
                                        </a>
                                    </div>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background:#f9f9f9;padding:20px 32px;
                                           border-top:1px solid #eee;">
                                    <p style="color:#999;font-size:12px;margin:0;">
                                        This email was sent by the Kiduka Agricultural Platform.
                                        Please do not reply to this email.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
