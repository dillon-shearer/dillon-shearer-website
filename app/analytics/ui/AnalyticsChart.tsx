'use client'

import { memo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'

type Props = {
  data: { date: string; views: number }[]
  height?: number
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const views = Number(payload[0]?.value ?? 0)
  const date = payload[0]?.payload?.date
  return (
    <div className="rounded-lg border border-[#54b3d6]/30 bg-black/95 backdrop-blur-md shadow-2xl px-3.5 py-2.5">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">{date}</div>
      <div className="text-base font-mono font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {views.toLocaleString()}
      </div>
      <div className="text-[10px] text-white/40 mt-0.5">views</div>
    </div>
  )
}

// Memoize to prevent re-renders when data hasn't changed
const AnalyticsChart = memo(function AnalyticsChart({ data, height = 300 }: Props) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 24, left: 8 }}>
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#54b3d6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#54b3d6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="rgba(255,255,255,0.03)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)', fontWeight: 600 }}
            stroke="rgba(255,255,255,0.08)"
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontWeight: 600 }}
            stroke="rgba(255,255,255,0.08)"
            tickLine={false}
            width={50}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#54b3d6', strokeWidth: 1, strokeOpacity: 0.2 }} />
          <Area
            type="monotone"
            dataKey="views"
            stroke="#54b3d6"
            strokeWidth={2}
            fill="url(#viewsGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#54b3d6', stroke: '#000', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
})

export default AnalyticsChart
