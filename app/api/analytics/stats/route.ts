import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

type TimeRange = 'today' | 'yesterday' | '7d' | '30d'

function getDateRange(range: TimeRange): { startDate: string; endDate: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let startDate: Date
  let endDate: Date

  switch (range) {
    case 'today':
      startDate = today
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      break
    case 'yesterday':
      startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      endDate = today
      break
    case '7d':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  }

  return {
    startDate: startDate.toISOString().split('T')[0], // Return YYYY-MM-DD
    endDate: endDate.toISOString().split('T')[0],     // Return YYYY-MM-DD
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = (searchParams.get('range') || '7d') as TimeRange

    const { startDate, endDate } = getDateRange(range)

    // Execute parallel queries using unified analytics table
    const [
      totalViewsResult,
      uniqueVisitorsResult,
      topPagesResult,
      topReferrersResult,
      browserDistResult,
      deviceDistResult,
      osDistResult,
      dailyViewsResult,
      perfAveragesResult,
    ] = await Promise.all([
      // Total page views (real traffic only - exclude bots)
      sql`
        SELECT COUNT(*) as count
        FROM analytics
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
      `,

      // Unique visitors (real traffic only)
      sql`
        SELECT COUNT(DISTINCT session_hash) as count
        FROM analytics
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
      `,

      // All pages - real traffic only
      sql`
        SELECT path, COUNT(*) as views
        FROM analytics
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
        GROUP BY path
        ORDER BY views DESC
        LIMIT 100
      `,

      // External referrers only - exclude internal navigation and bots
      sql`
        SELECT referrer, COUNT(*) as views
        FROM analytics
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
          AND referrer IS NOT NULL
          AND referrer != 'datawithdillon.com'
          AND referrer != 'localhost'
        GROUP BY referrer
        ORDER BY views DESC
        LIMIT 50
      `,

      // Browser distribution (real traffic only)
      sql`
        SELECT browser, COUNT(*) as count
        FROM analytics
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
        GROUP BY browser
        ORDER BY count DESC
      `,

      // Device type distribution (real traffic only)
      sql`
        SELECT device_type, COUNT(*) as count
        FROM analytics
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
        GROUP BY device_type
        ORDER BY count DESC
      `,

      // OS distribution (real traffic only)
      sql`
        SELECT os, COUNT(*) as count
        FROM analytics
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
        GROUP BY os
        ORDER BY count DESC
      `,

      // Daily page views for chart (real traffic only)
      sql`
        SELECT date, COUNT(*) as views
        FROM analytics
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
        GROUP BY date
        ORDER BY date ASC
      `,

      // Performance averages (real traffic only)
      sql`
        SELECT
          AVG(lcp) as avg_lcp,
          AVG(fid) as avg_fid,
          AVG(cls) as avg_cls,
          AVG(ttfb) as avg_ttfb,
          AVG(fcp) as avg_fcp,
          AVG(dom_load_time) as avg_dom_load,
          AVG(window_load_time) as avg_window_load
        FROM analytics
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
      `,
    ])


    const stats = {
      totalViews: parseInt(totalViewsResult.rows[0]?.count || '0'),
      uniqueVisitors: parseInt(uniqueVisitorsResult.rows[0]?.count || '0'),
      topPages: topPagesResult.rows,
      topReferrers: topReferrersResult.rows,
      browserDistribution: browserDistResult.rows,
      deviceDistribution: deviceDistResult.rows,
      osDistribution: osDistResult.rows,
      dailyViews: dailyViewsResult.rows.map(row => ({
        date: row.date,
        views: parseInt(row.views),
      })),
      performance: {
        avgLcp: parseFloat(perfAveragesResult.rows[0]?.avg_lcp || '0'),
        avgFid: parseFloat(perfAveragesResult.rows[0]?.avg_fid || '0'),
        avgCls: parseFloat(perfAveragesResult.rows[0]?.avg_cls || '0'),
        avgTtfb: parseFloat(perfAveragesResult.rows[0]?.avg_ttfb || '0'),
        avgFcp: parseFloat(perfAveragesResult.rows[0]?.avg_fcp || '0'),
        avgDomLoad: parseFloat(perfAveragesResult.rows[0]?.avg_dom_load || '0'),
        avgWindowLoad: parseFloat(perfAveragesResult.rows[0]?.avg_window_load || '0'),
      },
    }

    // Generate ETag from data hash for efficient conditional requests
    const dataHash = createHash('md5').update(JSON.stringify(stats)).digest('hex')
    const etag = `"${dataHash}"`

    // Check if client has cached version (If-None-Match header)
    const clientEtag = request.headers.get('if-none-match')
    if (clientEtag === etag) {
      // Data hasn't changed - return 304 Not Modified (no body, saves bandwidth)
      return new NextResponse(null, {
        status: 304,
        headers: {
          'ETag': etag,
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
        },
      })
    }

    return NextResponse.json(stats, {
      headers: {
        'ETag': etag,
        // 5 second cache - balances freshness with performance
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
