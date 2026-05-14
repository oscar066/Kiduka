"""
Database connection and session management
"""
import os
import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from api.db.models.database import Base

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manages the global async PostgreSQL database connection pool and sessions.
    
    This class handles the creation of the SQLAlchemy async engine, configures 
    connection pooling parameters, and provides a session factory for dependency injection.
    """
    
    def __init__(self):
        """
        Initialize the DatabaseManager by reading the DATABASE_URL environment variable
        and configuring the async engine.
        
        Raises:
            ValueError: If the DATABASE_URL environment variable is not set.
        """
        self.database_url = os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        # Convert sync URL to async URL for asyncpg
        if self.database_url.startswith("postgresql://"):
            self.async_database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        else:
            self.async_database_url = self.database_url
            
        logger.info(f"Database URL configured: {self.async_database_url.split('@')[0]}@***")
        
        # Create async engine
        self.async_engine = create_async_engine(
            self.async_database_url,
            echo=os.getenv("ENVIRONMENT") == "production",
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600
        )
        
        # Create async session factory
        self.async_session_factory = async_sessionmaker(
            self.async_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
    async def create_tables(self):
        """
        Create all defined database tables asynchronously if they do not exist.
        
        This method uses the metadata from the SQLAlchemy Base class to issue
        DDL commands to the database.
        
        Raises:
            Exception: If table creation fails (e.g., due to connection issues).
        """
        try:
            async with self.async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Error creating database tables: {e}")
            raise
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Provide a transactional, asynchronous database session context.
        
        Yields:
            AsyncSession: An active SQLAlchemy async session.
            
        Raises:
            Exception: If an error occurs during the transaction, the session 
                is automatically rolled back and the exception is re-raised.
        """
        async with self.async_session_factory() as session:
            try:
                yield session
            except Exception as e:
                await session.rollback()
                logger.error(f"Database session error: {e}")
                raise
            finally:
                await session.close()
    
    async def close(self):
        """
        Gracefully dispose of the database engine and close all connection pools.
        
        Should be called during application shutdown to prevent connection leaks.
        """
        await self.async_engine.dispose()
        logger.info("Database connections closed")

# Global database manager instance
db_manager = DatabaseManager()

# Dependency for FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an asynchronous database session per request.
    
    Yields:
        AsyncSession: An active SQLAlchemy async session tied to the current request.
    """
    async for session in db_manager.get_session():
        yield session