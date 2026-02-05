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

    // Skip tracking if we're in an iframe or embed mode (e.g., demo previews)
    if (typeof window !== 'undefined') {
      // Check if we're in an iframe
      if (window.self !== window.top) return

      // Check if we're in embed mode
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get('embed') === '1') return

      // Only track if the component's pathname matches the actual browser URL
      // This prevents tracking when pages are rendered for previews (like /demos rendering sub-pages)
      if (window.location.pathname !== pathname) return
    }

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

    // Skip tracking if we're in an iframe or embed mode
    if (window.self !== window.top) return
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('embed') === '1') return

    // Only track if the component's pathname matches the actual browser URL
    if (window.location.pathname !== pathname) return

    const trackPerformance = async () => {
      try {
        // Collect Navigation Timing API metrics (available immediately)
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

        const metrics: any = {
          path: pathname,
          referrer: document.referrer || null,
        }

        // Navigation timing metrics are available immediately after load
        if (navigation) {
          metrics.domLoadTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
          metrics.windowLoadTime = navigation.loadEventEnd - navigation.loadEventStart
          metrics.ttfb = navigation.responseStart - navigation.requestStart
        }

        // Get connection type if available
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
        if (connection) {
          metrics.connectionType = connection.effectiveType || connection.type
        }

        // Track which vitals we've collected
        let vitalCount = 0
        const expectedVitals = 4 // LCP, FID, CLS, FCP
        let sendTimeoutId: NodeJS.Timeout

        const sendWhenReady = () => {
          // Send after 10 seconds OR when we have most vitals (FID may never fire)
          if (vitalCount >= 3 || !sendTimeoutId) {
            clearTimeout(sendTimeoutId)
            sendMetrics(metrics)
          }
        }

        // Set a maximum wait time of 10 seconds
        sendTimeoutId = setTimeout(() => {
          sendMetrics(metrics)
        }, 10000)

        // Dynamically import web-vitals and collect Core Web Vitals
        const { onLCP, onFID, onCLS, onFCP } = await import('web-vitals')

        onLCP((metric) => {
          metrics.lcp = metric.value
          vitalCount++
          sendWhenReady()
        })

        onFID((metric) => {
          metrics.fid = metric.value
          vitalCount++
          sendWhenReady()
        })

        onCLS((metric) => {
          metrics.cls = metric.value
          vitalCount++
          sendWhenReady()
        })

        onFCP((metric) => {
          metrics.fcp = metric.value
          vitalCount++
          sendWhenReady()
        })
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
