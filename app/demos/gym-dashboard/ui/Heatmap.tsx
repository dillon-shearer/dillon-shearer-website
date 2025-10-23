// app/demos/gym-dashboard/ui/Heatmap.tsx
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
  naColor = '#3b4351', // neutral base for 0-volume days
  naOpacity = 0.12,    // make 0-volume days barely visible
  minYearSegWidth = 10 // minimum segment width for YEAR; component will wrap to new rows to respect this
}: {
  data: Cell[]
  mode?: Mode
  height?: number
  gap?: number
  padding?: number
  naColor?: string
  naOpacity?: number
  minYearSegWidth?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState<number>(600) // measured container width

  // === dark tooltip state (cursor-follow) ===
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)

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

  // align length (pad on the left with 0s or take last N)
  const series: Cell[] =
    data.length >= N
      ? data.slice(data.length - N)
      : [
          ...Array.from({ length: N - data.length }, (_, i) => ({
            date: `na-${i}`,
            volume: 0, // treat as NA
          })),
          ...data,
        ]

  // ---------- Color scaling ----------
  // Adaptive thresholds so low-volume days are clearly low, but with a guard for tiny datasets.
  const nonZero = series
    .filter(d => d.volume > 0)
    .map(d => d.volume)
    .sort((a, b) => a - b)

  // Percentile helper
  const quantile = (arr: number[], p: number) => {
    if (!arr.length) return 0
    const idx = (arr.length - 1) * p
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    const h = idx - lo
    return (1 - h) * arr[lo] + h * arr[hi]
  }

  // Guard: with very little data, avoid unfair "low" coloring.
  const singlePointNeutralBucket = 4 // a friendly lime for a lone day

  // Thresholds at 20/40/60/80% — adaptive to your dataset
  const q20 = quantile(nonZero, 0.2)
  const q40 = quantile(nonZero, 0.4)
  const q60 = quantile(nonZero, 0.6)
  const q80 = quantile(nonZero, 0.8)

  // Palette (bad -> good): deep red → red → orange → yellow → green → deep green
  const RAMP = ['#7f1d1d', '#b91c1c', '#dc2626', '#f59e0b', '#10b981', '#059669']

  const isNA = (d: Cell) => d.volume === 0

  const bucketFor = (v: number) => {
    if (nonZero.length <= 1) return singlePointNeutralBucket
    if (v <= q20) return 1
    if (v <= q40) return 2
    if (v <= q60) return 3
    if (v <= q80) return 4
    return 5
  }

  const colorFor = (d: Cell) => (isNA(d) ? naColor : RAMP[bucketFor(d.volume)])
  const opacityFor = (d: Cell) => (isNA(d) ? naOpacity : 1)

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
    <div ref={containerRef} className="w-full relative">
      {/* custom tooltip (matches chart style) */}
      {tip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tip.x + 12, top: tip.y + 12 }}
        >
          <div className="rounded-md border shadow-lg px-3 py-2 text-xs bg-[#1f2937] border-[#374151] text-white">
            {tip.text}
          </div>
        </div>
      )}

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Volume heatmap"
        onMouseLeave={() => setTip(null)}
      >
        {series.map((d, i) => {
          const r = Math.floor(i / cols)
          const c = i % cols
          const x = padding + c * (segW + gap)
          const y = padding + r * (segH + gap)

          const text = isNA(d)
            ? `${d.date} • no sets`
            : `${d.date} • ${d.volume.toLocaleString()} lbs`

          return (
            <g
              key={`${d.date}-${i}`}
              onMouseMove={(e) => {
                setTip({
                  x: e.clientX,
                  y: e.clientY,
                  text,
                })
              }}
            >
              <rect
                x={x}
                y={y}
                width={segW}
                height={segH}
                rx={rx}
                ry={rx}
                fill={colorFor(d)}
                opacity={opacityFor(d)}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
