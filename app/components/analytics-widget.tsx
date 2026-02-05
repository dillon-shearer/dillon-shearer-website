'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type WidgetStats = {
  todayViews: number
  yesterdayViews: number
  percentChange: number
  mostPopularPage: string
}

export default function AnalyticsWidget() {
  const [stats, setStats] = useState<WidgetStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [todayRes, yesterdayRes] = await Promise.all([
          fetch('/api/analytics/stats?range=today'),
          fetch('/api/analytics/stats?range=yesterday'),
        ])

        const todayData = await todayRes.json()
        const yesterdayData = await yesterdayRes.json()

        const todayViews = todayData.totalViews || 0
        const yesterdayViews = yesterdayData.totalViews || 0
        const percentChange = yesterdayViews > 0
          ? ((todayViews - yesterdayViews) / yesterdayViews) * 100
          : 0

        const mostPopularPage = todayData.topPages?.[0]?.path || '/'

        setStats({
          todayViews,
          yesterdayViews,
          percentChange,
          mostPopularPage,
        })
      } catch (error) {
        console.error('Failed to fetch analytics widget stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()

    // Auto-refresh every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="card-base w-full p-6">
        <div className="animate-pulse text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading site analytics...
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="card-base w-full p-6 text-center">
        <h3 className="font-semibold mb-2 text-white">Analytics Unavailable</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Unable to load analytics data. Please try again later.
        </p>
      </div>
    )
  }

  const isPositive = stats.percentChange >= 0
  const hasYesterdayData = stats.yesterdayViews > 0

  return (
    <div
      className="card-base card-hover w-full p-6 cursor-pointer"
      onClick={() => window.location.href = '/analytics'}
    >
      <div className="text-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h3 className="font-semibold text-white">
            Site Analytics
          </h3>
        </div>
        <div className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {stats.todayViews.toLocaleString()}
            </span>
            <span>view{stats.todayViews === 1 ? '' : 's'} today</span>
            {hasYesterdayData && (
              <>
                <span>•</span>
                <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
                  {isPositive ? '↑' : '↓'}{Math.abs(stats.percentChange).toFixed(0)}%
                </span>
              </>
            )}
          </div>
          <div>
            Top page: "{stats.mostPopularPage}"
          </div>
        </div>
      </div>
    </div>
  )
}
