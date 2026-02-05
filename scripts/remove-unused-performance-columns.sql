-- Remove unused performance metric columns
-- Keeping only: lcp, ttfb (the two that work)
-- Removing: fcp, fid, cls

ALTER TABLE analytics_performance
  DROP COLUMN IF EXISTS fcp,
  DROP COLUMN IF EXISTS fid,
  DROP COLUMN IF EXISTS cls;
