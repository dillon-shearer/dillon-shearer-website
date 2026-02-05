'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { useState, useEffect, memo } from 'react'

type Props = {
  data: any[]
  dataKey: string
  nameKey: string
  height?: number
  scrollable?: boolean
}

function ChartTooltip({ active, payload, nameKey, dataKey }: any) {
  if (!active || !payload || !payload.length) return null
  const value = Number(payload[0]?.value ?? 0)
  const name = payload[0]?.payload?.[nameKey]
  return (
    <div className="rounded-lg border border-[#54b3d6]/30 bg-black/95 backdrop-blur-md shadow-2xl px-3.5 py-2.5 max-w-xs">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1 break-words">{name}</div>
      <div className="text-base font-mono font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}

// Truncate labels intelligently for mobile
function truncateLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) return label

  // For URLs, keep domain and show path truncation
  if (label.startsWith('http')) {
    try {
      const url = new URL(label)
      const domain = url.hostname.replace('www.', '')
      if (domain.length > maxLength) return domain.slice(0, maxLength - 3) + '...'
      return domain
    } catch {
      return label.slice(0, maxLength - 3) + '...'
    }
  }

  // For paths, show ending
  if (label.startsWith('/')) {
    const parts = label.split('/')
    if (parts.length > 2) return '.../' + parts[parts.length - 1]
  }

  return label.slice(0, maxLength - 3) + '...'
}

// Memoize to prevent re-renders when data hasn't changed
const AnalyticsBarChart = memo(function AnalyticsBarChart({ data, dataKey, nameKey, height = 300, scrollable = false }: Props) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Create gradient colors from most to least visited
  const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey])
  const maxValue = sortedData[0]?.[dataKey] || 1

  // For scrollable mode (All Pages), show only top items and add scroll
  const displayData = scrollable && data.length > 10 ? data.slice(0, 10) : data
  const hasMore = scrollable && data.length > 10

  // Custom tick for X-axis with intelligent truncation
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props
    const label = truncateLabel(payload.value, isMobile ? 15 : 30)

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={8}
          textAnchor="end"
          fill="rgba(255,255,255,0.35)"
          fontSize={isMobile ? 8 : 9}
          fontWeight={600}
          transform="rotate(-45)"
        >
          {label}
        </text>
      </g>
    )
  }

  return (
    <div className="w-full">
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} margin={{ top: 10, right: isMobile ? 8 : 16, bottom: 60, left: isMobile ? 4 : 8 }}>
            <CartesianGrid
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey={nameKey}
              tick={<CustomXAxisTick />}
              stroke="rgba(255,255,255,0.08)"
              height={80}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: isMobile ? 9 : 10, fill: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontWeight: 600 }}
              stroke="rgba(255,255,255,0.08)"
              tickLine={false}
              width={isMobile ? 35 : 50}
            />
            <Tooltip content={(props) => <ChartTooltip {...props} nameKey={nameKey} dataKey={dataKey} />} />
            <Bar
              dataKey={dataKey}
              radius={[6, 6, 0, 0]}
            >
              {displayData.map((entry, index) => {
                const opacity = 0.4 + (entry[dataKey] / maxValue) * 0.6
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`rgba(84, 179, 214, ${opacity})`}
                  />
                )
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {hasMore && (
        <div className="text-center mt-3 text-xs text-white/40">
          Showing top 10 of {data.length} pages
        </div>
      )}
    </div>
  )
})

export default AnalyticsBarChart
