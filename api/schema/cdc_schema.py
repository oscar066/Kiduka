"""
CDC (Community Development Coordinator) Pydantic schemas.

This module defines all request / response models used by the CDC-specific
API surface, including:

- Farmer lookup and profile views
- CDC soil analysis submissions (on behalf of a farmer)
- Notification dispatch requests and status responses
- CDC dashboard statistics
"""
import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


# Supporting enumerations (mirrors DB enums for API layer)

class NotificationMethodEnum(str, Enum):
    """
    Delivery channel for CDC-to-farmer result notifications.

    Attributes:
        EMAIL: Send only via email.
        SMS: Send only via SMS (Africa's Talking).
        BOTH: Send via both channels simultaneously.
    """
    EMAIL = "email"
    SMS = "sms"
    BOTH = "both"


class NotificationStatusEnum(str, Enum):
    """
    Current delivery status of a notification record.

    Attributes:
        PENDING: Queued but not yet attempted.
        SENT: All requested channels delivered successfully.
        FAILED: All requested channels failed.
        PARTIAL: At least one channel succeeded and at least one failed.
    """
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    PARTIAL = "partial"


# Farmer schemas (read-only views used by CDC)

class FarmerBasicResponse(BaseModel):
    """
    Minimal farmer profile returned in list views.

    Attributes:
        id (uuid.UUID): Farmer's unique identifier.
        username (str): Farmer's display name.
        full_name (Optional[str]): Farmer's real name.
        email (str): Farmer's email address.
        phone_number (Optional[str]): Farmer's phone number for SMS dispatch.
        is_active (bool): Whether the farmer's account is currently enabled.
        prediction_count (int): Total number of soil analyses on record.
        last_analysis (Optional[datetime]): Timestamp of the most recent prediction.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    full_name: Optional[str] = None
    email: str
    phone_number: Optional[str] = None
    is_active: bool
    prediction_count: int = 0
    last_analysis: Optional[datetime] = None


class FarmerDetailResponse(FarmerBasicResponse):
    """
    Detailed farmer profile returned when a CDC selects a specific farmer.

    Extends FarmerBasicResponse with registration metadata.

    Attributes:
        created_at (datetime): When the farmer account was created.
        updated_at (datetime): When the farmer account was last modified.
    """
    created_at: datetime
    updated_at: datetime


class FarmerListResponse(BaseModel):
    """
    Paginated farmer listing for the CDC dashboard farmer-search panel.

    Attributes:
        farmers (List[FarmerBasicResponse]): Farmers on the current page.
        total (int): Total matching farmers across all pages.
        page (int): Current page number (1-indexed).
        size (int): Number of records per page.
        pages (int): Total number of pages.
    """
    farmers: List[FarmerBasicResponse]
    total: int
    page: int
    size: int
    pages: int


# CDC Analysis (running a prediction on behalf of a farmer)

class CDCAnalysisRequest(BaseModel):
    """
    Payload for a CDC officer to run a soil analysis on behalf of a farmer.

    The soil nutrient fields mirror the standard ``SoilData`` schema used by
    the farmer-facing prediction endpoint, with the addition of CDC-specific
    metadata.

    Attributes:
        farmer_id (uuid.UUID): The UUID of the farmer whose soil is being analysed.
        cdc_notes (Optional[str]): Field observations recorded by the CDC during the visit.
        soil_ph (Optional[float]): Measured pH of the soil sample.
        n (Optional[float]): Nitrogen content (mg/kg).
        p (Optional[float]): Phosphorus content (mg/kg).
        k (Optional[float]): Potassium content (mg/kg).
        organic_carbon (Optional[float]): Organic carbon percentage.
        ca (Optional[float]): Calcium content (mg/kg).
        mg (Optional[float]): Magnesium content (mg/kg).
        location_lat (Optional[float]): GPS latitude of the sampled plot.
        location_lng (Optional[float]): GPS longitude of the sampled plot.
        location_name (Optional[str]): Human-readable location label.
    """
    # Target farmer
    farmer_id: uuid.UUID = Field(..., description="UUID of the farmer being analysed")

    # Optional CDC field notes
    cdc_notes: Optional[str] = Field(
        None,
        max_length=2000,
        description="Observations recorded by the CDC during the field visit"
    )

    # Soil input data — mirrors SoilData schema; all optional for gap-filling
    soil_ph: Optional[float] = Field(None, ge=0, le=14, description="Soil pH (0–14)")
    n: Optional[float] = Field(None, ge=0, description="Nitrogen (mg/kg)")
    p: Optional[float] = Field(None, ge=0, description="Phosphorus (mg/kg)")
    k: Optional[float] = Field(None, ge=0, description="Potassium (mg/kg)")
    organic_carbon: Optional[float] = Field(None, ge=0, description="Organic carbon (%)")
    ca: Optional[float] = Field(None, ge=0, description="Calcium (mg/kg)")
    mg: Optional[float] = Field(None, ge=0, description="Magnesium (mg/kg)")

    # Location context
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    location_name: Optional[str] = Field(None, max_length=255)


class CDCPredictionResponse(BaseModel):
    """
    Enriched prediction response returned after a CDC runs an analysis for a farmer.

    Extends the standard prediction result with CDC attribution metadata and
    a flag indicating whether results have already been sent to the farmer.

    Attributes:
        prediction_id (uuid.UUID): The newly created prediction's UUID.
        farmer_id (uuid.UUID): The farmer the analysis was performed for.
        farmer_username (str): The farmer's username.
        farmer_name (Optional[str]): The farmer's full name.
        performed_by_cdc_id (uuid.UUID): The CDC user who ran the analysis.
        cdc_username (str): The CDC user's username.
        cdc_notes (Optional[str]): Field notes from the CDC.
        soil_health_index (float): Computed composite soil health score.
        soil_fertility_status (Optional[str]): Final fertility classification label.
        recommendations (List[str]): Actionable improvement advice.
        mentions (List[Any]): Notable traits or warnings identified.
        notification_sent (bool): Whether results have been dispatched to the farmer.
        created_at (datetime): Timestamp when the analysis was recorded.
    """
    model_config = ConfigDict(from_attributes=True)

    prediction_id: uuid.UUID
    farmer_id: uuid.UUID
    farmer_username: str
    farmer_name: Optional[str] = None
    performed_by_cdc_id: uuid.UUID
    cdc_username: str
    cdc_notes: Optional[str] = None
    soil_health_index: float
    soil_fertility_status: Optional[str] = None
    recommendations: List[Any] = []
    mentions: List[Any] = []
    notification_sent: bool = False
    created_at: datetime


# Notification dispatch schemas

class CDCSendResultsRequest(BaseModel):
    """
    Request payload for dispatching analysis results to a farmer.

    The CDC selects one or both delivery channels. At least one of the
    farmer's contact fields (email or phone_number) must be on file for
    the selected channel(s) to succeed.

    Attributes:
        prediction_id (uuid.UUID): The prediction whose results are being sent.
        method (NotificationMethodEnum): Delivery channel — EMAIL, SMS, or BOTH.
        custom_message (Optional[str]): Optional personal note to prepend to the
            standard notification body.
    """
    prediction_id: uuid.UUID = Field(..., description="UUID of the prediction to dispatch")
    method: NotificationMethodEnum = Field(
        ...,
        description="Delivery channel: email, sms, or both"
    )
    custom_message: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional personal note from the CDC to append to the notification"
    )


class CDCNotificationResponse(BaseModel):
    """
    Response returned after a CDC dispatches results to a farmer.

    Attributes:
        notification_id (uuid.UUID): The newly created notification record UUID.
        prediction_id (uuid.UUID): The prediction that was dispatched.
        farmer_id (uuid.UUID): The farmer who received (or was attempted) the notification.
        method (NotificationMethodEnum): Delivery channel(s) used.
        status (NotificationStatusEnum): Overall delivery outcome.
        email_status (str): Granular email channel result ('sent', 'failed', 'skipped').
        sms_status (str): Granular SMS channel result ('sent', 'failed', 'skipped').
        error_message (Optional[str]): Error detail if the dispatch partially or fully failed.
        sent_at (Optional[datetime]): Timestamp of the dispatch attempt.
    """
    model_config = ConfigDict(from_attributes=True)

    notification_id: uuid.UUID
    prediction_id: uuid.UUID
    farmer_id: uuid.UUID
    method: NotificationMethodEnum
    status: NotificationStatusEnum
    email_status: str
    sms_status: str
    error_message: Optional[str] = None
    sent_at: Optional[datetime] = None


class NotificationHistoryItem(BaseModel):
    """
    A single notification record shown in history lists.

    Attributes:
        id (uuid.UUID): Notification record UUID.
        prediction_id (uuid.UUID): Related prediction UUID.
        farmer_username (str): Username of the notified farmer.
        farmer_name (Optional[str]): Full name of the notified farmer.
        method (NotificationMethodEnum): Channel(s) used.
        status (NotificationStatusEnum): Delivery outcome.
        sent_at (Optional[datetime]): Dispatch timestamp.
        created_at (datetime): Record creation timestamp.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    prediction_id: uuid.UUID
    farmer_username: str
    farmer_name: Optional[str] = None
    method: NotificationMethodEnum
    status: NotificationStatusEnum
    sent_at: Optional[datetime] = None
    created_at: datetime


class NotificationHistoryResponse(BaseModel):
    """
    Paginated notification history for a CDC user.

    Attributes:
        notifications (List[NotificationHistoryItem]): Records on the current page.
        total (int): Total records matching the query.
        page (int): Current page number.
        size (int): Records per page.
        pages (int): Total number of pages.
    """
    notifications: List[NotificationHistoryItem]
    total: int
    page: int
    size: int
    pages: int


# CDC dashboard schemas

class CDCDashboardStats(BaseModel):
    """
    High-level statistics surfaced on the CDC dashboard overview card.

    Attributes:
        total_farmers_served (int): Distinct farmers the CDC has run analyses for.
        total_analyses_done (int): Total predictions performed by this CDC.
        total_notifications_sent (int): Total notification dispatches attempted.
        successful_notifications (int): Dispatches that completed without errors.
        pending_notifications (int): Analyses that have not yet been sent to farmers.
        recent_analyses (int): Analyses performed in the last 7 days.
        recent_notifications (int): Dispatches sent in the last 7 days.
    """
    total_farmers_served: int
    total_analyses_done: int
    total_notifications_sent: int
    successful_notifications: int
    pending_notifications: int
    recent_analyses: int
    recent_notifications: int


class CDCRecentActivityItem(BaseModel):
    """
    A single entry in the CDC's recent-activity feed.

    Attributes:
        prediction_id (uuid.UUID): The prediction UUID.
        farmer_username (str): The farmer's username.
        farmer_name (Optional[str]): The farmer's full name.
        soil_fertility_status (Optional[str]): The analysis outcome label.
        soil_health_index (float): The composite health score.
        cdc_notes (Optional[str]): Field notes left by the CDC.
        notification_sent (bool): Whether results were dispatched to the farmer.
        notification_status (Optional[str]): Latest notification delivery status.
        created_at (datetime): When the analysis was recorded.
    """
    model_config = ConfigDict(from_attributes=True)

    prediction_id: uuid.UUID
    farmer_username: str
    farmer_name: Optional[str] = None
    soil_fertility_status: Optional[str] = None
    soil_health_index: float
    cdc_notes: Optional[str] = None
    notification_sent: bool = False
    notification_status: Optional[str] = None
    created_at: datetime


class CDCDashboardResponse(BaseModel):
    """
    Full CDC dashboard payload — statistics plus recent activity feed.

    Attributes:
        stats (CDCDashboardStats): Aggregated numeric statistics for this CDC user.
        recent_activity (List[CDCRecentActivityItem]): The latest analyses performed,
            most recent first, with notification status.
    """
    stats: CDCDashboardStats
    recent_activity: List[CDCRecentActivityItem]
