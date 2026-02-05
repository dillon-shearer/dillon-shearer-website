'use client'

import { useState, useEffect } from 'react'
import AnalyticsChart from './ui/AnalyticsChart'
import AnalyticsBarChart from './ui/AnalyticsBarChart'
import PerformanceGauge from './ui/PerformanceGauge'

type TimeRange = 'today' | 'yesterday' | '7d' | '30d'

type AnalyticsStats = {
  totalViews: number
  uniqueVisitors: number
  topPages: { path: string; views: number }[]
  topReferrers: { referrer: string; views: number }[]
  browserDistribution: { browser: string; count: number }[]
  dailyViews: { date: string; views: number }[]
  performance: {
    avgLcp: number
    avgFid: number
    avgCls: number
    avgTtfb: number
    avgFcp: number
  }
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.02] px-4 py-3.5 flex flex-col gap-2 hover:border-[#54b3d6]/30 transition-all">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">{label}</div>
      <div className="text-2xl font-bold leading-none font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">{sub}</div>}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<TimeRange>('7d')
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/analytics/stats?range=${range}`)
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch analytics stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [range])

  const avgViewsPerVisitor = stats
    ? stats.uniqueVisitors > 0
      ? (stats.totalViews / stats.uniqueVisitors).toFixed(1)
      : '0'
    : '0'

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-white/60">Website traffic and performance metrics</p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['today', 'yesterday', '7d', '30d'] as TimeRange[]).map((r) => {
            const active = range === r
            const label = r === 'today' ? 'Today' : r === 'yesterday' ? 'Yesterday' : r === '7d' ? '7 Days' : '30 Days'
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={[
                  'h-11 sm:h-10 px-3 rounded-lg border text-sm font-semibold tracking-wide transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-[#54b3d6]/40 active:scale-95',
                  active
                    ? 'bg-[#54b3d6] border-[#54b3d6] text-black shadow-lg shadow-[#54b3d6]/20'
                    : 'bg-white/[0.05] border-white/15 text-white/80 hover:bg-white/[0.08] hover:border-[#54b3d6]/30 hover:text-white'
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40">Loading analytics...</div>
      ) : !stats ? (
        <div className="text-center py-12 text-white/40">Failed to load analytics</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Views" value={stats.totalViews} />
            <StatCard label="Unique Visitors" value={stats.uniqueVisitors} />
            <StatCard label="Avg Views/Visitor" value={avgViewsPerVisitor} />
          </div>

          {/* Page Views Chart */}
          <div className="mb-8">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/30 transition-all">
              <h2 className="text-lg font-bold mb-4">Page Views Over Time</h2>
              <AnalyticsChart data={stats.dailyViews} />
            </div>
          </div>

          {/* Top Pages & Referrers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/30 transition-all">
              <h2 className="text-lg font-bold mb-4">Top Pages</h2>
              {stats.topPages.length > 0 ? (
                <AnalyticsBarChart
                  data={stats.topPages}
                  dataKey="views"
                  nameKey="path"
                  height={250}
                />
              ) : (
                <div className="text-white/40 text-sm py-8 text-center">No data</div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/30 transition-all">
              <h2 className="text-lg font-bold mb-4">Top Referrers</h2>
              {stats.topReferrers.length > 0 ? (
                <AnalyticsBarChart
                  data={stats.topReferrers}
                  dataKey="views"
                  nameKey="referrer"
                  height={250}
                />
              ) : (
                <div className="text-white/40 text-sm py-8 text-center">No data</div>
              )}
            </div>
          </div>

          {/* Browser Distribution & Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/30 transition-all">
              <h2 className="text-lg font-bold mb-4">Browser Distribution</h2>
              {stats.browserDistribution.length > 0 ? (
                <AnalyticsBarChart
                  data={stats.browserDistribution}
                  dataKey="count"
                  nameKey="browser"
                  height={250}
                />
              ) : (
                <div className="text-white/40 text-sm py-8 text-center">No data</div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/30 transition-all">
              <h2 className="text-lg font-bold mb-4">Core Web Vitals</h2>
              <div className="grid grid-cols-2 gap-3">
                <PerformanceGauge
                  label="LCP"
                  value={stats.performance.avgLcp}
                  unit="ms"
                  threshold={2500}
                  description="Largest Contentful Paint"
                />
                <PerformanceGauge
                  label="FID"
                  value={stats.performance.avgFid}
                  unit="ms"
                  threshold={100}
                  description="First Input Delay"
                />
                <PerformanceGauge
                  label="CLS"
                  value={stats.performance.avgCls}
                  unit=""
                  threshold={0.1}
                  description="Cumulative Layout Shift"
                />
                <PerformanceGauge
                  label="TTFB"
                  value={stats.performance.avgTtfb}
                  unit="ms"
                  threshold={600}
                  description="Time to First Byte"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
