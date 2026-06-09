"""
Notification services package.

Exposes the top-level NotificationService that orchestrates email
(fastapi-mail / SMTP) and SMS (Africa's Talking) dispatches to farmers.
"""
from .notification_service import NotificationService

__all__ = ["NotificationService"]
