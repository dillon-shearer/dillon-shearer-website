'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const previousPathRef = useRef<string | null>(null)

  // Track page views on every pathname change
  useEffect(() => {
    // Only track in production
    if (process.env.NODE_ENV !== 'production') return

    // Skip tracking if this is the same page (shouldn't happen, but safety check)
    if (previousPathRef.current === pathname) return

    // Update the ref
    previousPathRef.current = pathname

    // Track page view immediately on navigation
    trackPageView(pathname)
  }, [pathname])

  // Track performance metrics on initial page load only
  useEffect(() => {
    // Only track in production
    if (process.env.NODE_ENV !== 'production') return

    // Wait for page load completion
    if (typeof window === 'undefined') return

    const trackPerformance = async () => {
      try {
        // Collect Navigation Timing API metrics
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

        const metrics: any = {
          path: pathname,
          referrer: document.referrer || null,
          domLoadTime: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
          windowLoadTime: navigation?.loadEventEnd - navigation?.loadEventStart,
          ttfb: navigation?.responseStart - navigation?.requestStart,
        }

        // Get connection type if available
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
        if (connection) {
          metrics.connectionType = connection.effectiveType || connection.type
        }

        // Dynamically import web-vitals and collect Core Web Vitals
        const { onLCP, onFID, onCLS, onFCP } = await import('web-vitals')

        onLCP((metric) => {
          metrics.lcp = metric.value
        })

        onFID((metric) => {
          metrics.fid = metric.value
        })

        onCLS((metric) => {
          metrics.cls = metric.value
        })

        onFCP((metric) => {
          metrics.fcp = metric.value
        })

        // Send metrics after collecting web vitals (or timeout after 5 seconds)
        setTimeout(() => sendMetrics(metrics), 5000)
      } catch (error) {
        // Silently fail - analytics should never break the site
      }
    }

    // Track when page is loaded
    if (document.readyState === 'complete') {
      trackPerformance()
    } else {
      window.addEventListener('load', trackPerformance)
      return () => window.removeEventListener('load', trackPerformance)
    }
  }, [pathname])

  return null
}

// Track page views for client-side navigation
function trackPageView(pathname: string) {
  // Get client IP is not possible from browser, so we'll send a placeholder
  // The server can extract the real IP from headers if needed in the future
  const pageViewData = {
    path: pathname,
    referrer: document.referrer || null,
    userAgent: navigator.userAgent,
    ip: '0.0.0.0', // Placeholder - backend should extract from headers if needed
  }

  // Use sendBeacon if available (more reliable on page unload)
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(pageViewData)], { type: 'application/json' })
    navigator.sendBeacon('/api/analytics/track', blob)
  } else {
    // Fallback to fetch
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageViewData),
      keepalive: true,
    }).catch(() => {
      // Silently fail - analytics should never break the site
    })
  }
}

function sendMetrics(metrics: any) {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    // Fallback to fetch if sendBeacon is not available
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
      keepalive: true,
    }).catch(() => {})
    return
  }

  // Use sendBeacon for reliability
  const blob = new Blob([JSON.stringify(metrics)], { type: 'application/json' })
  navigator.sendBeacon('/api/analytics/performance', blob)
}
