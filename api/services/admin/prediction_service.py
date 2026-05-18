"""
Admin prediction management service
"""
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from sqlalchemy.orm import selectinload

from api.db.models.database import User, SoilPrediction
from api.schema.auth_schema import (
    AdminPredictionResponse, AdminPredictionUpdate, AdminPredictionListResponse
)

logger = logging.getLogger(__name__)

class AdminPredictionService:
    """
    Service responsible for administrative oversight of user soil predictions.
    
    Provides capabilities for filtering global prediction history, flagging specific
    predictions for review, adding administrative notes, and permanently deleting records.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the AdminPredictionService.
        
        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db
    
    async def get_predictions_with_filters(
        self,
        page: int = 1,
        size: int = 20,
        user_id: Optional[str] = None,
        is_flagged: Optional[bool] = None,
        fertility_status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> AdminPredictionListResponse:
        """
        Retrieve a paginated and filtered list of soil predictions across all users.
        
        Args:
            page (int): Target page number. Defaults to 1.
            size (int): Number of records per page. Defaults to 20.
            user_id (Optional[str]): Filter predictions belonging to a specific user.
            is_flagged (Optional[bool]): Filter predictions flagged by an administrator.
            fertility_status (Optional[str]): Filter by the final classification label.
            sort_by (str): The column name to sort by. Defaults to 'created_at'.
            sort_order (str): Sort direction ('asc' or 'desc'). Defaults to 'desc'.
            
        Returns:
            AdminPredictionListResponse: A payload containing the paginated predictions.
            
        Raises:
            Exception: If an unexpected database query error occurs.
        """
        logger.info(f"Fetching predictions with filters: user_id={user_id}, is_flagged={is_flagged}")
        
        try:
            # Build base query
            stmt = select(SoilPrediction).options(selectinload(SoilPrediction.user))
            count_stmt = select(func.count(SoilPrediction.id))
            
            # Apply filters
            conditions = []
            
            if user_id:
                conditions.append(SoilPrediction.user_id == user_id)
            
            if is_flagged is not None:
                conditions.append(SoilPrediction.is_flagged == is_flagged)
            
            if fertility_status:
                conditions.append(SoilPrediction.soil_fertility_status == fertility_status)
            
            if conditions:
                stmt = stmt.where(and_(*conditions))
                count_stmt = count_stmt.where(and_(*conditions))
            
            # Apply sorting
            if hasattr(SoilPrediction, sort_by):
                sort_column = getattr(SoilPrediction, sort_by)
                if sort_order == "desc":
                    stmt = stmt.order_by(desc(sort_column))
                else:
                    stmt = stmt.order_by(sort_column)
            
            # Apply pagination
            offset = (page - 1) * size
            stmt = stmt.offset(offset).limit(size)
            
            # Execute queries
            predictions_result = await self.db.execute(stmt)
            predictions = predictions_result.scalars().all()
            
            count_result = await self.db.execute(count_stmt)
            total = count_result.scalar()
            
            # Convert to response format
            prediction_list = [
                self._prediction_to_admin_response(pred)
                for pred in predictions
            ]
            
            return AdminPredictionListResponse(
                predictions=prediction_list,
                total=total,
                page=page,
                size=size,
                pages=(total + size - 1) // size
            )
            
        except Exception as e:
            logger.error(f"Error fetching predictions: {e}")
            raise
    
    async def update_prediction(
        self, 
        prediction_id: str, 
        prediction_update: AdminPredictionUpdate,
        updated_by: User
    ) -> AdminPredictionResponse:
        """
        Update a specific prediction's administrative metadata (e.g., flags and notes).
        
        Args:
            prediction_id (str): The UUID string of the prediction to update.
            prediction_update (AdminPredictionUpdate): The payload containing flag status and notes.
            updated_by (User): The authenticated admin performing the update.
            
        Returns:
            AdminPredictionResponse: The updated prediction record.
            
        Raises:
            ValueError: If the requested prediction does not exist.
        """
        logger.info(f"Updating prediction {prediction_id} by admin {updated_by.username}")
        
        try:
            # Get prediction with user
            stmt = select(SoilPrediction).options(selectinload(SoilPrediction.user)).where(
                SoilPrediction.id == prediction_id
            )
            result = await self.db.execute(stmt)
            prediction = result.scalar_one_or_none()
            
            if not prediction:
                raise ValueError("Prediction not found")
            
            # Update fields
            changes = {}
            if prediction_update.is_flagged is not None:
                changes["is_flagged"] = prediction_update.is_flagged
                prediction.is_flagged = prediction_update.is_flagged
            
            if prediction_update.admin_notes is not None:
                changes["admin_notes"] = prediction_update.admin_notes
                prediction.admin_notes = prediction_update.admin_notes
            
            await self.db.commit()
            await self.db.refresh(prediction)
            
            logger.info(f"Prediction updated by admin: {prediction_id}")
            return self._prediction_to_admin_response(prediction)
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating prediction: {e}")
            raise
    
    async def delete_prediction(self, prediction_id: str, deleted_by: User) -> Dict[str, Any]:
        """
        Permanently delete a user's soil prediction from the database.
        
        Args:
            prediction_id (str): The UUID string of the prediction to delete.
            deleted_by (User): The authenticated admin performing the deletion.
            
        Returns:
            Dict[str, Any]: A summary of the deleted prediction for audit logging.
            
        Raises:
            ValueError: If the requested prediction does not exist.
        """
        logger.info(f"Deleting prediction {prediction_id} by admin {deleted_by.username}")
        
        try:
            # Get prediction
            stmt = select(SoilPrediction).options(selectinload(SoilPrediction.user)).where(
                SoilPrediction.id == prediction_id
            )
            result = await self.db.execute(stmt)
            prediction = result.scalar_one_or_none()
            
            if not prediction:
                raise ValueError("Prediction not found")
            
            # Store prediction info for logging
            prediction_info = {
                "user_id": str(prediction.user_id),
                "username": prediction.user.username,
                "soil_fertility_status": prediction.soil_fertility_status,
                "created_at": prediction.created_at.isoformat()
            }
            
            # Delete prediction
            await self.db.delete(prediction)
            await self.db.commit()
            
            logger.info(f"Prediction deleted by admin: {prediction_id}")
            return {"deleted_prediction": prediction_info}
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting prediction: {e}")
            raise
    
    def _prediction_to_admin_response(self, prediction: SoilPrediction) -> AdminPredictionResponse:
        """
        Convert a SQLAlchemy SoilPrediction model into an AdminPredictionResponse Pydantic schema.
        """
        return AdminPredictionResponse(
            id=prediction.id,
            user_id=prediction.user_id,
            username=prediction.user.username,
            user_email=prediction.user.email,
            soil_ph=float(prediction.soil_ph) if prediction.soil_ph else None,
            nitrogen=float(prediction.nitrogen) if prediction.nitrogen else None,
            phosphorus=float(prediction.phosphorus) if prediction.phosphorus else None,
            potassium=float(prediction.potassium) if prediction.potassium else None,
            organic_carbon=float(prediction.organic_carbon) if prediction.organic_carbon else None,
            calcium=float(prediction.calcium) if prediction.calcium else None,
            magnesium=float(prediction.magnesium) if prediction.magnesium else None,
            soil_health_index=float(prediction.soil_health_index) if prediction.soil_health_index else 0.0,
            initial_soil_fertility_status=prediction.initial_soil_fertility_status,
            soil_fertility_status=prediction.soil_fertility_status,
            mentions=prediction.mentions or [],
            recommendations=prediction.recommendations or [],
            is_flagged=prediction.is_flagged or False,
            admin_notes=prediction.admin_notes,
            created_at=prediction.created_at,
            location_lat=float(prediction.location_lat) if prediction.location_lat else None,
            location_lng=float(prediction.location_lng) if prediction.location_lng else None,
            location_name=prediction.location_name
        )