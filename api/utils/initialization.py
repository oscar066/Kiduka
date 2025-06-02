"""Application initialization utilities"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Import local modules
from models.model_loader import ModelLoader
from api.utils.agrovet import AgrovetLocator
from api.utils.config import AppConfig
from api.utils.logging_config import setup_logger

# Setup logging
logger = setup_logger("init_app", level=logging.INFO, console_level=logging.INFO)

# Load environment variables
load_dotenv()

def initialize_models() -> Dict[str, Any]:
    """Initialize and load all models and preprocessors"""
    components = {}
    
    try:
        logger.info("Initializing model loader...")
        # Get the absolute path to the models directory
        current_dir = Path(__file__).parent.parent
        models_dir = current_dir.parent / "models"
        
        # Create ModelLoader instance with specific models directory
        loader = ModelLoader(models_dir=str(models_dir))
        
        # List available models for debugging
        available_models = loader.list_available_models()
        logger.debug(f"Available model files: {available_models}")
        
        if not available_models:
            logger.error(f"No model files found in {models_dir}")
            return components
        
        # Load fertility components
        logger.info("Loading fertility preprocessor...")
        fertility_preprocessor = loader.load_preprocessor(AppConfig.MODEL_FILES['fertility_preprocessor'])
        logger.info(f"Fertility preprocessor loaded. Is fitted: {fertility_preprocessor.is_fitted}")
        logger.debug(f"Fertility preprocessor encoders: {list(fertility_preprocessor.label_encoders.keys())}")
        logger.debug(f"Fertility preprocessor feature columns: {fertility_preprocessor.feature_columns}")
        
        logger.info("Loading fertility model...")
        fertility_model = loader.load_model(AppConfig.MODEL_FILES['fertility_model'])
        logger.info(f"Fertility model loaded: {type(fertility_model)}")
        
        # Load fertilizer components
        logger.info("Loading fertilizer preprocessor...")
        fertilizer_preprocessor = loader.load_preprocessor(AppConfig.MODEL_FILES['fertilizer_preprocessor'])
        logger.info(f"Fertilizer preprocessor loaded. Is fitted: {fertilizer_preprocessor.is_fitted}")
        logger.debug(f"Fertilizer preprocessor encoders: {list(fertilizer_preprocessor.label_encoders.keys())}")
        logger.debug(f"Fertilizer preprocessor feature columns: {fertilizer_preprocessor.feature_columns}")
        
        logger.info("Loading fertilizer model...")
        fertilizer_model = loader.load_model(AppConfig.MODEL_FILES['fertilizer_model'])
        logger.info(f"Fertilizer model loaded: {type(fertilizer_model)}")
        
        # Store components
        components.update({
            'fertility_preprocessor': fertility_preprocessor,
            'fertility_model': fertility_model,
            'fertilizer_preprocessor': fertilizer_preprocessor,
            'fertilizer_model': fertilizer_model
        })
        
        logger.info("All models and preprocessors loaded successfully!")
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        logger.error(f"Exception details:", exc_info=True)
    
    return components

def initialize_llm() -> Optional[ChatOpenAI]:
    """Initialize OpenAI LLM"""
    try:
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key and openai_api_key != "your-openai-api-key-here":
            llm = ChatOpenAI(
                model=AppConfig.OPENAI_MODEL,
                temperature=AppConfig.OPENAI_TEMPERATURE,
                api_key=openai_api_key
            )
            logger.info("OpenAI LLM initialized successfully")
            return llm
        else:
            logger.warning("OpenAI API key not found or invalid")
            return None
    except Exception as e:
        logger.error(f"Error initializing OpenAI LLM: {e}")
        return None

def initialize_agrovet_locator() -> Optional[AgrovetLocator]:
    """Initialize AgrovetLocator with data"""
    try:
        current_dir = Path(__file__).parent.parent
        data_path = current_dir.parent / "data" / AppConfig.DATA_FILES['agrovet_data']
        agrovet_locator = AgrovetLocator.load_from_csv(str(data_path))
        logger.info("AgrovetLocator initialized successfully")
        return agrovet_locator
    except Exception as e:
        logger.error(f"Error initializing AgrovetLocator: {e}")
        return None

def initialize_app_components() -> Dict[str, Any]:
    """Initialize all application components"""
    logger.info("Initializing application components...")
    
    components = {}
    
    # Initialize models
    model_components = initialize_models()
    components.update(model_components)
    
    # Initialize LLM
    llm = initialize_llm()
    if llm:
        components['llm'] = llm
    
    # Initialize AgrovetLocator
    agrovet_locator = initialize_agrovet_locator()
    if agrovet_locator:
        components['agrovet_locator'] = agrovet_locator
    
    logger.info(f"Initialized components: {list(components.keys())}")
    return components