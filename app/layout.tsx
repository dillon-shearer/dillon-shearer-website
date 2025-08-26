import './global.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Navbar } from './components/nav'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Footer from './components/footer'
import { baseUrl } from './sitemap'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Home | DWD',
    template: '%s',
  },
  description: '',
  icons: {
    icon: '/favicon.ico', // updated to favicon
  },
  openGraph: {
    title: 'Data With Dillon',
    description: '',
    url: baseUrl,
    siteName: 'Data With Dillon',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// Fix the cx function with proper TypeScript
const cx = (...classes: (string | undefined | null | false)[]): string => 
  classes.filter(Boolean).join(' ')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={cx(
        'dark', // Force dark mode
        'text-black bg-white dark:text-white dark:bg-black',
        GeistSans.variable,
        GeistMono.variable
      )}
    >
      <body className="antialiased overflow-x-hidden">
        <main className="flex-auto min-w-0 mt-6 flex flex-col px-2 md:px-0 max-w-7xl mx-auto">
          <Navbar />
          <div className="w-full overflow-x-hidden">
            {children}
          </div>
          <Footer />
          <Analytics />
          <SpeedInsights />
        </main>
      </body>
    </html>
  )
}