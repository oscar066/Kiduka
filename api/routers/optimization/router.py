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
    
    This endpoint utilizes the optimization engine to evaluate soil data,
    crop area, grain prices, and available fertilizers against a defined budget.
    It returns both the recommended fertilizer application rates and a comparison
    of the expected financial return against a baseline scenario (no fertilizer).
    
    Args:
        request (OptimizationRequest): Payload containing location, soil data, 
            crops, available fertilizers, and scenario configurations (e.g., budget).
        current_user (User): The authenticated user making the request (injected).
        
    Returns:
        OptimizationResponse: The result of the optimization, containing 
        application rows, baseline/feasible scenarios, and summary metrics.
        
    Raises:
        HTTPException: If the payload validation fails or optimization constraints 
            are invalid (status 400).
        HTTPException: If the mathematical solver encounters an error or timeout (status 500).
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
