-- =============================================================================
-- Migration: Self-service password reset
-- =============================================================================
-- Adds password_reset_token and password_reset_expires columns to the users
-- table so the forgot-password flow can store one-time reset tokens.
--
-- Run order: execute AFTER migrate_cdc.sql (04).
--
-- Safe to run multiple times — all changes use IF NOT EXISTS / DO $$ guards.
-- =============================================================================

-- Add the reset-token column (stores a cryptographically secure random token)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);

-- Add the expiry column (UTC timestamp; token is invalid after this time)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Sparse index so lookups by token are fast without bloating normal queries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'users'
          AND indexname  = 'ix_users_password_reset_token'
    ) THEN
        CREATE INDEX ix_users_password_reset_token
            ON users (password_reset_token)
            WHERE password_reset_token IS NOT NULL;
    END IF;
END $$;
