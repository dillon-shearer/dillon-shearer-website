// middleware.ts
import { NextResponse, NextRequest } from 'next/server'

export const config = {
  // Only run on /demos and its children
  matcher: ['/demos/:path*'],
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  const ua = req.headers.get('user-agent') || ''
  const path = url.pathname

  // Let crawlers through for SEO & link previews
  const isBot = /bot|crawler|spider|crawling|preview|facebookexternalhit|linkedinbot|twitterbot/i.test(ua)
  if (isBot) return NextResponse.next()

  // Basic mobile detection
  const isMobile = /iphone|ipod|ipad|android|mobile|blackberry|iemobile|opera mini/i.test(ua)
  if (!isMobile) return NextResponse.next() // always allow desktop

  // Safety: if we're already on the warning page, do nothing
  if (path === '/demos/mobile-warning') return NextResponse.next()

  // Mobile allowlist
  const allowExact = new Set<string>([
    '/demos',
    '/demos/mobile-warning',
    '/demos/gym-dashboard/form', // mobile data-entry page
  ])
  const allowPrefixes = ['/demos/gym-dashboard/form/'] // nested under form

  const isAllowed =
    allowExact.has(path) || allowPrefixes.some((p) => path.startsWith(p))

  if (isAllowed) {
    return NextResponse.next()
  }

  // For any other /demos/* on mobile, serve the warning UI in-place
  // (keeps the original URL in the bar; no redirect loops)
  const rewriteUrl = url.clone()
  rewriteUrl.pathname = '/demos/mobile-warning'
  rewriteUrl.search = ''
  return NextResponse.rewrite(rewriteUrl)
}
