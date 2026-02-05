'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function AnalyticsTracker() {
  const pathname = usePathname()

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
          sendMetrics(metrics)
        })

        onFID((metric) => {
          metrics.fid = metric.value
          sendMetrics(metrics)
        })

        onCLS((metric) => {
          metrics.cls = metric.value
          sendMetrics(metrics)
        })

        onFCP((metric) => {
          metrics.fcp = metric.value
          sendMetrics(metrics)
        })

        // Send initial metrics even if some web vitals aren't triggered
        setTimeout(() => sendMetrics(metrics), 5000)
      } catch (error) {
        // Silently fail - analytics should never break the site
        console.debug('Analytics performance tracking error:', error)
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
