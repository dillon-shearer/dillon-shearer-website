import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function POST(request: Request) {
  try {
    const {
      path,
      lcp,
      fid,
      cls,
      ttfb,
      fcp,
      domLoadTime,
      windowLoadTime,
      connectionType,
    } = await request.json()

    // Validate path is present
    if (!path) {
      return NextResponse.json(
        { error: 'Missing path' },
        { status: 400 }
      )
    }

    // Insert performance metrics (all metrics are nullable)
    await sql`
      INSERT INTO analytics_performance (
        path,
        lcp,
        fid,
        cls,
        ttfb,
        fcp,
        dom_load_time,
        window_load_time,
        connection_type
      ) VALUES (
        ${path},
        ${lcp || null},
        ${fid || null},
        ${cls || null},
        ${ttfb || null},
        ${fcp || null},
        ${domLoadTime || null},
        ${windowLoadTime || null},
        ${connectionType || null}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Analytics performance tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
