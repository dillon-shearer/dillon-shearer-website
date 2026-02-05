import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { parseUserAgent, isBot } from '@/lib/analytics/user-agent'
import { generateSessionHash } from '@/lib/analytics/session'
import { normalizeReferrer } from '@/lib/analytics/referrer'

export async function POST(request: Request) {
  try {
    const { path, referrer, userAgent, ip } = await request.json()

    // Validate required fields
    if (!path || !userAgent || !ip) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Normalize path: ensure it always starts with /
    // This treats 'datawithdillon.com' and 'datawithdillon.com/' the same
    const normalizedPath = path === '' || path === '/' ? '/' : path.startsWith('/') ? path : `/${path}`

    // Parse user agent
    const { browser, os, deviceType } = parseUserAgent(userAgent)
    const isBotRequest = isBot(userAgent)

    // Generate session hash
    const sessionHash = generateSessionHash(ip, userAgent)

    // Normalize referrer URL to clean domain
    const normalizedReferrer = normalizeReferrer(referrer)

    // Insert page view into unified analytics table
    await sql`
      INSERT INTO analytics (
        path,
        referrer,
        session_hash,
        browser,
        os,
        device_type,
        is_bot
      ) VALUES (
        ${normalizedPath},
        ${normalizedReferrer},
        ${sessionHash},
        ${browser},
        ${os},
        ${deviceType},
        ${isBotRequest}
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
