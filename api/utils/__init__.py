"""
Utility package for the Fertiliser Modelling API.
Provides configuration, initialization, logging, and data processing functionality.
"""
from .config import AppConfig
from .initialization import initialize_app_components, initialize_agrovet_locator, initialize_models, initialize_llm
from .logging_config import setup_logger
from .data_processing import prepare_soil_dataframe, validate_preprocessor_state, check_feature_alignment
from .agrovet import AgrovetLocator, AgrovetInfo, AgrovetResponse, UserLocation
from .preprocessing import SoilDataPreprocessor
from .session import SessionManager
from .dependencies import DependencyManager

__all__ = [
    "AppConfig",

    # Configuration and initialization utilities
    "initialize_app_components",
    "initialize_agrovet_locator",
    "initialize_models",
    "initialize_llm",

    # Logging and configuration utilities
    "setup_logger",

    # Data processing utilities
    "prepare_soil_dataframe",
    "validate_preprocessor_state",
    "check_feature_alignment",

    # Agrovet utilities
    "AgrovetLocator",
    "AgrovetInfo",
    "AgrovetResponse",
    "UserLocation",

    # Preprocessing utilities
    "SoilDataPreprocessor",

    # Session management utilities
    "SessionManager",

    # Dependency management utilities
    "DependencyManager"
]