"""
Authentication and authorization related routes and services.
"""
from fastapi import APIRouter
from .auth_routers import router as auth_router

# Main auth router that includes all sub-routers
router = APIRouter(prefix="/auth", tags=["authentication"])

# Include all sub-routers
router.include_router(auth_router, prefix="", tags=["auth"])

__all__ = ["router"]