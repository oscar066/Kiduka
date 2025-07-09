"""
Admin routes module with organized sub-routers
"""
from fastapi import APIRouter
from .dashboard_routers import router as dashboard_router
from .users_routers import router as users_router
from .predictions_routers import router as predictions_router
from .audit_logs_routers import router as audit_logs_router
from .statistics_routers import router as statistics_router
from .agrovets_routers import router as agrovets_router

# Main admin router that includes all sub-routers
router = APIRouter(prefix="/admin", tags=["admin"])

# Include all sub-routers
router.include_router(dashboard_router, prefix="/dashboard", tags=["admin-dashboard"])
router.include_router(users_router, prefix="/users", tags=["admin-users"])
router.include_router(predictions_router, prefix="/predictions", tags=["admin-predictions"])
router.include_router(audit_logs_router, prefix="/audit-logs", tags=["admin-audit"])
router.include_router(statistics_router, prefix="/stats", tags=["admin-stats"])
router.include_router(agrovets_router, prefix="/agrovets", tags=["admin-agrovets"])

__all__ = ["router"]


# API endpoints organized as:
# /admin/dashboard/                     - Dashboard data
# /admin/users/                         - List all users
# /admin/users/{user_id}                - Get/Update/Delete specific user
# /admin/users/{user_id}/reset-password - Reset user password
# /admin/predictions/                   - List all predictions
# /admin/predictions/{prediction_id}    - Update/Delete prediction
# /admin/audit-logs/                    - View audit logs
# /admin/stats/                         - Get statistics
# /admin/agrovets/                      - List agrovets
# /admin/agrovets/{agrovet_id}          - Update agrovet