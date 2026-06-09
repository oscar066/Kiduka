-- Migration script to add role-based authentication to existing database
-- Run this AFTER your existing init.sql has created the base tables

BEGIN;

-- Step 1: Create the user role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'user_role type already exists, skipping';
END $$;

-- Step 2: Add new columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user',
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Step 3: Update soil_predictions table for simplified schema and RBAC
ALTER TABLE soil_predictions 
-- Metadata/RBAC columns
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
-- Legacy cleanup
DROP COLUMN IF EXISTS simplified_texture,
DROP COLUMN IF EXISTS copper,
DROP COLUMN IF EXISTS iron,
DROP COLUMN IF EXISTS zinc,
DROP COLUMN IF EXISTS fertility_prediction,
DROP COLUMN IF EXISTS fertility_confidence,
DROP COLUMN IF EXISTS fertilizer_recommendation,
DROP COLUMN IF EXISTS fertilizer_confidence,
DROP COLUMN IF EXISTS crop_recommendation1,
DROP COLUMN IF EXISTS crop_recommendation1_confidence,
DROP COLUMN IF EXISTS crop_recommendation2,
DROP COLUMN IF EXISTS crop_recommendation2_confidence,
DROP COLUMN IF EXISTS structured_response;

-- Handle renaming organic_matter to organic_carbon
DO $$ BEGIN
    ALTER TABLE soil_predictions RENAME COLUMN organic_matter TO organic_carbon;
EXCEPTION
    WHEN undefined_column THEN 
        RAISE NOTICE 'organic_matter column does not exist, skipping rename';
    WHEN duplicate_column THEN
        RAISE NOTICE 'organic_carbon column already exists, skipping rename';
END $$;

-- Add new analysis columns
ALTER TABLE soil_predictions
ADD COLUMN IF NOT EXISTS soil_health_index DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS initial_soil_fertility_status VARCHAR(100),
ADD COLUMN IF NOT EXISTS soil_fertility_status VARCHAR(100),
ADD COLUMN IF NOT EXISTS mentions JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS recommendations JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS prediction_mode VARCHAR(50),
ADD COLUMN IF NOT EXISTS confidence_data JSONB,
ADD COLUMN IF NOT EXISTS nutrients JSONB;

-- Step 4: Add new columns to existing agrovets table
ALTER TABLE agrovets 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Step 5: Create admin audit logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_prediction_id UUID REFERENCES soil_predictions(id) ON DELETE SET NULL,
    target_agrovet_id UUID REFERENCES agrovets(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Add new columns to existing user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Step 7: Create new indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_soil_predictions_flagged ON soil_predictions(is_flagged);
CREATE INDEX IF NOT EXISTS idx_agrovets_verified ON agrovets(is_verified);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON admin_audit_logs(target_user_id);

-- Step 8: Update existing data
-- Set default role for existing users
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Update existing admin user to have super_admin role
UPDATE users
SET role = 'super_admin',
    is_verified = TRUE,
    notes = 'Migrated system administrator account'
WHERE email = 'kiduka@gmail.com';

-- Step 9: Insert default super admin if it doesn't exist
INSERT INTO users (email, username, hashed_password, full_name, role, is_active, is_verified, notes)
SELECT
    'kiduka@gmail.com',
    'kiduka',
    '$2b$12$kHpy84M8RgJ/XRImjGsvyexY7CZHrIvdaIxdaSWb.LDv3r8/UDZ5G',
    'Kiduka Admin',
    'super_admin',
    TRUE,
    TRUE,
    'Default super administrator account'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'kiduka@gmail.com'
);

-- Step 10: Create trigger function for automatic audit logging
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log when user role is changed
    IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
        INSERT INTO admin_audit_logs (
            admin_user_id, 
            target_user_id, 
            action, 
            details
        ) VALUES (
            COALESCE(
                NULLIF(current_setting('app.current_user_id', true), '')::UUID, 
                NEW.id
            ),
            NEW.id,
            'role_changed',
            jsonb_build_object(
                'old_role', OLD.role::text,
                'new_role', NEW.role::text,
                'automatic_log', true
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger for user role changes
DROP TRIGGER IF EXISTS user_role_change_log ON users;
CREATE TRIGGER user_role_change_log
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION log_user_changes();

-- Step 12: Create utility functions
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create useful views for admin dashboard
CREATE OR REPLACE VIEW user_summary AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.is_active,
    u.is_verified,
    u.created_at,
    u.last_login,
    COUNT(sp.id) as prediction_count,
    COUNT(CASE WHEN sp.is_flagged THEN 1 END) as flagged_prediction_count,
    creator.username as created_by_username
FROM users u
LEFT JOIN soil_predictions sp ON u.id = sp.user_id
LEFT JOIN users creator ON u.created_by = creator.id
GROUP BY u.id, u.username, u.email, u.full_name, u.role, u.is_active, 
         u.is_verified, u.created_at, u.last_login, creator.username;

CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
    (SELECT COUNT(*) FROM users WHERE is_verified = true) as verified_users,
    (SELECT COUNT(*) FROM users WHERE role = 'admin' OR role = 'super_admin') as admin_users,
    (SELECT COUNT(*) FROM soil_predictions) as total_predictions,
    (SELECT COUNT(*) FROM soil_predictions WHERE is_flagged = true) as flagged_predictions,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as recent_users,
    (SELECT COUNT(*) FROM soil_predictions WHERE created_at >= NOW() - INTERVAL '7 days') as recent_predictions,
    (SELECT COUNT(*) FROM agrovets) as total_agrovets,
    (SELECT COUNT(*) FROM agrovets WHERE is_verified = true) as verified_agrovets;

-- Step 14: Add helpful comments
COMMENT ON TABLE admin_audit_logs IS 'Audit trail for administrative actions';
COMMENT ON COLUMN users.role IS 'User role: user, admin, or super_admin';
COMMENT ON COLUMN users.created_by IS 'ID of the admin user who created this account';
COMMENT ON COLUMN users.notes IS 'Administrative notes about the user';
COMMENT ON COLUMN soil_predictions.is_flagged IS 'Whether this prediction has been flagged by an admin';
COMMENT ON COLUMN soil_predictions.admin_notes IS 'Administrative notes about this prediction';

COMMIT;

-- Migration completed successfully
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'Role-based authentication has been added to your existing database';
    RAISE NOTICE 'Existing users have been assigned the "user" role';
    RAISE NOTICE 'IMPORTANT: Change the default super admin password immediately!';
    RAISE NOTICE '=============================================';
END $$;