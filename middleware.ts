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
    // Only track actual page navigations, not prefetch/preload/resources
    // sec-fetch-dest: 'document' = actual page navigation
    // sec-fetch-dest: 'empty' = prefetch, fetch() calls
    // sec-fetch-dest: 'image', 'script', 'style' = resources
    const fetchDest = req.headers.get('sec-fetch-dest')
    const isDocument = fetchDest === 'document' || !fetchDest // fallback for browsers without sec-fetch-dest

    // Also check if this is a Next.js data request (prefetch)
    const isNextDataRequest = req.headers.get('x-nextjs-data') !== null
    const isPrefetch = req.headers.get('purpose') === 'prefetch'

    // Only track if it's a real page navigation
    if (isDocument && !isNextDataRequest && !isPrefetch) {
      // Extract client IP
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                 req.headers.get('x-real-ip') ||
                 '0.0.0.0'

      const userAgent = req.headers.get('user-agent') || ''

      // Skip bot detection in middleware (API will handle it)
      // Fire-and-forget tracking (non-blocking)
      const trackingUrl = new URL('/api/analytics/track', req.url)

      // Normalize path - ensure home page is always "/"
      const pathname = req.nextUrl.pathname || '/'

      fetch(trackingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: pathname,
          referrer: req.headers.get('referer') || null,
          userAgent,
          ip,
        }),
      }).catch(() => {
        // Silently fail - analytics should never break the site
      })
    }
  }

  return response
}
