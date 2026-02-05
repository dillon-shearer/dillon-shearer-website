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
      // Total page views (excluding bots)
      sql`
        SELECT COUNT(*) as count
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
      `,

      // Unique visitors
      sql`
        SELECT COUNT(DISTINCT session_hash) as count
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
      `,

      // Top pages
      sql`
        SELECT path, COUNT(*) as views
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      `,

      // Top referrers
      sql`
        SELECT referrer, COUNT(*) as views
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
          AND referrer IS NOT NULL
        GROUP BY referrer
        ORDER BY views DESC
        LIMIT 10
      `,

      // Browser distribution
      sql`
        SELECT browser, COUNT(*) as count
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
        GROUP BY browser
        ORDER BY count DESC
        LIMIT 10
      `,

      // Daily page views for chart
      sql`
        SELECT date, COUNT(*) as views
        FROM analytics_page_views
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
          AND is_bot = false
        GROUP BY date
        ORDER BY date ASC
      `,

      // Performance averages
      sql`
        SELECT
          AVG(lcp) as avg_lcp,
          AVG(fid) as avg_fid,
          AVG(cls) as avg_cls,
          AVG(ttfb) as avg_ttfb,
          AVG(fcp) as avg_fcp
        FROM analytics_performance
        WHERE date >= ${startDate}::date
          AND date < ${endDate}::date
      `,
    ])

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
        avgFid: parseFloat(perfAveragesResult.rows[0]?.avg_fid || '0'),
        avgCls: parseFloat(perfAveragesResult.rows[0]?.avg_cls || '0'),
        avgTtfb: parseFloat(perfAveragesResult.rows[0]?.avg_ttfb || '0'),
        avgFcp: parseFloat(perfAveragesResult.rows[0]?.avg_fcp || '0'),
      },
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
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
