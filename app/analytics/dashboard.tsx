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
  deviceDistribution: { device_type: string; count: number }[]
  osDistribution: { os: string; count: number }[]
  dailyViews: { date: string; views: number }[]
  performance: {
    avgLcp: number
    avgFid: number
    avgCls: number
    avgTtfb: number
    avgFcp: number
    avgDomLoad: number
    avgWindowLoad: number
  }
}

function StatCard({ label, value, sub, trend }: {
  label: string
  value: number | string
  sub?: string
  trend?: { value: number; isPositive: boolean }
}) {
  return (
    <div className="group relative rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 hover:border-[#54b3d6]/30 transition-all overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">{label}</div>
          {trend && (
            <div className={`text-xs font-bold ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="text-3xl font-bold leading-none font-mono tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {sub && <div className="text-xs text-white/40 mt-2">{sub}</div>}
      </div>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<TimeRange>('today')
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
        // Silently fail - analytics should never break the site
      } finally {
        setLoading(false)
      }
    }

    // Fetch immediately
    fetchStats()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)

    // Cleanup interval on unmount or range change
    return () => clearInterval(interval)
  }, [range])

  const avgViewsPerVisitor = stats
    ? stats.uniqueVisitors > 0
      ? (stats.totalViews / stats.uniqueVisitors).toFixed(1)
      : '0'
    : '0'

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header with Editorial Typography */}
        <header className="mb-10 sm:mb-12 pb-6 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#54b3d6] mb-3">
                Site Metrics
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
                Analytics Dashboard
              </h1>
              <p className="text-white/50 text-sm">
                Real-time traffic and performance monitoring
              </p>
            </div>

            {/* Time Range Pills & Export */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {(['today', 'yesterday', '7d', '30d'] as TimeRange[]).map((r) => {
                  const active = range === r
                  const label = r === 'today' ? 'Today' : r === 'yesterday' ? 'Yesterday' : r === '7d' ? '7D' : '30D'
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      className={[
                        'h-9 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-[#54b3d6]/40',
                        active
                          ? 'bg-[#54b3d6] text-black shadow-lg shadow-[#54b3d6]/25'
                          : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white border border-white/10'
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Download CSV */}
              <a
                href={`/api/analytics/export?range=${range}`}
                download
                className="h-9 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#54b3d6]/40 flex items-center gap-2"
                title="Download analytics data as CSV"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV
              </a>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-pulse text-white/40">Loading analytics data...</div>
          </div>
        ) : !stats ? (
          <div className="text-center py-20">
            <div className="text-white/40">Failed to load analytics</div>
          </div>
        ) : (
          <>
            {/* KPI Grid - Asymmetric Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatCard
                label="Total Views"
                value={stats.totalViews}
                sub={`Across ${stats.dailyViews.length} day${stats.dailyViews.length === 1 ? '' : 's'}`}
              />
              <StatCard
                label="Unique Visitors"
                value={stats.uniqueVisitors}
                sub="Anonymous sessions"
              />
              <StatCard
                label="Views / Visitor"
                value={avgViewsPerVisitor}
                sub="Average engagement"
              />
            </div>

            {/* Page Views Chart - Full Width Emphasis */}
            <div className="mb-8">
              <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 hover:border-[#54b3d6]/20 transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-baseline gap-3 mb-6">
                    <h2 className="text-xl font-bold">Traffic Trend</h2>
                    <span className="text-xs text-white/40 uppercase tracking-wider">Daily Views</span>
                  </div>
                  <AnalyticsChart data={stats.dailyViews} />
                </div>
              </div>
            </div>

            {/* All Pages - Full Width */}
            <div className="mb-8">
              <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 hover:border-[#54b3d6]/20 transition-all">
                <div className="flex items-baseline gap-3 mb-6">
                  <h2 className="text-xl font-bold">All Pages</h2>
                  <span className="text-xs text-white/40 uppercase tracking-wider">
                    {stats.topPages.length} {stats.topPages.length === 1 ? 'Page' : 'Pages'}
                  </span>
                </div>
                {stats.topPages.length > 0 ? (
                  <AnalyticsBarChart
                    data={stats.topPages}
                    dataKey="views"
                    nameKey="path"
                    height={360}
                    scrollable={true}
                  />
                ) : (
                  <div className="text-white/30 text-sm py-12 text-center">No page data available</div>
                )}
              </div>
            </div>

            {/* Traffic Sources & Browser Usage - Two Column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Traffic Sources */}
              <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/20 transition-all">
                <div className="flex items-baseline gap-3 mb-5">
                  <h2 className="text-lg font-bold">Traffic Sources</h2>
                  <span className="text-xs text-white/40 uppercase tracking-wider">
                    External Referrers
                  </span>
                </div>
                {stats.topReferrers.length > 0 ? (
                  <AnalyticsBarChart
                    data={stats.topReferrers}
                    dataKey="views"
                    nameKey="referrer"
                    height={320}
                  />
                ) : (
                  <div className="text-white/30 text-sm py-12 text-center">No referrer data available</div>
                )}
              </div>

              {/* Browser Usage */}
              <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/20 transition-all">
                <div className="flex items-baseline gap-3 mb-5">
                  <h2 className="text-lg font-bold">Browser Usage</h2>
                  <span className="text-xs text-white/40 uppercase tracking-wider">
                    Distribution
                  </span>
                </div>
                {stats.browserDistribution.length > 0 ? (
                  <AnalyticsBarChart
                    data={stats.browserDistribution}
                    dataKey="count"
                    nameKey="browser"
                    height={320}
                  />
                ) : (
                  <div className="text-white/30 text-sm py-12 text-center">No browser data available</div>
                )}
              </div>
            </div>

            {/* Device Type & OS Distribution - Two Column */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Device Type */}
              <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/20 transition-all">
                <div className="flex items-baseline gap-3 mb-5">
                  <h2 className="text-lg font-bold">Device Type</h2>
                  <span className="text-xs text-white/40 uppercase tracking-wider">
                    Distribution
                  </span>
                </div>
                {stats.deviceDistribution.length > 0 ? (
                  <AnalyticsBarChart
                    data={stats.deviceDistribution}
                    dataKey="count"
                    nameKey="device_type"
                    height={320}
                  />
                ) : (
                  <div className="text-white/30 text-sm py-12 text-center">No device data available</div>
                )}
              </div>

              {/* Operating System */}
              <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#54b3d6]/20 transition-all">
                <div className="flex items-baseline gap-3 mb-5">
                  <h2 className="text-lg font-bold">Operating System</h2>
                  <span className="text-xs text-white/40 uppercase tracking-wider">
                    Distribution
                  </span>
                </div>
                {stats.osDistribution.length > 0 ? (
                  <AnalyticsBarChart
                    data={stats.osDistribution}
                    dataKey="count"
                    nameKey="os"
                    height={320}
                  />
                ) : (
                  <div className="text-white/30 text-sm py-12 text-center">No OS data available</div>
                )}
              </div>
            </div>

            {/* Performance Metrics - Full Width - Only show if we have data */}
            {(stats.performance.avgLcp > 0 || stats.performance.avgTtfb > 0 || stats.performance.avgFcp > 0) && (
              <div className="group relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 hover:border-[#54b3d6]/20 transition-all">
                <div className="flex items-baseline gap-3 mb-6">
                  <h2 className="text-xl font-bold">Performance Metrics</h2>
                  <span className="text-xs text-white/40 uppercase tracking-wider">
                    Core Web Vitals & Load Times
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Core Web Vitals */}
                  {stats.performance.avgLcp > 0 && (
                    <PerformanceGauge
                      label="LCP"
                      value={stats.performance.avgLcp}
                      unit="ms"
                      threshold={2500}
                      description="Largest Contentful Paint"
                    />
                  )}
                  {stats.performance.avgFid > 0 && (
                    <PerformanceGauge
                      label="FID"
                      value={stats.performance.avgFid}
                      unit="ms"
                      threshold={100}
                      description="First Input Delay"
                    />
                  )}
                  {stats.performance.avgCls > 0 && (
                    <PerformanceGauge
                      label="CLS"
                      value={stats.performance.avgCls}
                      unit=""
                      threshold={0.1}
                      description="Cumulative Layout Shift"
                    />
                  )}

                  {/* Navigation Timing */}
                  {stats.performance.avgTtfb > 0 && (
                    <PerformanceGauge
                      label="TTFB"
                      value={stats.performance.avgTtfb}
                      unit="ms"
                      threshold={600}
                      description="Time to First Byte"
                    />
                  )}
                  {stats.performance.avgFcp > 0 && (
                    <PerformanceGauge
                      label="FCP"
                      value={stats.performance.avgFcp}
                      unit="ms"
                      threshold={1800}
                      description="First Contentful Paint"
                    />
                  )}
                  {stats.performance.avgDomLoad > 0 && (
                    <PerformanceGauge
                      label="DOM Load"
                      value={stats.performance.avgDomLoad}
                      unit="ms"
                      threshold={1500}
                      description="DOM Content Loaded"
                    />
                  )}
                  {stats.performance.avgWindowLoad > 0 && (
                    <PerformanceGauge
                      label="Window Load"
                      value={stats.performance.avgWindowLoad}
                      unit="ms"
                      threshold={3000}
                      description="Full Page Load"
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
