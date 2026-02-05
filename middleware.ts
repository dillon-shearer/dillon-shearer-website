// middleware.ts
import { NextResponse, NextRequest } from 'next/server'

export const config = {
  // Track all routes except static files, Next.js internals, and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}

export function middleware(req: NextRequest) {
  const response = NextResponse.next()

  // Only track in production
  if (process.env.NODE_ENV === 'production') {
    // Extract client IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               req.headers.get('x-real-ip') ||
               '0.0.0.0'

    const userAgent = req.headers.get('user-agent') || ''

    // Skip bot detection in middleware (API will handle it)
    // Fire-and-forget tracking (non-blocking)
    const trackingUrl = new URL('/api/analytics/track', req.url)
    fetch(trackingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: req.nextUrl.pathname,
        referrer: req.headers.get('referer') || null,
        userAgent,
        ip,
      }),
    }).catch(() => {
      // Silently fail - analytics should never break the site
    })
  }

  return response
}
