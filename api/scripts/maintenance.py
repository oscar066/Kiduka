"""
Maintenance script to patch database and create admin user.
Run inside the container: docker-compose exec api python api/scripts/maintenance.py
"""
import asyncio
import os
import sys
import logging
from sqlalchemy import text, select

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from api.db.connection import db_manager
from api.db.models.database import User, UserRole
from api.services.auth.core import AuthSecurityManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Maintenance")

async def patch_database(session):
    """Add missing columns to the database"""
    logger.info("Checking for missing columns...")
    try:
        # Check if location_name column exists in soil_predictions
        await session.execute(text(
            "ALTER TABLE soil_predictions ADD COLUMN IF NOT EXISTS location_name VARCHAR(255)"
        ))
        await session.commit()
        logger.info("Database patch applied successfully (location_name column checked/added)")
    except Exception as e:
        logger.error(f"Error patching database: {e}")
        await session.rollback()

async def create_admin_user(session, email, username, password):
    """Create or update a super admin user"""
    logger.info(f"Creating/Updating super admin user: {username} ({email})")
    try:
        # Check if user exists
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        hashed_pw = AuthSecurityManager.get_password_hash(password)
        
        if user:
            logger.info(f"User {username} already exists. Updating password and role...")
            user.hashed_password = hashed_pw
            user.role = UserRole.SUPER_ADMIN
            user.is_active = True
            user.is_verified = True
        else:
            logger.info(f"Creating new user {username}...")
            user = User(
                email=email,
                username=username,
                hashed_password=hashed_pw,
                full_name="Kiduka admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
                is_verified=True
            )
            session.add(user)
            
        await session.commit()
        logger.info(f"Admin user {username} is ready to use.")
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
        await session.rollback()

async def main():
    logger.info("Starting maintenance session...")
    
    # Get credentials from environment variables
    admin_email = os.getenv("RECOVERY_ADMIN_EMAIL")
    admin_username = os.getenv("RECOVERY_ADMIN_USERNAME", "admin")
    admin_password = os.getenv("RECOVERY_ADMIN_PASSWORD")
    
    if not admin_email or not admin_password:
        logger.error("Missing RECOVERY_ADMIN_EMAIL or RECOVERY_ADMIN_PASSWORD in environment variables.")
        logger.info("Please set these in your .env file or environment before running.")
        return

    async for session in db_manager.get_session():
        # 1. Patch DB
        await patch_database(session)
        
        # 2. Setup Admin
        await create_admin_user(
            session, 
            email=admin_email, 
            username=admin_username, 
            password=admin_password
        )
        break # Only need one session

    await db_manager.close()
    logger.info("Maintenance session completed.")

if __name__ == "__main__":
    asyncio.run(main())
