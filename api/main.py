import os
import sys
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# FastAPI imports
import logging
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import schemas
from api.schema.schema import WorkflowState

# Import modularized components
from api.utils.config import AppConfig
from api.utils.initialization import initialize_app_components
from api.utils.logging_config import setup_logger
from api.utils.dependencies import dependency_manager
from api.utils.session import SessionManager
from api.workflow.prediction_workflow import create_prediction_workflow

# Import database components
from api.db.connection import db_manager, get_db

# Import routes
from api.routers.auth_router import router as auth_router
from api.routers.predictions_router import router as predictions_router
from api.routers.predict_router import router as predict_router

# Load environment variables
load_dotenv()

# Setup logging
logger = setup_logger("API", level=logging.INFO, console_level=logging.INFO)

# Global components dictionary
app_components = {}
prediction_workflow = None
session_manager = SessionManager()

# Initialize app configuration
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application lifespan events"""
    # Startup
    logger.info("Initializing application...")
    
    # Initialize app components (models, preprocessors, etc.)
    global app_components, prediction_workflow
    app_components = initialize_app_components()
    prediction_workflow = create_prediction_workflow()
    
    # Set dependencies in dependency manager
    dependency_manager.set_components(app_components)
    dependency_manager.set_workflow(prediction_workflow)
    dependency_manager.set_session_manager(session_manager)
    
    # Create database tables
    try:
        await db_manager.create_tables()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    logger.info("Application initialization completed")
    
    yield  # This is where the application runs
    
    # Shutdown
    logger.info("Shutting down application...")
    
    try:
        await db_manager.close()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")
    
    logger.info("Application shutdown completed")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Agricultural Prediction API", 
    description="Soil fertility prediction and fertilizer recommendation system with AI explanations and user management",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add session middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY"),
    session_cookie="soil_analysis_session",
    max_age=3600  # 1 hour session
)

# Include routers
app.include_router(auth_router)
app.include_router(predictions_router)
app.include_router(predict_router)


# Make components and session manager available globally for routers
def get_app_components():
    return app_components

def get_prediction_workflow():
    return prediction_workflow

def get_session_manager():
    return session_manager


@app.get("/")
async def root():
    """Root endpoint with API information"""
    logger.info("Root endpoint accessed")
    return {
        "message": "Agricultural Prediction API",
        "version": "2.0.0",
        "status": "running",
        "features": {
            "user_authentication": True,
            "prediction_history": True,
            "agrovet_recommendations": True,
            "ai_explanations": True
        },
        "models_loaded": {
            "fertility_model": app_components.get('fertility_model') is not None,
            "fertility_preprocessor": app_components.get('fertility_preprocessor') is not None,
            "fertilizer_model": app_components.get('fertilizer_model') is not None,
            "fertilizer_preprocessor": app_components.get('fertilizer_preprocessor') is not None
        },
        "endpoints": {
            "predict": "/predict - POST soil data for predictions",
            "auth": "/auth - Authentication endpoints",
            "predictions": "/predictions - Prediction history management",
            "health": "/health - Health check",
            "docs": "/docs - API documentation"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.info("Health check endpoint accessed")
    
    # Check database connectivity
    db_healthy = False
    try:
        async for session in get_db():
            # Simple query to check connection
            await session.execute("SELECT 1")
            db_healthy = True
            break
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
    
    health_status = {
        "status": "healthy" if all([
            app_components.get('fertility_model'),
            app_components.get('fertility_preprocessor'),
            app_components.get('fertilizer_model'),
            app_components.get('fertilizer_preprocessor'),
            db_healthy
        ]) else "degraded",
        "timestamp": datetime.now().isoformat(),
        "database": "healthy" if db_healthy else "degraded",
        "models_available": {
            "fertility_model": app_components.get('fertility_model') is not None,
            "fertility_preprocessor": (app_components.get('fertility_preprocessor') is not None and 
                                    getattr(app_components.get('fertility_preprocessor'), 'is_fitted', False)),
            "fertilizer_model": app_components.get('fertilizer_model') is not None,
            "fertilizer_preprocessor": (app_components.get('fertilizer_preprocessor') is not None and 
                                      getattr(app_components.get('fertilizer_preprocessor'), 'is_fitted', False))
        },
        "llm_available": app_components.get('llm') is not None,
        "active_sessions": session_manager.get_session_count()
    }
    
    logger.debug(f"Health status: {health_status}")
    return health_status

@app.get("/session")
async def get_session_info(request: Request):
    """Get current session information (for non-authenticated users)"""
    logger.info("Session info endpoint accessed")
    
    try:
        session_data = await session_manager.get_session(request)
        return {
            "session_id": request.session.get("session_id"),
            "created_at": request.session.get("created_at"),
            "predictions_count": len(session_data.get("predictions", [])),
            "last_accessed": session_data.get("last_accessed")
        }
    except Exception as e:
        logger.error(f"Error getting session info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get session info")

@app.get("/stats")
async def get_api_stats():
    """Get API usage statistics"""
    logger.info("API stats endpoint accessed")
    
    try:
        # Get basic stats
        stats = {
            "total_active_sessions": session_manager.get_session_count(),
            "api_version": "2.0.0",
            "uptime": "Available via health endpoint",
            "features": {
                "authentication": True,
                "prediction_history": True,
                "session_management": True,
                "agrovet_search": True,
                "ai_explanations": True
            }
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting API stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get API stats")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Use Heroku's PORT or default to 8000
    logger.info(f"Starting uvicorn server on port {port}...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port, 
        log_level="info",
        reload=os.getenv("ENVIRONMENT") == "development"
    )