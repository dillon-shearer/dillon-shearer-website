# Website Analytics Implementation Plan

## Overview

Implement a self-hosted, privacy-focused analytics system with:
- **Backend**: Postgres tables for page views and performance metrics
- **Tracking**: Hybrid approach (middleware for page views + client-side for Core Web Vitals)
- **Dashboard**: Dedicated `/analytics` route with time-series charts, bar charts, and performance gauges
- **Widget**: Homepage widget showing today's page views with % change and most popular page
- **Privacy**: Anonymous daily sessions (hash of IP + UA + date), 90-day auto-expiry, public aggregates only
- **Coexistence**: Keep Vercel Analytics running alongside custom analytics for redundancy

## Database Schema

### Create Migration Script: `scripts/create-analytics-tables.sql`

```sql
-- Page Views Table
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date DATE NOT NULL GENERATED ALWAYS AS (timestamp::date) STORED,

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
  date DATE NOT NULL GENERATED ALWAYS AS (timestamp::date) STORED,

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
```

**Key Design Decisions**:
- Generated `date` column for efficient date-range queries
- `session_hash` instead of IP/cookies for privacy-first anonymous tracking
- Separate tables for cleaner separation and targeted indexes
- Composite indexes optimized for common query patterns (date DESC + path filtering)

## Implementation Steps (In Order)

### Phase 1: Database & Utilities Setup

**1.1 Create Database Tables**
- File: `scripts/create-analytics-tables.sql` (see schema above)
- Run: `npm run sql -- scripts/create-analytics-tables.sql`

**1.2 Install Dependencies**
```bash
npm install ua-parser-js web-vitals
npm install --save-dev @types/ua-parser-js
```

**1.3 Create Utility Libraries**

**File**: `lib/analytics/session.ts`
```typescript
import { createHash } from 'crypto'

export function generateSessionHash(ip: string, userAgent: string): string {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const rawString = `${ip}|${userAgent}|${today}`
  return createHash('sha256').update(rawString).digest('hex').substring(0, 32)
}
```

**File**: `lib/analytics/user-agent.ts`
```typescript
import UAParser from 'ua-parser-js'

export function parseUserAgent(uaString: string) {
  const parser = new UAParser(uaString)
  const result = parser.getResult()
  return {
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
    deviceType: result.device.type || 'desktop',
  }
}

export function isBot(uaString: string): boolean {
  return /bot|crawler|spider|crawling|headless/i.test(uaString)
}
```

### Phase 2: Server-Side Tracking (Middleware)

**2.1 Update Middleware**

**File**: `middleware.ts`

**Changes**:
1. Expand matcher from `['/demos/:path*']` to `['/((?!_next/static|_next/image|favicon.ico|api/).*)']` (track all non-static routes)
2. Add production environment check: `if (process.env.NODE_ENV !== 'production') return NextResponse.next()`
3. Add bot detection and skip tracking for bots
4. Fire-and-forget tracking call to `/api/analytics/track` (non-blocking)
5. Extract client IP from `x-forwarded-for` or `x-real-ip` headers

**Pattern to Follow**: Non-blocking fetch similar to route-warmup pattern

**2.2 Create Tracking API Endpoint**

**File**: `app/api/analytics/track/route.ts`

**Implementation**:
- POST endpoint accepting `{ path, referrer, userAgent, ip }`
- Validate required fields
- Call `parseUserAgent()` and `isBot()` from utilities
- Generate `session_hash` via `generateSessionHash()`
- Insert into `analytics_page_views` table using `sql` tagged template
- Return `{ success: true }` immediately (no delays)

**Error Handling**: Catch all errors, log to console, return 500 (analytics should never break the site)

**Reference Pattern**: `app/api/gym-data/route.ts` for rate limiting structure (optional), `lib/data-access-portal.ts` for UUID generation

### Phase 3: Client-Side Performance Tracking

**3.1 Create Analytics Tracker Component**

**File**: `app/components/analytics-tracker.tsx`

**Implementation**:
- Client component (`'use client'`)
- Use `usePathname()` to trigger on route changes
- Production-only: `if (process.env.NODE_ENV !== 'production') return null`
- Wait for page load completion
- Collect Navigation Timing API metrics (domLoadTime, windowLoadTime, ttfb)
- Dynamically import `web-vitals` and track LCP, FID, CLS, FCP
- Send to `/api/analytics/performance` via `navigator.sendBeacon()` (reliable even during navigation)

**Reference Pattern**: `app/components/route-warmup.tsx` for production-only rendering

**3.2 Add Tracker to Root Layout**

**File**: `app/layout.tsx`

**Changes**:
- Import `AnalyticsTracker` from `@/app/components/analytics-tracker`
- Add `<AnalyticsTracker />` after existing `<Analytics />` and `<SpeedInsights />` components (around line 117)
- Keep Vercel Analytics running (no removals)

**3.3 Create Performance API Endpoint**

**File**: `app/api/analytics/performance/route.ts`

**Implementation**:
- POST endpoint accepting `{ path, lcp, fid, cls, ttfb, fcp, domLoadTime, windowLoadTime, connectionType }`
- Validate `path` is present
- Insert into `analytics_performance` table with nullable metrics
- Return `{ success: true }`

### Phase 4: Analytics API (Data Aggregation)

**4.1 Create Stats API Endpoint**

**File**: `app/api/analytics/stats/route.ts`

**Implementation**:
- GET endpoint with `?range=today|yesterday|7d|30d` query parameter
- Calculate `startDate` and `endDate` based on range (reuse pattern from gym-dashboard date utilities)
- Execute 7 parallel queries using `Promise.all()`:
  1. Total page views (COUNT(*) WHERE is_bot=false)
  2. Unique visitors (COUNT(DISTINCT session_hash))
  3. Top pages (GROUP BY path ORDER BY count DESC LIMIT 10)
  4. Top referrers (GROUP BY referrer ORDER BY count DESC LIMIT 10)
  5. Browser distribution (GROUP BY browser ORDER BY count DESC LIMIT 10)
  6. Daily page views for chart (GROUP BY date ORDER BY date ASC)
  7. Performance averages (AVG(lcp), AVG(fid), AVG(cls), AVG(ttfb))
- Return aggregated JSON with cache headers: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`

**Reference Pattern**: Gym-dashboard date range handling in `app/demos/gym-dashboard/ui/DashboardClient.tsx` (lines 46-68)

**4.2 Create Cleanup Cron Endpoint**

**File**: `app/api/analytics/cleanup/route.ts`

**Implementation**:
- GET endpoint for Vercel Cron
- Verify `Authorization: Bearer ${process.env.CRON_SECRET}` header
- Calculate cutoff date (90 days ago)
- Execute: `DELETE FROM analytics_page_views WHERE date < ${cutoffDate}`
- Execute: `DELETE FROM analytics_performance WHERE date < ${cutoffDate}`
- Return `{ success: true, cutoff: cutoffDate }`

**4.3 Configure Vercel Cron**

**File**: `vercel.json` (create at root)
```json
{
  "crons": [{
    "path": "/api/analytics/cleanup",
    "schedule": "0 2 * * *"
  }]
}
```

**Environment Variable**: Add `CRON_SECRET` to `.env.local` and Vercel environment variables

### Phase 5: Analytics Dashboard

**5.1 Create Dashboard Pages**

**File**: `app/analytics/page.tsx`
- Server component wrapper with `export const dynamic = 'force-dynamic'`
- Metadata: title "Analytics Dashboard", robots noindex/nofollow (don't SEO index the analytics page)
- Render `<AnalyticsDashboard />` client component

**File**: `app/analytics/dashboard.tsx`
- Client component with time range state: `useState<'today' | 'yesterday' | '7d' | '30d'>('7d')`
- Fetch stats on mount and range change: `useEffect(() => fetch('/api/analytics/stats?range=${range}'), [range])`
- Layout structure:
  - Header with title and description
  - Time range selector (4 buttons: Today, Yesterday, 7D, 30D)
  - KPI cards (Total Views, Unique Visitors, Avg Views/Visitor)
  - Time-series chart (page views over time)
  - 2-column grid: Top Pages + Top Referrers
  - 2-column grid: Browser Distribution + Performance Metrics

**Reference Pattern**: `app/demos/gym-dashboard/ui/DashboardClient.tsx` for overall structure, time range buttons (lines 512-538), StatChip component

**5.2 Create Chart Components**

**File**: `app/analytics/ui/AnalyticsChart.tsx`
- Recharts `LineChart` with `Line` for time-series
- Data: `{ date: string; views: number }[]`
- Styling: cyan stroke `#54b3d6`, subtle grid `rgba(255,255,255,0.05)`, white/40 axis text
- Reference: `app/demos/gym-dashboard/ui/VolumeChart.tsx`

**File**: `app/analytics/ui/AnalyticsBarChart.tsx`
- Recharts `BarChart` with `Bar` for rankings
- Props: `data: any[]`, `dataKey: string`, `nameKey: string`
- Styling: cyan bars `#54b3d6`, angled X-axis labels
- Reference: VolumeChart pattern but with bars instead of area

**File**: `app/analytics/ui/PerformanceGauge.tsx`
- Props: `{ label, value, unit, threshold }`
- Display: metric value, progress bar, threshold indicator
- Color: green if `value <= threshold`, yellow otherwise
- Shows: LCP ≤2500ms, FID ≤100ms, CLS ≤0.1, TTFB ≤600ms

**Design System**: Use modern card pattern `bg-white/[0.02] border-white/10`, cyan accent `#54b3d6`, responsive grid layouts

### Phase 6: Homepage Widget

**6.1 Create Widget Component**

**File**: `app/components/analytics-widget.tsx`

**Implementation**:
- Client component that fetches `/api/analytics/stats?range=today` and `/api/analytics/stats?range=yesterday`
- Calculate % change: `((today - yesterday) / yesterday) * 100`
- Display:
  - Today's page view count (large, monospace font)
  - % change with up/down arrow (green/red color)
  - Most popular page (from today's top pages)
  - Link to `/analytics` page
- Auto-refresh every 5 minutes: `setInterval(() => loadStats(), 5 * 60 * 1000)`
- Styling: Card with `bg-white/[0.02] border-white/10 hover:border-[#54b3d6]/30`, group hover effects

**Reference Pattern**: StatChip component from gym-dashboard, modern card pattern from CLAUDE.md

**6.2 Add Widget to Homepage**

**File**: `app/page.tsx`

**Changes**:
- Import: `import AnalyticsWidget from '@/app/components/analytics-widget'`
- Insert between AnimatedCardStack section (ends ~line 87) and GitHubWidget section (starts ~line 89):
```typescript
<section className="mb-20">
  <div className="mb-8">
    <p className="section-label">Site Analytics</p>
  </div>
  <AnalyticsWidget />
</section>
```

## Critical Files Summary

### New Files to Create:
- `scripts/create-analytics-tables.sql` - Database schema
- `lib/analytics/session.ts` - Session hash generation
- `lib/analytics/user-agent.ts` - User agent parsing and bot detection
- `app/api/analytics/track/route.ts` - Page view tracking endpoint
- `app/api/analytics/performance/route.ts` - Performance metrics endpoint
- `app/api/analytics/stats/route.ts` - Aggregated stats endpoint
- `app/api/analytics/cleanup/route.ts` - Cron job for data expiry
- `app/components/analytics-tracker.tsx` - Client-side performance tracking
- `app/components/analytics-widget.tsx` - Homepage widget
- `app/analytics/page.tsx` - Dashboard page wrapper
- `app/analytics/dashboard.tsx` - Dashboard client component
- `app/analytics/ui/AnalyticsChart.tsx` - Time-series line chart
- `app/analytics/ui/AnalyticsBarChart.tsx` - Bar chart for rankings
- `app/analytics/ui/PerformanceGauge.tsx` - Performance metric gauges
- `vercel.json` - Vercel cron configuration

### Files to Modify:
- `middleware.ts` - Expand matcher, add server-side tracking logic
- `app/layout.tsx` - Add AnalyticsTracker component (after line 117)
- `app/page.tsx` - Add AnalyticsWidget section (around line 87-89)

### Files to Reference (Existing Patterns):
- `app/demos/gym-dashboard/ui/DashboardClient.tsx` - Time range selector, StatChip component, date utilities (lines 46-68, 157-169, 512-538)
- `app/demos/gym-dashboard/ui/VolumeChart.tsx` - Recharts configuration and styling
- `app/api/gym-data/route.ts` - Rate limiting pattern, date range filtering
- `app/components/route-warmup.tsx` - Production-only rendering pattern (line 15)
- `lib/data-access-portal.ts` - UUID generation, error handling patterns
- `app/global.css` - CSS variables and modern card patterns

## Verification Steps

### 1. Database Verification
```bash
# After running migration
npm run sql
# In psql console:
\dt analytics*  # Should show analytics_page_views and analytics_performance
SELECT * FROM analytics_page_views LIMIT 5;
```

### 2. Tracking Verification (Development)
```bash
# Start dev server
npm run dev

# Navigate to http://localhost:3001
# Check server console for tracking logs
# Check browser Network tab for POST to /api/analytics/track
```

### 3. Performance Tracking Verification
```bash
# In browser console after page load:
# Should see web-vitals metrics being sent to /api/analytics/performance
# Check Network tab for sendBeacon calls
```

### 4. Dashboard Verification
```bash
# After collecting some data:
# Visit http://localhost:3001/analytics
# Verify:
# - Time range buttons work
# - Charts render without errors
# - KPI cards show correct numbers
# - All sections load
```

### 5. Widget Verification
```bash
# Visit http://localhost:3001 (homepage)
# Scroll to analytics widget section
# Verify:
# - Shows today's page views
# - Shows % change (may be 0% or N/A if no yesterday data)
# - Shows most popular page
# - Clicking widget navigates to /analytics
```

### 6. Production Deployment Verification
```bash
# Deploy to Vercel
vercel --prod

# After deployment:
# 1. Check Vercel logs for tracking events
# 2. Verify cron job is scheduled in Vercel dashboard
# 3. Visit production site and check Network tab
# 4. Wait 5-10 minutes, check analytics dashboard for real data
# 5. Verify only production traffic is tracked (not dev/preview)
```

### 7. Cron Job Verification
```bash
# In Vercel dashboard:
# - Go to project settings → Cron Jobs
# - Verify "/api/analytics/cleanup" scheduled for "0 2 * * *"
# - Check cron execution logs after first run
# - Manually trigger via: curl -H "Authorization: Bearer ${CRON_SECRET}" https://yoursite.com/api/analytics/cleanup
```

## Important Notes

### Privacy & Compliance
- **No PII stored**: IP and User-Agent are hashed, never stored raw
- **Daily session rotation**: Session hash changes daily, can't track across days
- **Public dashboard**: Only aggregates visible, no individual session data exposed
- **90-day retention**: Old data automatically deleted via cron job
- **Bot exclusion**: All analytics queries exclude `is_bot = true` records

### Performance Considerations
- **Non-blocking tracking**: Middleware uses fire-and-forget pattern
- **Cached stats**: 5-minute cache on `/api/analytics/stats` reduces DB load
- **Indexed queries**: All date-range queries use indexed columns
- **sendBeacon API**: Client-side tracking uses reliable beacon API for minimal impact

### Scalability
- **Current approach**: Suitable for thousands of page views per day
- **If traffic grows**: Consider batching inserts, moving to Edge Functions, or adding materialized views for aggregates
- **Database**: Vercel Postgres connection pooling handles concurrent inserts

### Coexistence with Vercel Analytics
- **No conflicts**: Both systems track independently
- **Vercel Analytics**: Quick sanity checks, Edge function metrics, 30-day retention
- **Custom Analytics**: Full control, 90-day retention, custom queries, public dashboard
- **Redundancy**: If one system fails, the other continues working

### Time Zones
- **All UTC**: Database stores timestamps in UTC, dashboard displays UTC dates
- **Future enhancement**: Add timezone selector to dashboard for user preference
- **Session hash**: Uses UTC date for consistency across timezones

### Error Handling
- **Silent failures**: Analytics errors are logged but never break the site
- **Graceful degradation**: If API calls fail, site continues to function normally
- **Monitoring**: Check Vercel logs for analytics errors, but don't alert on them

### Environment Variables Needed
Add to `.env.local` and Vercel:
```bash
CRON_SECRET=<generate random string for cron auth>
# Existing vars already present:
# POSTGRES_URL
# NODE_ENV (auto-set by Vercel)
```

### Future Enhancements (Not in Initial Scope)
- Event tracking (button clicks, form submissions)
- Funnel analysis (conversion paths)
- Real-time dashboard updates (WebSockets)
- Geolocation mapping (IP to country)
- A/B testing support
- Data export (CSV download)
- Custom date range picker
- Email alerts for traffic spikes
