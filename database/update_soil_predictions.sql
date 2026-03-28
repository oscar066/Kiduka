-- Migration to add missing columns to soil_predictions table
-- Run this in the internal database to sync with updated models

-- Add prediction_mode
ALTER TABLE soil_predictions ADD COLUMN IF NOT EXISTS prediction_mode VARCHAR(50);

-- Add confidence_data (JSONB)
ALTER TABLE soil_predictions ADD COLUMN IF NOT EXISTS confidence_data JSONB;

-- Add nutrients (JSONB)
ALTER TABLE soil_predictions ADD COLUMN IF NOT EXISTS nutrients JSONB;

-- Add updated_at if not present
ALTER TABLE soil_predictions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add is_flagged and admin_notes
ALTER TABLE soil_predictions ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE soil_predictions ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'soil_predictions';
