import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Calculate cutoff date (90 days ago)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)
    const cutoff = cutoffDate.toISOString()

    // Delete old page views
    const pageViewsResult = await sql`
      DELETE FROM analytics_page_views
      WHERE timestamp < ${cutoff}
    `

    // Delete old performance metrics
    const performanceResult = await sql`
      DELETE FROM analytics_performance
      WHERE timestamp < ${cutoff}
    `

    return NextResponse.json({
      success: true,
      cutoff,
      deletedPageViews: pageViewsResult.rowCount,
      deletedPerformance: performanceResult.rowCount,
    })
  } catch (error: any) {
    console.error('Analytics cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
