'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

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
    <div className="rounded-lg border border-[#54b3d6]/30 bg-black/95 backdrop-blur-md shadow-2xl px-3.5 py-2.5 max-w-xs">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1 truncate">{name}</div>
      <div className="text-base font-mono font-bold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}

export default function AnalyticsBarChart({ data, dataKey, nameKey, height = 300 }: Props) {
  // Create gradient colors from most to least visited
  const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey])
  const maxValue = sortedData[0]?.[dataKey] || 1

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, bottom: 60, left: 8 }}>
          <CartesianGrid
            stroke="rgba(255,255,255,0.03)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey={nameKey}
            tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.35)', fontWeight: 600 }}
            stroke="rgba(255,255,255,0.08)"
            angle={-45}
            textAnchor="end"
            height={80}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontWeight: 600 }}
            stroke="rgba(255,255,255,0.08)"
            tickLine={false}
            width={50}
          />
          <Tooltip content={(props) => <ChartTooltip {...props} nameKey={nameKey} dataKey={dataKey} />} />
          <Bar
            dataKey={dataKey}
            radius={[6, 6, 0, 0]}
          >
            {data.map((entry, index) => {
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
  )
}
