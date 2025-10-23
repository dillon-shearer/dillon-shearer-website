'use client'

import { useEffect, useRef, useState } from 'react'

type Mode = 'week' | 'month' | 'year'
type Cell = { date: string; volume: number; label?: string }

export default function Heatmap({
  data,
  mode = 'month',
  height = 120,        // fixed visual height (px) — same box for all modes
  gap = 4,             // px gap between segments
  padding = 12,        // px inner padding
  naColor = '#3b4351', // neutral for "Not Available"
  minYearSegWidth = 10 // minimum segment width for YEAR; component will wrap to new rows to respect this
}: {
  data: Cell[]
  mode?: Mode
  height?: number
  gap?: number
  padding?: number
  naColor?: string
  minYearSegWidth?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState<number>(600) // measured container width

  // responsive: measure container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = entry.contentRect.width
        if (cw > 0) setW(cw)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // how many days should the current mode display?
  const N =
    mode === 'week' ? 7 :
    mode === 'month' ? 30 :
    Math.max(1, data.length) // YTD length supplied by the caller

  // align length (pad on the left with NA or take last N)
  const series: Cell[] =
    data.length >= N
      ? data.slice(data.length - N)
      : [
          ...Array.from({ length: N - data.length }, (_, i) => ({
            date: `na-${i}`,
            volume: 0,
            label: 'Not Available',
          })),
          ...data,
        ]

  // intensity buckets
  const max = Math.max(1, ...series.map(d => d.volume))
  const bucket = (v: number) => Math.min(5, Math.floor((v / max) * 5))
  const colorFor = (d: Cell) => {
    if (d.label === 'Not Available') return naColor
    const idx = bucket(d.volume)
    return ['#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399'][idx] // emerald ramp
  }

  // fixed outer box
  const width = w
  const innerW = Math.max(0, width - padding * 2)
  const innerH = Math.max(0, height - padding * 2)

  // layout:
  // - week/month: single row with N columns
  // - year: wrap into multiple rows so each segment is at least minYearSegWidth wide
  let cols: number
  let rows: number

  if (mode === 'year') {
    // compute max columns we can fit while honoring minYearSegWidth (considering gaps)
    const maxCols = Math.max(
      1,
      Math.floor((innerW + gap) / (minYearSegWidth + gap))
    )
    cols = Math.max(1, Math.min(N, maxCols))
    rows = Math.max(1, Math.ceil(N / cols))
  } else {
    cols = N
    rows = 1
  }

  // recompute actual segment sizes to perfectly tile inner box
  const totalGapX = Math.max(0, (cols - 1) * gap)
  const totalGapY = Math.max(0, (rows - 1) * gap)
  const segW = cols > 0 ? (innerW - totalGapX) / cols : 0
  const segH = rows > 0 ? (innerH - totalGapY) / rows : 0
  const rx = Math.min(6, Math.min(segW, segH) / 4)

  return (
    <div ref={containerRef} className="w-full">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Volume heatmap">
        {series.map((d, i) => {
          const r = Math.floor(i / cols)
          const c = i % cols
          const x = padding + c * (segW + gap)
          const y = padding + r * (segH + gap)
          const title = d.label ? `${d.date} • ${d.label}` : `${d.date} • ${d.volume.toLocaleString()} lbs`
          return (
            <g key={`${d.date}-${i}`}>
              <title>{title}</title>
              <rect x={x} y={y} width={segW} height={segH} rx={rx} ry={rx} fill={colorFor(d)} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
