-- Database initialization script
-- This will run when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (handled by docker-compose)
-- CREATE DATABASE IF NOT EXISTS agricultural_api;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Soil predictions table
CREATE TABLE IF NOT EXISTS soil_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    
    -- Input soil data
    simplified_texture VARCHAR(50),
    soil_ph DECIMAL(4,2),
    nitrogen DECIMAL(10,2),
    phosphorus DECIMAL(10,2),
    potassium DECIMAL(10,2),
    organic_matter DECIMAL(5,2),
    calcium DECIMAL(10,2),
    magnesium DECIMAL(10,2),
    copper DECIMAL(10,2),
    iron DECIMAL(10,2),
    zinc DECIMAL(10,2),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    location_name VARCHAR(255),
    
    -- Prediction results
    fertility_prediction VARCHAR(50),
    fertility_confidence DECIMAL(5,4),
    fertilizer_recommendation VARCHAR(100),
    fertilizer_confidence DECIMAL(5,4),
    
    -- AI-generated content
    structured_response JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agrovets table
CREATE TABLE IF NOT EXISTS agrovets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    products TEXT[] NOT NULL DEFAULT '{}',
    prices DECIMAL(10,2)[] NOT NULL DEFAULT '{}',
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    rating DECIMAL(2,1),
    services TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prediction agrovets junction table (many-to-many)
CREATE TABLE IF NOT EXISTS prediction_agrovets (
    prediction_id UUID REFERENCES soil_predictions(id) ON DELETE CASCADE,
    agrovet_id UUID REFERENCES agrovets(id) ON DELETE CASCADE,
    distance_km DECIMAL(6,2),
    PRIMARY KEY (prediction_id, agrovet_id)
);

-- User sessions table for tracking sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_soil_predictions_user_id ON soil_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_soil_predictions_created_at ON soil_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_agrovets_location ON agrovets(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soil_predictions_updated_at BEFORE UPDATE ON soil_predictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agrovets_updated_at BEFORE UPDATE ON agrovets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample agrovets (optional)
INSERT INTO agrovets (name, address, phone, latitude, longitude, rating, services) VALUES
('Green Valley Agrovet', '123 Farm Road, Nairobi', '+254-700-123456', -1.2921, 36.8219, 4.5, ARRAY['fertilizers', 'seeds', 'pesticides']),
('Farmer''s Choice Supplies', '456 Agricultural Ave, Nakuru', '+254-700-789012', -0.3031, 36.0800, 4.2, ARRAY['fertilizers', 'equipment', 'consultation']),
('Crop Care Center', '789 Harvest Street, Eldoret', '+254-700-345678', 0.5143, 35.2698, 4.7, ARRAY['fertilizers', 'seeds', 'soil_testing']);

-- Default admin user 
INSERT INTO users (email, username, hashed_password, full_name, is_active, is_verified) VALUES
('admin@agricultural-api.com', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeXltcRIwf.g.3PmK', 'System Administrator', TRUE, TRUE);

COMMIT;