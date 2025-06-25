"""
Prediction routes for soil analysis and history management - FIXED
"""
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload

from api.db.connection import get_db
from api.models.database import User, SoilPrediction, Agrovet
from api.schema.schema import (
    SoilData, PredictionResponse, PredictionHistory, 
    PredictionListResponse, AgrovetInfo, SoilAnalysisResponse
)
from api.utils.auth import get_current_user, get_current_user_optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions", tags=["predictions"])
async def save_prediction_to_db(
    db: AsyncSession,
    user_id: str,
    soil_data: dict,
    fertility_prediction: str,
    fertility_confidence: float,
    fertilizer_prediction: str,
    fertilizer_confidence: float,
    structured_response: dict = None,
    agrovets: List[dict] = None
) -> SoilPrediction:
    """Save prediction to database"""
    try:
        # Step 1: Prepare the list of Agrovet ORM objects.
        agrovet_objects = []
        if agrovets:
            for agrovet_data in agrovets:
                # Find existing agrovet
                stmt = select(Agrovet).where(Agrovet.name == agrovet_data.get('name'))
                result = await db.execute(stmt)
                agrovet = result.scalar_one_or_none()
                
                if not agrovet:
                    # Create new agrovet if it doesn't exist
                    agrovet = Agrovet(
                        name=agrovet_data.get('name', 'Unknown'),
                        latitude=agrovet_data.get('latitude'),
                        longitude=agrovet_data.get('longitude'),
                        products=agrovet_data.get('products', []),
                        prices=agrovet_data.get('prices', []),
                        address=agrovet_data.get('address'),
                        phone=agrovet_data.get('phone'),
                        email=agrovet_data.get('email'),
                        rating=agrovet_data.get('rating'),
                        services=agrovet_data.get('services', [])
                    )
                    db.add(agrovet)
                    # We don't need to flush here, SQLAlchemy will handle the order
                
                agrovet_objects.append(agrovet)

        # Step 2: Create the SoilPrediction object with the relationship pre-populated.
        # This prevents the lazy-loading issue.
        prediction = SoilPrediction(
            user_id=user_id,
            simplified_texture=soil_data.get('simplified_texture'),
            soil_ph=soil_data.get('ph'),
            nitrogen=soil_data.get('n'),
            phosphorus=soil_data.get('p'),
            potassium=soil_data.get('k'),
            organic_matter=soil_data.get('o'),
            calcium=soil_data.get('ca'),
            magnesium=soil_data.get('mg'),
            copper=soil_data.get('cu'),
            iron=soil_data.get('fe'),
            zinc=soil_data.get('zn'),
            location_lat=soil_data.get('latitude'),
            location_lng=soil_data.get('longitude'),
            location_name=soil_data.get('location_name'),
            fertility_prediction=fertility_prediction,
            fertility_confidence=fertility_confidence,
            fertilizer_recommendation=fertilizer_prediction,
            fertilizer_confidence=fertilizer_confidence,
            structured_response=structured_response,
            agrovets=agrovet_objects  # Pass the list of ORM objects directly
        )
        
        db.add(prediction)
        
        # Step 3: Commit the transaction.
        # .commit() will handle flushing all new objects (prediction and any new agrovets)
        # in the correct order.
        await db.commit()
        await db.refresh(prediction) # Refresh to get the final state from the DB
        
        return prediction
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error saving prediction to database: {e}", exc_info=True)
        raise

@router.get("/", response_model=PredictionListResponse)
async def get_user_predictions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order")
):
    """Get user's prediction history with pagination"""
    logger.info(f"Fetching predictions for user: {current_user.username}")
    
    try:
        # Calculate offset
        offset = (page - 1) * size
        
        # Build query with proper async handling
        stmt = select(SoilPrediction).where(SoilPrediction.user_id == current_user.id)
        
        # Add sorting
        if hasattr(SoilPrediction, sort_by):
            sort_column = getattr(SoilPrediction, sort_by)
            if sort_order == "desc":
                stmt = stmt.order_by(desc(sort_column))
            else:
                stmt = stmt.order_by(sort_column)
        else:
            stmt = stmt.order_by(desc(SoilPrediction.created_at))
        
        # Add pagination and eager loading
        stmt = stmt.offset(offset).limit(size).options(selectinload(SoilPrediction.agrovets))
        
        # Execute query
        result = await db.execute(stmt)
        predictions = result.scalars().all()
        
        # Get total count
        count_stmt = select(func.count(SoilPrediction.id)).where(
            SoilPrediction.user_id == current_user.id
        )
        count_result = await db.execute(count_stmt)
        total = count_result.scalar()
        
        # Convert to response format with updated AgrovetInfo structure
        prediction_list = []
        for pred in predictions:
            agrovet_list = [
                AgrovetInfo(
                    id=ag.id,
                    name=ag.name,
                    latitude=float(ag.latitude) if ag.latitude else 0.0,
                    longitude=float(ag.longitude) if ag.longitude else 0.0,
                    products=ag.products or [],
                    prices=[float(p) for p in ag.prices] if ag.prices else [],
                    distance_km=0.0,  # This would be calculated from the association table
                    # Optional fields
                    address=ag.address,
                    phone=ag.phone,
                    email=ag.email,
                    rating=float(ag.rating) if ag.rating else None,
                    services=ag.services or []
                )
                for ag in pred.agrovets
            ]
            
            prediction_history = PredictionHistory(
                id=pred.id,
                user_id=pred.user_id,
                # Updated field mappings
                simplified_texture=pred.simplified_texture,
                soil_ph=float(pred.soil_ph) if pred.soil_ph else None,
                nitrogen=float(pred.nitrogen) if pred.nitrogen else None,
                phosphorus=float(pred.phosphorus) if pred.phosphorus else None,
                potassium=float(pred.potassium) if pred.potassium else None,
                organic_matter=float(pred.organic_matter) if pred.organic_matter else None,
                calcium=float(pred.calcium) if pred.calcium else None,
                magnesium=float(pred.magnesium) if pred.magnesium else None,
                copper=float(pred.copper) if pred.copper else None,
                iron=float(pred.iron) if pred.iron else None,
                zinc=float(pred.zinc) if pred.zinc else None,
                location_lat=float(pred.location_lat) if pred.location_lat else None,
                location_lng=float(pred.location_lng) if pred.location_lng else None,
                location_name=pred.location_name,
                fertility_prediction=pred.fertility_prediction,
                fertility_confidence=float(pred.fertility_confidence) if pred.fertility_confidence else None,
                fertilizer_recommendation=pred.fertilizer_recommendation,
                fertilizer_confidence=float(pred.fertilizer_confidence) if pred.fertilizer_confidence else None,
                structured_response=pred.structured_response,
                agrovets=agrovet_list,
                created_at=pred.created_at,
                updated_at=pred.updated_at
            )
            prediction_list.append(prediction_history)
        
        return PredictionListResponse(
            predictions=prediction_list,
            total=total,
            page=page,
            size=size,
            pages=(total + size - 1) // size
        )
        
    except Exception as e:
        logger.error(f"Error fetching predictions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch predictions"
        )

@router.get("/{prediction_id}", response_model=PredictionHistory)
async def get_prediction_detail(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a specific prediction"""
    logger.info(f"Fetching prediction detail: {prediction_id}")
    
    try:
        stmt = select(SoilPrediction).where(
            SoilPrediction.id == prediction_id,
            SoilPrediction.user_id == current_user.id
        ).options(selectinload(SoilPrediction.agrovets))
        
        result = await db.execute(stmt)
        prediction = result.scalar_one_or_none()
        
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prediction not found"
            )
        
        # Convert to response format with updated structure
        agrovet_list = [
            AgrovetInfo(
                id=ag.id,
                name=ag.name,
                latitude=float(ag.latitude) if ag.latitude else 0.0,
                longitude=float(ag.longitude) if ag.longitude else 0.0,
                products=ag.products or [],
                prices=[float(p) for p in ag.prices] if ag.prices else [],
                distance_km=0.0,  # This would be calculated from the association table
                # Optional fields
                address=ag.address,
                phone=ag.phone,
                email=ag.email,
                rating=float(ag.rating) if ag.rating else None,
                services=ag.services or []
            )
            for ag in prediction.agrovets
        ]
        
        return PredictionHistory(
            id=prediction.id,
            user_id=prediction.user_id,
            # Updated field mappings
            simplified_texture=prediction.simplified_texture,
            soil_ph=float(prediction.soil_ph) if prediction.soil_ph else None,
            nitrogen=float(prediction.nitrogen) if prediction.nitrogen else None,
            phosphorus=float(prediction.phosphorus) if prediction.phosphorus else None,
            potassium=float(prediction.potassium) if prediction.potassium else None,
            organic_matter=float(prediction.organic_matter) if prediction.organic_matter else None,
            calcium=float(prediction.calcium) if prediction.calcium else None,
            magnesium=float(prediction.magnesium) if prediction.magnesium else None,
            copper=float(prediction.copper) if prediction.copper else None,
            iron=float(prediction.iron) if prediction.iron else None,
            zinc=float(prediction.zinc) if prediction.zinc else None,
            location_lat=float(prediction.location_lat) if prediction.location_lat else None,
            location_lng=float(prediction.location_lng) if prediction.location_lng else None,
            location_name=prediction.location_name,
            fertility_prediction=prediction.fertility_prediction,
            fertility_confidence=float(prediction.fertility_confidence) if prediction.fertility_confidence else None,
            fertilizer_recommendation=prediction.fertilizer_recommendation,
            fertilizer_confidence=float(prediction.fertilizer_confidence) if prediction.fertilizer_confidence else None,
            structured_response=prediction.structured_response,
            agrovets=agrovet_list,
            created_at=prediction.created_at,
            updated_at=prediction.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching prediction detail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch prediction detail"
        )

@router.delete("/{prediction_id}")
async def delete_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific prediction"""
    logger.info(f"Deleting prediction: {prediction_id}")
    
    try:
        async with db.begin():
            stmt = select(SoilPrediction).where(
                SoilPrediction.id == prediction_id,
                SoilPrediction.user_id == current_user.id
            )
            
            result = await db.execute(stmt)
            prediction = result.scalar_one_or_none()
            
            if not prediction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Prediction not found"
                )
            
            await db.delete(prediction)
            # Commit happens automatically with context manager
        
        logger.info(f"Prediction deleted successfully: {prediction_id}")
        return {"message": "Prediction deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prediction"
        )