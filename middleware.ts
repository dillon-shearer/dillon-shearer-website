import { NextResponse } from 'next/server'

export const config = {
  matcher: ['/demos/:path*'],
}

export function middleware(req: Request) {
  const url = new URL(req.url)
  const ua = req.headers.get('user-agent') || ''

  const isBot = /bot|crawler|spider|crawling|preview|facebookexternalhit|linkedinbot|twitterbot/i.test(ua)
  if (isBot) return NextResponse.next()

  const isMobile = /iphone|ipod|ipad|android|mobile|blackberry|iemobile|opera mini/i.test(ua)

  // Allow the main /demos landing as always
  if (isMobile && url.pathname !== '/demos') {
    url.pathname = '/demos/mobile-warning'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
