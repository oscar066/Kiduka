import os
import sys
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables at the very beginning
load_dotenv()

# FastAPI imports
import logging
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

# Local imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import modularized components
from api.utils.config import AppConfig
from api.utils.initialization import initialize_app_components
from api.utils.logging_config import setup_logger
from api.utils.dependencies import dependency_manager
from api.utils.session import SessionManager

# Import database components
from api.db.connection import db_manager, get_db

# Import routes
from api.routers.auth import router as auth_router
from api.routers.prediction import router as prediction_router
from api.routers.admin import router as admin_router
from api.routers.cdc import router as cdc_router 
from api.routers.optimization import router as optimization_router
from chatbot.app import router as chat_router

# Import auth utilities for role checking
from api.utils.auth import get_current_user_optional, get_current_admin_user
from api.db.models.database import User

# Load environment variables
load_dotenv()

# Setup logging
logger = setup_logger("API", level=logging.INFO, console_level=logging.INFO)

# Global components dictionary
app_components = {}

session_manager = SessionManager()

# Initialize app configuration
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handle the FastAPI application lifespan events (startup and shutdown).
    
    During startup:
        - Initializes the ML models and preprocessing components.
        - Wires the dependency manager with loaded components and session manager.
        - Triggers the creation of all database tables via SQLAlchemy.
        
    During shutdown:
        - Gracefully closes all database connection pools to prevent leaks.
        
    Args:
        app (FastAPI): The running FastAPI instance.
    """
    # Startup
    logger.info("Initializing application with role-based authentication...")
    
    # Initialize app components (models, preprocessors, etc.)
    global app_components
    app_components = initialize_app_components()
    
    # Set dependencies in dependency manager
    dependency_manager.set_components(app_components)
    dependency_manager.set_session_manager(session_manager)
    
    # Create database tables
    try:
        await db_manager.create_tables()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

    logger.info("Application initialization completed with admin features enabled")
    
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
    description="Soil fertility prediction and fertilizer recommendation system with AI explanations, user management, and admin features",
    version="2.1.0",
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
app.include_router(prediction_router)
app.include_router(admin_router)          # Admin management panel
app.include_router(cdc_router)            # CDC officer dashboard and tools
app.include_router(chat_router)
app.include_router(optimization_router)

# Make components and session manager available globally for routers
def get_app_components():
    return app_components

def get_session_manager():
    return session_manager


@app.get("/")
async def root(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Root endpoint serving basic API metadata and feature availability.
    
    If accessed with a valid Bearer token, it will also reflect the user's
    role and dynamically append administrative endpoints if applicable.
    
    Args:
        current_user (Optional[User]): The authenticated user, if a token was provided.
        
    Returns:
        dict: A payload describing the API version, available features, and endpoints.
    """
    logger.info("Root endpoint accessed")
    
    # Base response
    response = {
        "message": "Agricultural Prediction API",
        "version": "2.1.1",
        "status": "running",
        "features": {
            "user_authentication": True,
            "role_based_access": True,
            "prediction_history": True,
            "agrovet_recommendations": True,
            "ai_explanations": True,
            "admin_panel": True
        },
        "components_loaded": {
            "agrovet_locator": app_components.get('agrovet_locator') is not None,
            "soil_classifier": True # Always available as class
        },
        "endpoints": {
            "predict": "/predict - POST soil data for predictions",
            "auth": "/auth - Authentication endpoints",
            "predictions": "/predictions - Prediction history management",
            "health": "/health - Health check",
            "docs": "/docs - API documentation"
        }
    }
    
    # Add user-specific information if authenticated
    if current_user:
        response["user"] = {
            "id": str(current_user.id),
            "username": current_user.username,
            "role": current_user.role.value,
            "is_admin": current_user.is_admin()
        }
        
        # Add admin endpoints if user is an admin
        if current_user.is_admin():
            response["endpoints"]["admin"] = "/admin - Admin management endpoints"
            response["admin_features"] = {
                "user_management": True,
                "prediction_management": True,
                "audit_logs": True,
                "dashboard": True,
                "agrovet_management": True,
            }

        # Add CDC endpoints if user is a CDC officer (or super admin)
        if current_user.is_cdc() or current_user.is_super_admin():
            response["endpoints"]["cdc"] = "/cdc - CDC officer dashboard and tools"
            response["cdc_features"] = {
                "farmer_search": True,
                "run_analysis_for_farmer": True,
                "send_results_email": True,
                "send_results_sms": True,
                "notification_history": True,
                "cdc_dashboard": True,
            }
    
    return response

@app.get("/health")
async def health_check():
    """
    System health check endpoint for monitoring and orchestrators (e.g., Kubernetes).
    
    Actively checks the database connection pool and verifies that crucial ML 
    components (like the agrovet locator) are loaded in memory.
    
    Returns:
        dict: A diagnostic payload indicating 'healthy' or 'degraded' status.
    """
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
            app_components.get('agrovet_locator'),
            db_healthy
        ]) else "degraded",
        "timestamp": datetime.now().isoformat(),
        "database": "healthy" if db_healthy else "degraded",
        "components_available": {
            "agrovet_locator": app_components.get('agrovet_locator') is not None
        },
        "llm_available": app_components.get('llm') is not None,
        "active_sessions": session_manager.get_session_count(),
        "features": {
            "role_based_auth": True,
            "admin_panel": True,
            "audit_logging": True
        }
    }
    
    logger.debug(f"Health status: {health_status}")
    return health_status

@app.get("/session")
async def get_session_info(request: Request):
    """
    Retrieve current guest session information.
    
    Designed primarily for non-authenticated users to check their transient
    session state (e.g., how many predictions they have made anonymously).
    
    Args:
        request (Request): The incoming FastAPI request containing session cookies.
        
    Returns:
        dict: Transient session data including creation time and prediction counts.
    """
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
async def get_api_stats(
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Fetch public-facing platform statistics.
    
    Returns high-level metadata such as active session counts and feature flags.
    Provides additional contextual details if the request is authenticated.
    
    Args:
        current_user (Optional[User]): The authenticated user, if available.
        
    Returns:
        dict: Public and optionally user-specific API statistics.
    """
    logger.info("API stats endpoint accessed")
    
    try:
        # Basic stats available to everyone
        stats = {
            "total_active_sessions": session_manager.get_session_count(),
            "api_version": "2.1.0",
            "uptime": "Available via health endpoint",
            "features": {
                "authentication": True,
                "role_based_access": True,
                "prediction_history": True,
                "session_management": True,
                "agrovet_search": True,
                "ai_explanations": True,
                "admin_panel": True
            }
        }
        
        # Add user-specific stats if authenticated
        if current_user:
            stats["user_info"] = {
                "role": current_user.role.value,
                "is_admin": current_user.is_admin(),
                "username": current_user.username
            }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting API stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get API stats")

@app.get("/admin-check")
async def admin_check(
    current_admin: User = Depends(get_current_admin_user)
):
    """
    Lightweight validation endpoint to confirm administrative privileges.
    
    Useful for frontend applications to verify role-based routing access 
    without needing to fetch bulk data.
    
    Args:
        current_admin (User): The user, guaranteed to be an admin by the dependency.
        
    Returns:
        dict: Confirmation message and basic user metadata.
    """
    return {
        "message": "Admin access confirmed",
        "user": {
            "id": str(current_admin.id),
            "username": current_admin.username,
            "role": current_admin.role.value,
            "is_super_admin": current_admin.is_super_admin()
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting uvicorn server on port {port} with role-based authentication...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port, 
        log_level="info",
        reload=os.getenv("ENVIRONMENT") == "development"
    )