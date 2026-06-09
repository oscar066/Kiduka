-- =============================================================================
-- Migration: CDC (Community Development Coordinator) support
-- =============================================================================
-- This migration adds the CDC role, phone-number contact field, CDC attribution
-- columns on soil_predictions, and the cdc_notifications tracking table.
--
-- Run order: execute AFTER the base init.sql and migrate_to_rbac.sql scripts.
--
-- Safe to run multiple times — all changes use IF NOT EXISTS / DO $$ guards.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend the user_role ENUM with the new 'cdc' value
-- -----------------------------------------------------------------------------
-- PostgreSQL does not allow ALTER TYPE inside a transaction block that also
-- uses the type; run this in its own session or via psql directly.
-- The DO block guards against duplicate-value errors if the migration is
-- re-run on a database that already has the value.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'cdc'
          AND enumtypid = (
              SELECT oid FROM pg_type WHERE typname = 'user_role'
          )
    ) THEN
        -- Add 'cdc' between 'user' and 'admin' for logical ordering
        ALTER TYPE user_role ADD VALUE 'cdc' AFTER 'user';
        RAISE NOTICE 'user_role enum extended with cdc value';
    ELSE
        RAISE NOTICE 'user_role enum already contains cdc — skipping';
    END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- 2. Add phone_number column to users
-- -----------------------------------------------------------------------------
-- Used for SMS notification delivery via Africa's Talking.
-- International format recommended (e.g. +254712345678).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NULL;

COMMENT ON COLUMN users.phone_number
    IS 'Contact phone number in international format — used for CDC SMS notifications.';


-- -----------------------------------------------------------------------------
-- 3. Add CDC attribution columns to soil_predictions
-- -----------------------------------------------------------------------------
-- performed_by_cdc_id: NULL when the farmer ran the analysis themselves;
--   populated with the CDC user's UUID when a CDC officer submitted it.
-- cdc_notes: optional field observations entered by the CDC during the visit.

ALTER TABLE soil_predictions
    ADD COLUMN IF NOT EXISTS performed_by_cdc_id UUID
        REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE soil_predictions
    ADD COLUMN IF NOT EXISTS cdc_notes TEXT NULL;

-- Index to support efficient CDC dashboard queries (all predictions by a CDC)
CREATE INDEX IF NOT EXISTS idx_soil_predictions_cdc_id
    ON soil_predictions (performed_by_cdc_id)
    WHERE performed_by_cdc_id IS NOT NULL;

COMMENT ON COLUMN soil_predictions.performed_by_cdc_id
    IS 'FK to the CDC user who ran this analysis on behalf of the farmer. NULL = self-service.';

COMMENT ON COLUMN soil_predictions.cdc_notes
    IS 'Optional field observations recorded by the CDC during the on-site visit.';


-- -----------------------------------------------------------------------------
-- 4. Create notification_method ENUM
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'notification_method'
    ) THEN
        CREATE TYPE notification_method AS ENUM ('email', 'sms', 'both');
        RAISE NOTICE 'notification_method enum created';
    ELSE
        RAISE NOTICE 'notification_method enum already exists — skipping';
    END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- 5. Create notification_status ENUM
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'notification_status'
    ) THEN
        CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'partial');
        RAISE NOTICE 'notification_status enum created';
    ELSE
        RAISE NOTICE 'notification_status enum already exists — skipping';
    END IF;
END
$$;


-- -----------------------------------------------------------------------------
-- 6. Create cdc_notifications table
-- -----------------------------------------------------------------------------
-- Tracks every notification dispatch attempt by a CDC officer to a farmer.
-- Provides the source of truth for delivery status shown on both the CDC
-- dashboard and the farmer's dashboard.

CREATE TABLE IF NOT EXISTS cdc_notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    prediction_id     UUID NOT NULL REFERENCES soil_predictions(id) ON DELETE CASCADE,
    sent_by_cdc_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    farmer_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Delivery configuration
    method            notification_method NOT NULL,

    -- Overall delivery status
    status            notification_status NOT NULL DEFAULT 'pending',

    -- Per-channel granular results ('sent' | 'failed' | 'skipped' | 'pending')
    email_status      VARCHAR(20) DEFAULT 'skipped',
    sms_status        VARCHAR(20) DEFAULT 'skipped',

    -- Error context when status = 'failed' or 'partial'
    error_message     TEXT,

    -- Timestamps
    sent_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cdc_notifications
    IS 'Records every CDC-to-farmer result notification attempt with per-channel delivery status.';

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_cdc_notifications_cdc_id
    ON cdc_notifications (sent_by_cdc_id);

CREATE INDEX IF NOT EXISTS idx_cdc_notifications_farmer_id
    ON cdc_notifications (farmer_id);

CREATE INDEX IF NOT EXISTS idx_cdc_notifications_prediction_id
    ON cdc_notifications (prediction_id);

CREATE INDEX IF NOT EXISTS idx_cdc_notifications_created_at
    ON cdc_notifications (created_at DESC);


-- -----------------------------------------------------------------------------
-- 7. Extend the admin_dashboard_stats view to include CDC counts
-- -----------------------------------------------------------------------------
-- We DROP and recreate because PostgreSQL's CREATE OR REPLACE VIEW
-- cannot change an existing view's column structure.

DROP VIEW IF EXISTS admin_dashboard_stats;
CREATE VIEW admin_dashboard_stats AS
SELECT
    -- User counts
    COUNT(DISTINCT u.id)
        FILTER (WHERE u.role = 'user')                      AS total_farmers,
    COUNT(DISTINCT u.id)
        FILTER (WHERE u.role = 'cdc')                       AS total_cdc_users,
    COUNT(DISTINCT u.id)
        FILTER (WHERE u.role IN ('admin', 'super_admin'))   AS total_admins,
    COUNT(DISTINCT u.id)
        FILTER (WHERE u.is_active)                          AS total_active_users,

    -- Prediction counts
    COUNT(DISTINCT p.id)                                    AS total_predictions,
    COUNT(DISTINCT p.id)
        FILTER (WHERE p.performed_by_cdc_id IS NOT NULL)    AS total_cdc_analyses,
    COUNT(DISTINCT p.id)
        FILTER (WHERE p.is_flagged)                         AS flagged_predictions,

    -- Notification counts
    COUNT(DISTINCT n.id)                                    AS total_notifications,
    COUNT(DISTINCT n.id)
        FILTER (WHERE n.status IN ('sent', 'partial'))      AS successful_notifications

FROM users u
LEFT JOIN soil_predictions p ON p.user_id = u.id
LEFT JOIN cdc_notifications n ON n.farmer_id = u.id;

COMMENT ON VIEW admin_dashboard_stats
    IS 'Aggregated platform statistics including CDC-specific counts for the admin overview.';


-- -----------------------------------------------------------------------------
-- 8. Verification
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_cdc_enum_ok     BOOLEAN;
    v_phone_col_ok    BOOLEAN;
    v_cdc_id_col_ok   BOOLEAN;
    v_notif_table_ok  BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'cdc'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) INTO v_cdc_enum_ok;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) INTO v_phone_col_ok;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'soil_predictions'
          AND column_name = 'performed_by_cdc_id'
    ) INTO v_cdc_id_col_ok;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'cdc_notifications'
    ) INTO v_notif_table_ok;

    RAISE NOTICE '===== CDC Migration Verification =====';
    RAISE NOTICE 'user_role.cdc enum value:        %', v_cdc_enum_ok;
    RAISE NOTICE 'users.phone_number column:       %', v_phone_col_ok;
    RAISE NOTICE 'soil_predictions.performed_by_cdc_id: %', v_cdc_id_col_ok;
    RAISE NOTICE 'cdc_notifications table:         %', v_notif_table_ok;
    RAISE NOTICE '=======================================';
END
$$;
