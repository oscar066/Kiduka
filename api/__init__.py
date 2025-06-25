"""
Fertility and Fertilizer Prediction API
This module initializes the FastAPI application and sets up the endpoints for soil fertility and fertilizer prediction and
search for nearest agrovet locations.
"""
from .main import app

__all__ = [
    "app"
]