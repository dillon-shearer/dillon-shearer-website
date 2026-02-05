import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { parseUserAgent, isBot } from '@/lib/analytics/user-agent'
import { generateSessionHash } from '@/lib/analytics/session'

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

    // Insert page view
    await sql`
      INSERT INTO analytics_page_views (
        path,
        referrer,
        session_hash,
        browser,
        os,
        device_type,
        is_bot
      ) VALUES (
        ${normalizedPath},
        ${referrer},
        ${sessionHash},
        ${browser},
        ${os},
        ${deviceType},
        ${isBotRequest}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
