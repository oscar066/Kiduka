"""
CDC farmer management endpoints.

Provides the CDC with the ability to:
- Search and list farmer accounts
- View a specific farmer's profile and prediction history
- Run a soil analysis on behalf of a farmer (with CDC attribution)

All endpoints are protected by the ``get_current_cdc_user`` dependency,
which requires the CDC or SUPER_ADMIN role.
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.db.connection import get_db
from api.db.models.database import User
from api.schema.cdc_schema import (
    CDCAnalysisRequest,
    CDCPredictionResponse,
    FarmerDetailResponse,
    FarmerListResponse,
)
from api.services.auth.auth_manager import AuthManager
from api.services.cdc.cdc_service import CDCService
from api.utils.auth import get_current_cdc_user

logger = logging.getLogger(__name__)

router = APIRouter()


# Dependency helpers

async def get_cdc_service(db: AsyncSession = Depends(get_db)) -> CDCService:
    """
    FastAPI dependency that injects a CDCService instance.

    Args:
        db (AsyncSession): The async database session provided by FastAPI.

    Returns:
        CDCService: An initialised CDC service.
    """
    return CDCService(db)


# Farmer listing and lookup

@router.get("", response_model=FarmerListResponse)
async def list_farmers(
    current_user: User = Depends(get_current_cdc_user),
    cdc_service: CDCService = Depends(get_cdc_service),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    size: int = Query(20, ge=1, le=100, description="Records per page"),
    search: Optional[str] = Query(
        None,
        description="Search farmers by username, email, or full name"
    ),
):
    """
    Return a paginated, searchable list of farmer accounts.

    Only accounts with the USER role are returned. Useful for the CDC to
    locate a specific farmer before running an analysis or sending results.

    Args:
        current_user (User): The authenticated CDC (or SUPER_ADMIN) user.
        cdc_service (CDCService): CDC business logic service.
        request (Request): Raw HTTP request (used for audit logging).
        page (int): Target page number. Defaults to 1.
        size (int): Records per page (max 100). Defaults to 20.
        search (Optional[str]): Keyword filter applied across username,
            email, and full name fields.

    Returns:
        FarmerListResponse: Paginated list of farmer profiles.

    Raises:
        HTTPException: 500 if an unexpected server error occurs.
    """
    try:
        # Log the CDC action for audit visibility
        await AuthManager.log_admin_action(
            db=cdc_service.db,
            admin_user_id=current_user.id,
            action="cdc_list_farmers",
            request=request,
            details={"search": search, "page": page, "size": size},
        )

        return await cdc_service.get_farmers(page=page, size=size, search=search)

    except Exception as exc:
        logger.error("[CDC farmers] Error listing farmers: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve farmer list",
        )


@router.get("/{farmer_id}", response_model=FarmerDetailResponse)
async def get_farmer_profile(
    farmer_id: UUID,
    current_user: User = Depends(get_current_cdc_user),
    cdc_service: CDCService = Depends(get_cdc_service),
    request: Request = None,
):
    """
    Retrieve a single farmer's detailed profile.

    Includes the farmer's contact details (email and phone number) so the
    CDC can verify that the correct channel is available before dispatching
    results.

    Args:
        farmer_id (UUID): The UUID of the farmer to look up.
        current_user (User): The authenticated CDC user.
        cdc_service (CDCService): CDC service.
        request (Request): Raw HTTP request for audit logging.

    Returns:
        FarmerDetailResponse: Full farmer profile with prediction statistics.

    Raises:
        HTTPException: 404 if the farmer is not found.
        HTTPException: 500 if an unexpected server error occurs.
    """
    try:
        farmer = await cdc_service.get_farmer_by_id(farmer_id)
        if not farmer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Farmer with ID '{farmer_id}' not found",
            )

        await AuthManager.log_admin_action(
            db=cdc_service.db,
            admin_user_id=current_user.id,
            action="cdc_view_farmer_profile",
            request=request,
            target_user_id=farmer_id,
        )

        return farmer

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[CDC farmers] Error fetching farmer %s: %s", farmer_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve farmer profile",
        )


@router.get("/{farmer_id}/predictions")
async def get_farmer_prediction_history(
    farmer_id: UUID,
    current_user: User = Depends(get_current_cdc_user),
    cdc_service: CDCService = Depends(get_cdc_service),
    request: Request = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Records per page"),
):
    """
    Retrieve the complete prediction history for a specific farmer.

    The returned list includes both self-service analyses (performed by the
    farmer) and CDC-initiated analyses, each clearly labelled. This gives
    the CDC full visibility into the farmer's soil health trajectory.

    Args:
        farmer_id (UUID): The UUID of the target farmer.
        current_user (User): The authenticated CDC user.
        cdc_service (CDCService): CDC service.
        request (Request): Raw HTTP request for audit logging.
        page (int): Target page number. Defaults to 1.
        size (int): Records per page (max 100). Defaults to 20.

    Returns:
        dict: Paginated prediction list with CDC attribution metadata.

    Raises:
        HTTPException: 500 if an unexpected server error occurs.
    """
    try:
        await AuthManager.log_admin_action(
            db=cdc_service.db,
            admin_user_id=current_user.id,
            action="cdc_view_farmer_predictions",
            request=request,
            target_user_id=farmer_id,
        )

        return await cdc_service.get_farmer_predictions(
            farmer_id=farmer_id,
            page=page,
            size=size,
        )

    except Exception as exc:
        logger.error(
            "[CDC farmers] Error fetching predictions for farmer %s: %s",
            farmer_id, exc
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve farmer prediction history",
        )


# CDC-initiated soil analysis

@router.post("/analyze", response_model=CDCPredictionResponse, status_code=status.HTTP_201_CREATED)
async def run_analysis_for_farmer(
    analysis_request: CDCAnalysisRequest,
    current_user: User = Depends(get_current_cdc_user),
    cdc_service: CDCService = Depends(get_cdc_service),
    request: Request = None,
):
    """
    Run a soil analysis on behalf of a farmer.

    Accepts the farmer's UUID and soil data. The resulting prediction is
    stored under the farmer's account and stamped with the CDC officer's ID
    so both parties can see who performed the analysis.

    After this endpoint returns, the CDC should call
    ``POST /cdc/notifications/send`` to dispatch the results to the farmer.

    Args:
        analysis_request (CDCAnalysisRequest): Farmer UUID, soil data, and
            optional CDC field notes.
        current_user (User): The authenticated CDC user performing the analysis.
        cdc_service (CDCService): CDC service.
        request (Request): Raw HTTP request for audit logging.

    Returns:
        CDCPredictionResponse: Full prediction result with CDC attribution.

    Raises:
        HTTPException: 400 if the farmer is not found or input validation fails.
        HTTPException: 500 if an unexpected server error occurs.
    """
    try:
        result = await cdc_service.run_analysis_for_farmer(
            request=analysis_request,
            cdc_user=current_user,
        )

        # Log the CDC action
        await AuthManager.log_admin_action(
            db=cdc_service.db,
            admin_user_id=current_user.id,
            action="cdc_run_analysis",
            request=request,
            target_user_id=analysis_request.farmer_id,
            details={
                "prediction_id":   str(result.prediction_id),
                "farmer_id":       str(analysis_request.farmer_id),
                "health_index":    result.soil_health_index,
                "fertility_status": result.soil_fertility_status,
            },
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error("[CDC farmers] Error running analysis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to run soil analysis",
        )
