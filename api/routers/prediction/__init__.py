"""
Prediction routes module with organized sub-routers
"""

from fastapi import APIRouter
from .prediction_router import router as prediction_router
from .prediction_history_router import router as prediction_history_router

# Main prediction router that includes all sub-routers
router = APIRouter(prefix="/predictions", tags=["predictions"])

# Include all sub-routers
router.include_router(prediction_router, prefix="", tags=["prediction-main"])
router.include_router(prediction_history_router, prefix="/history", tags=["prediction-history"])

__all__ = ["router"]

# API endpoints organized as:
# /predictions/predict                - Main prediction endpoint
# /predictions/history/               - List user's prediction history