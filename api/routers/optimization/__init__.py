from fastapi import APIRouter
from .router import router as optimization_subrouter

router = APIRouter(prefix="/optimization", tags=["optimization"])
router.include_router(optimization_subrouter)

__all__ = ["router"]
