"""
Prediction history service - handles user prediction history management
"""
import logging
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload

from api.db.models.database import User, SoilPrediction
from api.schema.schema import PredictionHistory, PredictionListResponse, AgrovetInfo

logger = logging.getLogger(__name__)

class PredictionHistoryService:
    """
    Service responsible for managing and retrieving a user's historical predictions.
    
    Handles paginated queries, detailed retrieval, and deletion of past soil analyses.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the PredictionHistoryService.
        
        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db
    
    async def get_user_predictions(
        self,
        user: User,
        page: int = 1,
        size: int = 10,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> PredictionListResponse:
        """
        Retrieve a paginated list of a specific user's soil predictions.
        
        Args:
            user (User): The authenticated user whose history is being requested.
            page (int): The target page number. Defaults to 1.
            size (int): Number of records per page. Defaults to 10.
            sort_by (str): The column name to sort by. Defaults to "created_at".
            sort_order (str): "asc" or "desc". Defaults to "desc".
            
        Returns:
            PredictionListResponse: A paginated payload containing the history records.
            
        Raises:
            Exception: If an unexpected database error occurs during the fetch.
        """
        logger.info(f"Fetching predictions for user: {user.username}")
        
        try:
            # Calculate offset
            offset = (page - 1) * size
            
            # Build query
            stmt = select(SoilPrediction).where(SoilPrediction.user_id == user.id)
            
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
            result = await self.db.execute(stmt)
            predictions = result.scalars().all()
            
            # Get total count
            count_stmt = select(func.count(SoilPrediction.id)).where(
                SoilPrediction.user_id == user.id
            )
            count_result = await self.db.execute(count_stmt)
            total = count_result.scalar()
            
            # Convert to response format
            prediction_list = []
            for pred in predictions:
                history_item = self._prediction_to_history(pred)
                if history_item:  # Only add if conversion was successful
                    prediction_list.append(history_item)
            
            return PredictionListResponse(
                predictions=prediction_list,
                total=total,
                page=page,
                size=size,
                pages=(total + size - 1) // size
            )
            
        except Exception as e:
            logger.error(f"Error fetching predictions: {e}")
            raise
    
    async def get_prediction_detail(
        self, 
        user: User, 
        prediction_id: str
    ) -> Optional[PredictionHistory]:
        """
        Fetch the complete details of a specific historical prediction.
        
        Args:
            user (User): The authenticated user requesting the details.
            prediction_id (str): The UUID string of the prediction.
            
        Returns:
            Optional[PredictionHistory]: The detailed history object, or None if not found
                or if it does not belong to the user.
                
        Raises:
            Exception: If an unexpected database error occurs.
        """
        logger.info(f"Fetching prediction detail: {prediction_id}")
        
        try:
            stmt = select(SoilPrediction).where(
                SoilPrediction.id == prediction_id,
                SoilPrediction.user_id == user.id
            ).options(selectinload(SoilPrediction.agrovets))
            
            result = await self.db.execute(stmt)
            prediction = result.scalar_one_or_none()
            
            if not prediction:
                return None
            
            return self._prediction_to_history(prediction)
            
        except Exception as e:
            logger.error(f"Error fetching prediction detail: {e}")
            raise
    
    async def delete_prediction(self, user: User, prediction_id: str) -> bool:
        """
        Permanently delete a specific prediction from a user's history.
        
        Args:
            user (User): The authenticated user requesting the deletion.
            prediction_id (str): The UUID string of the prediction to delete.
            
        Returns:
            bool: True if successfully deleted, False if the prediction was not found.
            
        Raises:
            Exception: If a database transaction error occurs during deletion.
        """
        logger.info(f"Deleting prediction: {prediction_id}")
        
        try:
            stmt = select(SoilPrediction).where(
                SoilPrediction.id == prediction_id,
                SoilPrediction.user_id == user.id
            )
            
            result = await self.db.execute(stmt)
            prediction = result.scalar_one_or_none()
            
            if not prediction:
                return False
            
            await self.db.delete(prediction)
            await self.db.commit()  # Explicitly commit the transaction
            return True
                
        except Exception as e:
            logger.error(f"Error deleting prediction: {e}")
            await self.db.rollback()  # Rollback on error
            raise
    
    def _prediction_to_history(self, prediction: SoilPrediction) -> Optional[PredictionHistory]:
        """
        Convert a SQLAlchemy SoilPrediction model into a Pydantic PredictionHistory schema.
        
        Args:
            prediction (SoilPrediction): The database model instance.
            
        Returns:
            Optional[PredictionHistory]: The serialized schema, or None if conversion fails.
        """
        try:
            # Convert agrovets to AgrovetInfo objects
            agrovet_list = []
            if prediction.agrovets:
                for ag in prediction.agrovets:
                    try:
                        agrovet_info = AgrovetInfo(
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
                        agrovet_list.append(agrovet_info)
                    except Exception as e:
                        logger.warning(f"Error converting agrovet {ag.id}: {e}")
                        continue
            
            # Create PredictionHistory object
            return PredictionHistory(
                id=prediction.id,
                user_id=prediction.user_id,
                # Soil data fields
                soil_ph=float(prediction.soil_ph) if prediction.soil_ph else None,
                nitrogen=float(prediction.nitrogen) if prediction.nitrogen else None,
                phosphorus=float(prediction.phosphorus) if prediction.phosphorus else None,
                potassium=float(prediction.potassium) if prediction.potassium else None,
                organic_carbon=float(prediction.organic_carbon) if prediction.organic_carbon else None,
                calcium=float(prediction.calcium) if prediction.calcium else None,
                magnesium=float(prediction.magnesium) if prediction.magnesium else None,
                location_lat=float(prediction.location_lat) if prediction.location_lat else None,
                location_lng=float(prediction.location_lng) if prediction.location_lng else None,
                location_name=prediction.location_name,
                # Analysis results
                soil_health_index=float(prediction.soil_health_index) if prediction.soil_health_index else 0.0,
                initial_soil_fertility_status=prediction.initial_soil_fertility_status,
                soil_fertility_status=prediction.soil_fertility_status,
                mentions=prediction.mentions or [],
                recommendations=prediction.recommendations or [],
                nutrients=prediction.nutrients or {},
                prediction_mode=prediction.prediction_mode,
                confidence_data=prediction.confidence_data,
                agrovets=agrovet_list,
                # Timestamps
                created_at=prediction.created_at,
                updated_at=prediction.updated_at
            )
            
        except Exception as e:
            logger.error(f"Error converting prediction to history: {e}")
            return None