import './global.css'
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Suspense } from 'react'
import { Navbar } from './components/nav'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Footer from './components/footer'
import EmbedToggle from './components/embed-toggle'
import RouteWarmup from './components/route-warmup'
import { baseUrl } from './sitemap'

const siteDescription = 'Dillon Shearer | Data Engineer & Analyst specializing in healthcare analytics and AI. Building production data systems in Georgia.'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Dillon Shearer | Data Engineer & Data Analyst | Healthcare Analytics',
    template: '%s | Dillon Shearer',
  },
  description: siteDescription,
  icons: {
    icon: '/favicon.ico', // updated to favicon
  },
  openGraph: {
    title: 'Data With Dillon',
    description: siteDescription,
    url: baseUrl,
    siteName: 'Data With Dillon',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `${baseUrl}/og`,
        width: 1200,
        height: 630,
        alt: 'Data With Dillon',
      }
    ],
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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        name: 'Dillon Shearer',
        url: baseUrl,
        sameAs: [
          'https://github.com/dillon-shearer',
          'https://www.linkedin.com/in/dillonshearer/',
        ],
        jobTitle: 'Data-Centric Software Engineer',
        worksFor: {
          '@type': 'Organization',
          name: 'Data With Dillon',
        },
      },
      {
        '@type': 'WebSite',
        name: 'Data With Dillon',
        url: baseUrl,
      },
    ],
  }

  return (
    <html
      lang="en"
      className={cx(
        'dark',
        GeistSans.variable,
        GeistMono.variable
      )}
      style={{
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      }}
    >
      <body className="antialiased overflow-x-hidden" style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}>
        <Suspense fallback={null}>
          <EmbedToggle />
        </Suspense>
        <RouteWarmup />
        <div data-embed-hide="true">
          <Navbar />
        </div>
        <main className="site-shell flex-auto min-w-0 pt-20 flex flex-col w-full">
          <div className="w-full overflow-x-hidden site-shell-content max-w-7xl mx-auto px-2 md:px-0">
            {children}
          </div>
          <Analytics />
          <SpeedInsights />
        </main>
        <div data-embed-hide="true">
          <Footer />
        </div>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  )
}
