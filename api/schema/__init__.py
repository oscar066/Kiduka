"""This module defines the schema Agents State, APIs response and SoilData input."""
from .schema import (
    WorkflowState, 
    PredictionResponse, 
    SoilData, Recommendation, 
    SoilExplanation, SoilAnalysisResponse, 
    RecommendationDict, DetailedExplanationDict,
    PredictionListResponse, PredictionHistory, AgrovetInfo,
    )

from .auth_schema import (
    UserBase, UserCreate, UserLogin, UserResponse, 
    UserUpdate, Token, TokenData, PasswordChange, 
    PasswordReset, PasswordResetConfirm,
)

__all__ = [
    # Schema imports
    "WorkflowState",
    "PredictionResponse",
    "SoilData",
    "Recommendation",
    "SoilExplanation",
    "SoilAnalysisResponse",
    "RecommendationDict",
    "DetailedExplanationDict",
    "PredictionListResponse",
    "PredictionHistory",
    "AgrovetInfo",

    # Auth schema imports
    "UserBase",
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "Token",
    "TokenData",
    "PasswordChange",
    "PasswordReset",
    "PasswordResetConfirm"
]