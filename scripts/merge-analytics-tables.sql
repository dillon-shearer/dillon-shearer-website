-- Create unified analytics table combining page views and performance
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL GENERATED ALWAYS AS ((timestamp AT TIME ZONE 'UTC')::date) STORED,

  -- Page view data
  path TEXT NOT NULL,
  referrer TEXT,
  session_hash TEXT NOT NULL,

  -- Parsed user agent (no raw UA stored for privacy)
  browser TEXT,
  os TEXT,
  device_type TEXT,
  is_bot BOOLEAN DEFAULT FALSE,

  -- Core Web Vitals (milliseconds except CLS)
  lcp NUMERIC(10, 2),
  fid NUMERIC(10, 2),
  cls NUMERIC(10, 4),
  ttfb NUMERIC(10, 2),
  fcp NUMERIC(10, 2),

  -- Navigation timing
  dom_load_time NUMERIC(10, 2),
  window_load_time NUMERIC(10, 2),
  connection_type TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_date_path ON analytics (date DESC, path);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics (session_hash, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_referrer ON analytics (referrer) WHERE referrer IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_bot ON analytics (is_bot, date DESC) WHERE is_bot = false;

-- Migrate data from analytics_page_views (keep all page view data)
INSERT INTO analytics (
  timestamp, path, referrer, session_hash, browser, os, device_type, is_bot, created_at
)
SELECT
  timestamp, path, referrer, session_hash, browser, os, device_type, is_bot, created_at
FROM analytics_page_views
ON CONFLICT (id) DO NOTHING;

-- Migrate performance data - merge with existing page views where possible
-- For performance records that match a page view (same path, close timestamp), update the row
-- Otherwise insert as new rows
INSERT INTO analytics (
  timestamp, path, session_hash, browser, os, device_type, is_bot,
  lcp, fid, cls, ttfb, fcp, dom_load_time, window_load_time, connection_type,
  created_at
)
SELECT
  p.timestamp,
  p.path,
  COALESCE(pv.session_hash, 'unknown'),
  COALESCE(pv.browser, 'Unknown'),
  COALESCE(pv.os, 'Unknown'),
  COALESCE(pv.device_type, 'desktop'),
  COALESCE(pv.is_bot, false),
  p.lcp,
  p.fid,
  p.cls,
  p.ttfb,
  p.fcp,
  p.dom_load_time,
  p.window_load_time,
  p.connection_type,
  p.created_at
FROM analytics_performance p
LEFT JOIN analytics_page_views pv
  ON p.path = pv.path
  AND ABS(EXTRACT(EPOCH FROM (p.timestamp - pv.timestamp))) < 5
ON CONFLICT (id) DO NOTHING;

-- Drop old tables
DROP TABLE IF EXISTS analytics_page_views CASCADE;
DROP TABLE IF EXISTS analytics_performance CASCADE;

-- Verify migration
SELECT
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE lcp IS NOT NULL OR fid IS NOT NULL) as with_performance,
  COUNT(*) FILTER (WHERE session_hash IS NOT NULL) as with_session,
  COUNT(DISTINCT path) as unique_paths,
  COUNT(DISTINCT session_hash) as unique_sessions
FROM analytics;
