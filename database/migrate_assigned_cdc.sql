-- =============================================================================
-- Migration: Add assigned_cdc_id to users
-- =============================================================================
-- Adds the CDC officer assignment column so farmers can be linked to a specific
-- CDC user. NULL means the farmer has no assigned CDC officer.
--
-- Safe to run multiple times — uses IF NOT EXISTS / DO $$ guards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add assigned_cdc_id column to users
-- -----------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS assigned_cdc_id UUID
        REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_users_assigned_cdc_id
    ON users (assigned_cdc_id)
    WHERE assigned_cdc_id IS NOT NULL;

COMMENT ON COLUMN users.assigned_cdc_id
    IS 'FK to the CDC officer responsible for this farmer. NULL = no assigned CDC.';

-- -----------------------------------------------------------------------------
-- 2. Verification
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_col_ok   BOOLEAN;
    v_idx_ok   BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'assigned_cdc_id'
    ) INTO v_col_ok;

    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'users' AND indexname = 'ix_users_assigned_cdc_id'
    ) INTO v_idx_ok;

    RAISE NOTICE '===== assigned_cdc Migration Verification =====';
    RAISE NOTICE 'users.assigned_cdc_id column: %', v_col_ok;
    RAISE NOTICE 'ix_users_assigned_cdc_id index: %', v_idx_ok;
    RAISE NOTICE '================================================';
END
$$;
