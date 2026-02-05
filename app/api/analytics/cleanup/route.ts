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
    const cutoff = cutoffDate.toISOString().split('T')[0] // YYYY-MM-DD format

    // Delete old analytics records
    const analyticsResult = await sql`
      DELETE FROM analytics
      WHERE date < ${cutoff}::date
    `

    return NextResponse.json({
      success: true,
      cutoff,
      deletedRecords: analyticsResult.rowCount,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
