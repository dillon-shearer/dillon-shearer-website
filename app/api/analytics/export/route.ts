import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

type TimeRange = 'today' | 'yesterday' | '7d' | '30d' | 'all'

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
    case 'all':
      // Get all data (past 90 days due to cleanup policy)
      startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      break
    default:
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = (searchParams.get('range') || '7d') as TimeRange

    const { startDate, endDate } = getDateRange(range)

    // Get all analytics data (real traffic only)
    const analyticsResult = await sql`
      SELECT
        timestamp,
        date,
        path,
        referrer,
        session_hash,
        browser,
        os,
        device_type,
        is_bot,
        lcp,
        fid,
        cls,
        ttfb,
        fcp,
        dom_load_time,
        window_load_time,
        connection_type
      FROM analytics
      WHERE date >= ${startDate}::date
        AND date < ${endDate}::date
        AND is_bot = false
      ORDER BY timestamp DESC
    `

    // Build CSV with all columns
    const analyticsCSV = [
      // Header
      'timestamp,date,path,referrer,session_hash,browser,os,device_type,lcp_ms,fid_ms,cls,ttfb_ms,fcp_ms,dom_load_time_ms,window_load_time_ms,connection_type',
      // Data rows
      ...analyticsResult.rows.map(row =>
        [
          row.timestamp,
          row.date,
          escapeCSV(row.path),
          escapeCSV(row.referrer),
          row.session_hash,
          escapeCSV(row.browser),
          escapeCSV(row.os),
          escapeCSV(row.device_type),
          row.lcp || '',
          row.fid || '',
          row.cls || '',
          row.ttfb || '',
          row.fcp || '',
          row.dom_load_time || '',
          row.window_load_time || '',
          escapeCSV(row.connection_type),
        ].join(',')
      ),
    ].join('\n')

    const filename = `analytics-${range}-${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(analyticsCSV, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
