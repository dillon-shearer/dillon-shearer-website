import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

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
    console.log(`[Analytics] Range: ${range}, Start: ${startDate}, End: ${endDate}`)

    // Execute parallel queries
    const [
      totalViewsResult,
      uniqueVisitorsResult,
      topPagesResult,
      topReferrersResult,
      browserDistResult,
      dailyViewsResult,
      perfAveragesResult,
    ] = await Promise.all([
      // Total page views (including ALL data - no bot filtering)
      sql`
        SELECT COUNT(*) as count
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
      `,

      // Unique visitors (including ALL data)
      sql`
        SELECT COUNT(DISTINCT session_hash) as count
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
      `,

      // All pages - show every single entry from database
      sql`
        SELECT path, COUNT(*) as views
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
        GROUP BY path
        ORDER BY views DESC
      `,

      // External referrers only - exclude internal navigation
      sql`
        SELECT referrer, COUNT(*) as views
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND referrer IS NOT NULL
          AND referrer NOT LIKE '%datawithdillon.com%'
          AND referrer NOT LIKE '%localhost%'
        GROUP BY referrer
        ORDER BY views DESC
      `,

      // Browser distribution (all data, no limits)
      sql`
        SELECT browser, COUNT(*) as count
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
        GROUP BY browser
        ORDER BY count DESC
      `,

      // Daily page views for chart (all data)
      sql`
        SELECT date, COUNT(*) as views
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
        GROUP BY date
        ORDER BY date ASC
      `,

      // Performance averages
      sql`
        SELECT
          AVG(lcp) as avg_lcp,
          AVG(ttfb) as avg_ttfb
        FROM analytics_performance
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
      `,
    ])

    console.log(`[Analytics] Top pages query returned ${topPagesResult.rows.length} pages:`, topPagesResult.rows)

    // Debug: Check if there are bot pages being filtered out
    const allPagesDebug = await sql`
      SELECT path, COUNT(*) as total_views,
             COUNT(*) FILTER (WHERE is_bot = true) as bot_views,
             COUNT(*) FILTER (WHERE is_bot = false) as real_views
      FROM analytics_page_views
      WHERE date >= ${startDate}::date AND date < ${endDate}::date
      GROUP BY path
      ORDER BY total_views DESC
    `
    console.log(`[Analytics DEBUG] All pages including bots:`, allPagesDebug.rows)

    const stats = {
      totalViews: parseInt(totalViewsResult.rows[0]?.count || '0'),
      uniqueVisitors: parseInt(uniqueVisitorsResult.rows[0]?.count || '0'),
      topPages: topPagesResult.rows,
      topReferrers: topReferrersResult.rows,
      browserDistribution: browserDistResult.rows,
      dailyViews: dailyViewsResult.rows.map(row => ({
        date: row.date,
        views: parseInt(row.views),
      })),
      performance: {
        avgLcp: parseFloat(perfAveragesResult.rows[0]?.avg_lcp || '0'),
        avgTtfb: parseFloat(perfAveragesResult.rows[0]?.avg_ttfb || '0'),
      },
    }

    return NextResponse.json(stats, {
      headers: {
        // 30 second cache - balances freshness with performance
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error: any) {
    console.error('Analytics stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
