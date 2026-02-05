-- Page Views Table
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL GENERATED ALWAYS AS ((timestamp AT TIME ZONE 'UTC')::date) STORED,

  path TEXT NOT NULL,
  referrer TEXT,
  session_hash TEXT NOT NULL,

  -- Parsed user agent (no raw UA stored for privacy)
  browser TEXT,
  os TEXT,
  device_type TEXT,
  is_bot BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_date_path ON analytics_page_views (date DESC, path);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON analytics_page_views (session_hash, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_referrer ON analytics_page_views (referrer) WHERE referrer IS NOT NULL;

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS analytics_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL GENERATED ALWAYS AS ((timestamp AT TIME ZONE 'UTC')::date) STORED,

  path TEXT NOT NULL,

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

CREATE INDEX IF NOT EXISTS idx_performance_date_path ON analytics_performance (date DESC, path);
