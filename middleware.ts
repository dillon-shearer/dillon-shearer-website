// middleware.ts
import { NextResponse } from 'next/server'

export const config = {
  matcher: ['/demos/:path*'],
}

export function middleware(req: Request) {
  const url = new URL(req.url)
  const ua = req.headers.get('user-agent') || ''
  const path = url.pathname

  // Let crawlers through for SEO & previews
  const isBot = /bot|crawler|spider|crawling|preview|facebookexternalhit|linkedinbot|twitterbot/i.test(ua)
  if (isBot) return NextResponse.next()

  const isMobile = /iphone|ipod|ipad|android|mobile|blackberry|iemobile|opera mini/i.test(ua)

  // Always allow desktop
  if (!isMobile) return NextResponse.next()

  // Allowlist for mobile
  const allowExact = new Set([
    '/demos',
    '/demos/mobile-warning',
    '/demos/gym-dashboard/form', // ← mobile data-entry page
  ])
  const allowPrefixes = [
    '/demos/gym-dashboard/form/', // allow any nested routes under the form path
  ]

  const isAllowed =
    allowExact.has(path) || allowPrefixes.some((p) => path.startsWith(p))

  if (isAllowed) {
    return NextResponse.next()
  }

  // For any other /demos/* on mobile, serve the warning UI in-place (no redirect loop)
  return NextResponse.rewrite(new URL('/demos/mobile-warning', url.origin))
}
