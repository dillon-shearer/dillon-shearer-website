'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Props = {
  data: any[]
  dataKey: string
  nameKey: string
  height?: number
}

function ChartTooltip({ active, payload, nameKey, dataKey }: any) {
  if (!active || !payload || !payload.length) return null
  const value = Number(payload[0]?.value ?? 0)
  const name = payload[0]?.payload?.[nameKey]
  return (
    <div className="rounded-lg border border-white/20 shadow-2xl px-3 py-2 text-xs font-semibold bg-black/95 backdrop-blur-sm text-white/90">
      <div className="text-white/60 mb-1 max-w-[200px] truncate">{name}</div>
      <div className="font-mono">{value.toLocaleString()}</div>
    </div>
  )
}

export default function AnalyticsBarChart({ data, dataKey, nameKey, height = 300 }: Props) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, bottom: 60, left: 40 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeOpacity={0.5} />
          <XAxis
            dataKey={nameKey}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            stroke="rgba(255,255,255,0.1)"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
            stroke="rgba(255,255,255,0.1)"
          />
          <Tooltip content={(props) => <ChartTooltip {...props} nameKey={nameKey} dataKey={dataKey} />} />
          <Bar
            dataKey={dataKey}
            fill="#54b3d6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
