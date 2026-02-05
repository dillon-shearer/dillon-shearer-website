'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Props = {
  data: { date: string; views: number }[]
  height?: number
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const views = Number(payload[0]?.value ?? 0)
  const date = payload[0]?.payload?.date
  return (
    <div className="rounded-lg border border-white/20 shadow-2xl px-3 py-2 text-xs font-semibold bg-black/95 backdrop-blur-sm text-white/90">
      <div className="text-white/60 mb-1">{date}</div>
      <div className="font-mono">{views.toLocaleString()} views</div>
    </div>
  )
}

export default function AnalyticsChart({ data, height = 300 }: Props) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 24, left: 40 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
            stroke="rgba(255,255,255,0.1)"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
            stroke="rgba(255,255,255,0.1)"
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#54b3d6', strokeOpacity: 0.3 }} />
          <Line
            type="monotone"
            dataKey="views"
            stroke="#54b3d6"
            strokeWidth={2.5}
            dot={{ fill: '#54b3d6', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
