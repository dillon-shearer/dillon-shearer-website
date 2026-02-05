-- Migration: Add date column to analytics tables
-- This script is safe to run multiple times (uses IF NOT EXISTS)

-- Add date column to analytics_page_views
ALTER TABLE analytics_page_views
ADD COLUMN IF NOT EXISTS date DATE GENERATED ALWAYS AS ((timestamp AT TIME ZONE 'UTC')::date) STORED;

-- Update index (drop old one first if it exists)
DROP INDEX IF EXISTS idx_page_views_timestamp_path;
CREATE INDEX IF NOT EXISTS idx_page_views_date_path ON analytics_page_views (date DESC, path);

-- Add date column to analytics_performance
ALTER TABLE analytics_performance
ADD COLUMN IF NOT EXISTS date DATE GENERATED ALWAYS AS ((timestamp AT TIME ZONE 'UTC')::date) STORED;

-- Update index (drop old one first if it exists)
DROP INDEX IF EXISTS idx_performance_timestamp_path;
CREATE INDEX IF NOT EXISTS idx_performance_date_path ON analytics_performance (date DESC, path);
