-- Clear all analytics data to restart collection with updated tracking logic
-- Run with: npm run sql -- --yes --file scripts/clear-analytics-data.sql

-- Clear page views
TRUNCATE TABLE analytics_page_views;

-- Clear performance metrics
TRUNCATE TABLE analytics_performance;

-- Verify tables are empty
SELECT 'analytics_page_views' as table_name, COUNT(*) as row_count FROM analytics_page_views
UNION ALL
SELECT 'analytics_performance' as table_name, COUNT(*) as row_count FROM analytics_performance;
