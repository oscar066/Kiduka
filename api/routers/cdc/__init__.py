"""
CDC routes module with organised sub-routers.

All routes are mounted under the /cdc prefix and require the CDC or
SUPER_ADMIN role (enforced individually by each sub-router via the
``get_current_cdc_user`` dependency).
"""
from fastapi import APIRouter
from .dashboard_router import router as dashboard_router
from .farmers_router import router as farmers_router
from .notifications_router import router as notifications_router

# Main CDC router — aggregates all CDC sub-routes
router = APIRouter(prefix="/cdc", tags=["cdc"])

# Sub-router registration
router.include_router(dashboard_router, prefix="/dashboard", tags=["cdc-dashboard"])
router.include_router(farmers_router,   prefix="/farmers",  tags=["cdc-farmers"])
router.include_router(notifications_router, prefix="/notifications", tags=["cdc-notifications"])

__all__ = ["router"]


# API endpoints organised as:
# /cdc/dashboard/                              — CDC dashboard stats + activity
# /cdc/farmers/                               — List / search farmer accounts
# /cdc/farmers/{farmer_id}                    — Farmer profile detail
# /cdc/farmers/{farmer_id}/predictions        — Farmer's full prediction history
# /cdc/farmers/analyze                        — Run analysis for a farmer
# /cdc/notifications/send                     — Dispatch results to farmer (email / SMS)
# /cdc/notifications/history                  — CDC's notification dispatch history
