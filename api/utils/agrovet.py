import os
import math
import pandas as pd
import numpy as np
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UserLocation(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="User latitude")
    longitude: float = Field(..., ge=-180, le=180, description="User longitude")

class AgrovetInfo(BaseModel):
    name: str
    latitude: float
    longitude: float
    products: List[str]
    prices: List[float]
    distance_km: Optional[float] = None

class AgrovetResponse(BaseModel):
    user_location: UserLocation
    nearest_agrovets: List[AgrovetInfo]
    search_radius_km: float
    timestamp: str

class AgrovetLocator:
    """Class to handle agrovet location and distance calculations"""
    
    def __init__(self, agrovets_df: Optional[pd.DataFrame] = None):
        """Initialize with agrovet data"""
        self.agrovets_df = agrovets_df
        if self.agrovets_df is not None:
            self._validate_dataframe()
    
    def _validate_dataframe(self):
        """Validate that the DataFrame has required columns"""
        # Use the actual column names after normalization
        required_columns = ['name', 'lat', 'lon', 'products', 'prices']
        actual_columns = [col.strip().lower() for col in self.agrovets_df.columns]
        missing_columns = [col for col in required_columns if col not in actual_columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
    
    @staticmethod
    def haversine_distance_vectorized(user_lat: float, user_lon: float, 
                                    agrovet_lats: np.ndarray, agrovet_lons: np.ndarray) -> np.ndarray:
        """
        Vectorized calculation of haversine distances between user location and multiple agrovets
        
        Args:
            user_lat: User's latitude
            user_lon: User's longitude
            agrovet_lats: Array of agrovet latitudes
            agrovet_lons: Array of agrovet longitudes
            
        Returns:
            Array of distances in kilometers
        """
        # Convert to radians
        user_lat, user_lon = np.radians(user_lat), np.radians(user_lon)
        agrovet_lats, agrovet_lons = np.radians(agrovet_lats), np.radians(agrovet_lons)
        
        # Vectorized haversine calculation
        dlat = agrovet_lats - user_lat
        dlon = agrovet_lons - user_lon
        
        a = np.sin(dlat/2)**2 + np.cos(user_lat) * np.cos(agrovet_lats) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        # Earth radius in kilometers
        r = 6371
        return c * r
    
    def find_nearest_agrovets(self, user_lat: float, user_lon: float, 
                            top_k: int = 5, max_distance_km: float = 100) -> List[Dict[str, Any]]:
        """
        Find the nearest agrovets to user location using vectorized operations
        """
        if self.agrovets_df is None or self.agrovets_df.empty:
            logger.warning("No agrovet data available")
            return []
        
        try:
            # Convert latitude and longitude columns to numpy arrays
            agrovet_lats = self.agrovets_df['lat'].astype(float).to_numpy()
            agrovet_lons = self.agrovets_df['lon'].astype(float).to_numpy()
            
            # Calculate all distances at once
            distances = self.haversine_distance_vectorized(
                user_lat, user_lon, agrovet_lats, agrovet_lons
            )
            
            # Filter by maximum distance and get indices
            valid_mask = distances <= max_distance_km
            valid_indices = np.where(valid_mask)[0]
            
            if len(valid_indices) == 0:
                logger.info(f"No agrovets found within {max_distance_km} km")
                return []
            
            # Get distances for valid agrovets and sort
            valid_distances = distances[valid_indices]
            sorted_indices = np.argsort(valid_distances)[:top_k]
            
            # Create result list
            results = []
            for idx in sorted_indices:
                original_idx = valid_indices[idx]
                row = self.agrovets_df.iloc[original_idx]
                
                # Parse products and prices
                products = [p.strip() for p in str(row['products']).split(',') if p.strip()]
                prices_str = str(row['prices']).split(',')
                prices = []
                for price in prices_str:
                    try:
                        prices.append(float(price.strip()))
                    except ValueError:
                        logger.warning(f"Invalid price format: {price}")
                
                # Use the correct column name for the agrovet name
                name_column = 'name' if 'name' in self.agrovets_df.columns else self.agrovets_df.columns[0]
                
                results.append({
                    'name': str(row[name_column]),
                    'latitude': float(row['lat']),
                    'longitude': float(row['lon']),
                    'products': products,
                    'prices': prices,
                    'distance_km': round(float(valid_distances[idx]), 2)
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error in finding nearest agrovets: {e}")
            return []
        
    @classmethod
    def load_from_csv(cls, csv_path: str = None) -> 'AgrovetLocator':
        """Factory method to create AgrovetLocator from CSV file"""
        agrovets_df = load_agrovet_data(csv_path)
        return cls(agrovets_df)
        
    def test_locator(self):
        """Test method to verify AgrovetLocator functionality"""
        if self.agrovets_df is None or self.agrovets_df.empty:
            logger.error("No data available for testing")
            return
            
        # Use first agrovet location as test coordinates
        test_lat = float(self.agrovets_df.iloc[0]['lat'])
        test_lon = float(self.agrovets_df.iloc[0]['lon'])
            
        print("\nTesting AgrovetLocator...")
        print(f"User location: {test_lat}, {test_lon}")
            
        # Find nearest agrovets
        results = self.find_nearest_agrovets(
            test_lat, test_lon, top_k=3, max_distance_km=50
        )
            
        # Display results
        print(f"\nFound {len(results)} nearest agrovets:")
        for i, agrovet in enumerate(results, 1):
            print(f"\n{i}. {agrovet['name']}")
            print(f"   Distance: {agrovet['distance_km']} km")
            print(f"   Products: {', '.join(agrovet['products'])}")
            print(f"   Prices: {agrovet['prices']}")

def load_agrovet_data(csv_path: str = None) -> Optional[pd.DataFrame]:
    """Load agrovet data from CSV file"""
    try:
        # Define possible paths
        if csv_path:
            possible_paths = [csv_path]
        else:
            possible_paths = [
                "data/agrovets.csv",
                "../data/agrovets.csv",
                "agrovets.csv"
            ]
        
        # Try to load from files
        for path in possible_paths:
            if os.path.exists(path):
                df = pd.read_csv(path)
                logger.info(f"Loaded agrovet data from {path}: {len(df)} records")
                logger.info(f"Original columns: {df.columns.tolist()}")
                
                # FIXED: Correct way to normalize column names
                df.columns = df.columns.str.strip().str.lower()
                logger.info(f"Normalized columns: {df.columns.tolist()}")
                
                # Map common column name variations to standard names
                column_mapping = {}
                for col in df.columns:
                    if 'name' in col or col.startswith('name'):
                        column_mapping[col] = 'name'
                    elif 'lat' in col and 'latitude' not in col:
                        column_mapping[col] = 'lat'  
                    elif 'lon' in col and 'longitude' not in col:
                        column_mapping[col] = 'lon'
                    elif 'product' in col:
                        column_mapping[col] = 'products'
                    elif 'price' in col:
                        column_mapping[col] = 'prices'
                
                if column_mapping:
                    df = df.rename(columns=column_mapping)
                    logger.info(f"Mapped columns: {column_mapping}")
                    logger.info(f"Final columns: {df.columns.tolist()}")
                
                return df
        
        # If no file found, create sample data
        logger.warning("No agrovet CSV file found, creating sample data")
        sample_data = {
            'name': ['Nnnn', 'Teso', 'GOODWILL FAMERS AGROVET', 'Farm Choice Agrovet', 'Kemodo Agrovet'],
            'lat': [-1.5117552, -1.5119642, 0.493122, 0.4731916, 0.467253065],
            'lon': [37.2668997, 37.2669725, 34.1335989, 34.1881309, 34.18603331],
            'products': ['NPK, CAN, DAP', 'NPK, CAN, DAP', 'NPK, CAN, DAP', 'NPK, CAN, DAP', 'NPK, CAN, DAP'],
            'prices': ['60,55,70', '60,55,70', '60,55,70', '60,55,70', '60,55,70']
        }
        df = pd.DataFrame(sample_data)
        logger.info("Created sample agrovet data")
        return df
        
    except Exception as e:
        logger.error(f"Error loading agrovet data: {e}")
        return None