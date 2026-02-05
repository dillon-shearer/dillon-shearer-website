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
      <div className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/30 transition-all">
        <div className="text-white/40 text-sm">Loading analytics...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/30 transition-all">
        <div className="text-white/40 text-sm">Analytics unavailable</div>
      </div>
    )
  }

  const isPositive = stats.percentChange >= 0
  const hasYesterdayData = stats.yesterdayViews > 0

  return (
    <Link href="/analytics" className="block group">
      <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/30 transition-all overflow-hidden">
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">Today's Traffic</h3>
            <span className="text-xs text-[#54b3d6] group-hover:underline">View Dashboard →</span>
          </div>

          {/* Main Stats */}
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-4xl font-bold font-mono mb-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {stats.todayViews.toLocaleString()}
              </div>
              <div className="text-xs text-white/40 uppercase tracking-wider">Page Views</div>
            </div>

            {hasYesterdayData && (
              <div className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '↑' : '↓'}
                {Math.abs(stats.percentChange).toFixed(1)}%
              </div>
            )}
          </div>

          {/* Most Popular Page */}
          <div className="pt-4 border-t border-white/10">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Most Popular</div>
            <div className="text-sm text-white/80 font-mono truncate">{stats.mostPopularPage}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}
