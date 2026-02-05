// middleware.ts
import { NextResponse, NextRequest } from 'next/server'

export const config = {
  // Track all routes except static files, Next.js internals, and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}

export function middleware(req: NextRequest) {
  const response = NextResponse.next()

  // Analytics tracking removed to prevent double-tracking
  // Client-side AnalyticsTracker component handles all page view tracking

  return response
}
