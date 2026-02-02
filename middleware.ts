// middleware.ts
import { NextResponse, NextRequest } from 'next/server'

export const config = {
  // Only run on /demos and its children
  matcher: ['/demos/:path*'],
}

export function middleware(req: NextRequest) {
  // Middleware kept for future use but currently allows all traffic
  // All demos are now mobile-friendly
  return NextResponse.next()
}
