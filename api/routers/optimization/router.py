from fastapi import APIRouter, HTTPException, Depends
from api.schema.optimization_schema import OptimizationRequest, OptimizationResponse
from api.services.optimization.optimization_service import OptimizationService
from api.utils.auth import get_current_user
from api.db.models.database import User

router = APIRouter()

@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_fertilizer(
    request: OptimizationRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Compute optimal fertilizer application rates by crop and product,
    along with expected value gains.
    """
    try:
        response = OptimizationService.optimize(request)
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {e}")
