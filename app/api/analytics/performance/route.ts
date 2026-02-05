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

    // Insert into unified analytics table
    await sql`
      INSERT INTO analytics (
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
      ) VALUES (
        ${normalizedPath},
        ${normalizedReferrer},
        ${sessionHash},
        ${browser},
        ${os},
        ${deviceType},
        ${isBotRequest},
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
