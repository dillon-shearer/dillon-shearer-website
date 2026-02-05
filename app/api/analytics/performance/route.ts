import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { parseUserAgent, isBot } from '@/lib/analytics/user-agent'
import { generateSessionHash } from '@/lib/analytics/session'
import { normalizeReferrer } from '@/lib/analytics/referrer'

export async function POST(request: Request) {
  try {
    const {
      path,
      referrer,
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

    // Get user agent and IP from request headers
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Parse user agent
    const { browser, os, deviceType } = parseUserAgent(userAgent)
    const isBotRequest = isBot(userAgent)

    // Generate session hash
    const sessionHash = generateSessionHash(ip, userAgent)

    // Normalize referrer URL to clean domain
    const normalizedReferrer = normalizeReferrer(referrer)

    // Normalize path
    const normalizedPath = path === '' || path === '/' ? '/' : path.startsWith('/') ? path : `/${path}`

    // Update the most recent analytics record for this session/path with performance metrics
    // This prevents creating duplicate page view records
    await sql`
      UPDATE analytics
      SET
        lcp = ${lcp || null},
        fid = ${fid || null},
        cls = ${cls || null},
        ttfb = ${ttfb || null},
        fcp = ${fcp || null},
        dom_load_time = ${domLoadTime || null},
        window_load_time = ${windowLoadTime || null},
        connection_type = ${connectionType || null}
      WHERE id = (
        SELECT id FROM analytics
        WHERE session_hash = ${sessionHash}
          AND path = ${normalizedPath}
          AND timestamp >= NOW() - INTERVAL '30 seconds'
        ORDER BY timestamp DESC
        LIMIT 1
      )
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
