// app/demos/gym-dashboard/ui/Heatmap.tsx
'use client'

import { useLayoutEffect, useRef, useState } from 'react'

type Mode = 'week' | 'month' | 'year'
type Cell = { date: string; volume: number; label?: string }

export default function Heatmap({
  data,
  mode = 'month',
  height = 120,        // used when autoGrow = false AND fillParent = false
  gap = 4,
  padding = 12,
  naColor = '#3b4351',
  naOpacity = 0.12,
  minYearSegWidth = 10,
  autoGrow = true,     // grow vertically based on segment size (ignored if fillParent)
  fillParent = true,   // stretch SVG to fill parent's height
  highIsGreen = true,  // <<< flip control: true => high volume = green; false => high = red
}: {
  data: Cell[]
  mode?: Mode
  height?: number
  gap?: number
  padding?: number
  naColor?: string
  naOpacity?: number
  minYearSegWidth?: number
  autoGrow?: boolean
  fillParent?: boolean
  highIsGreen?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [w, setW] = useState<number>(0) // measured container width
  const [h, setH] = useState<number>(0) // measured container height

  // Measure on mount + on resize
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0) setW(rect.width)
      if (rect.height > 0) setH(rect.height)
    }

    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    window.addEventListener('resize', measure)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // how many days to display for the mode?
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
            volume: 0,
          })),
          ...data,
        ]

  // ---------- Color scaling ----------
  const nonZero = series
    .filter(d => d.volume > 0)
    .map(d => d.volume)
    .sort((a, b) => a - b)

  const quantile = (arr: number[], p: number) => {
    if (!arr.length) return 0
    const idx = (arr.length - 1) * p
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    const t = idx - lo
    return (1 - t) * arr[lo] + t * arr[hi]
  }

  const singlePointNeutralBucket = 4 // center-ish (greenish when highIsGreen=true)
  const q20 = quantile(nonZero, 0.2)
  const q40 = quantile(nonZero, 0.4)
  const q60 = quantile(nonZero, 0.6)
  const q80 = quantile(nonZero, 0.8)

  // Palettes:
  // index 0..5 — increasing "intensity"
  const PALETTE_LOW_RED_HIGH_GREEN = ['#7f1d1d', '#b91c1c', '#dc2626', '#f59e0b', '#10b981', '#059669']
  const PALETTE_LOW_GREEN_HIGH_RED = [...PALETTE_LOW_RED_HIGH_GREEN].reverse()

  const isNA = (d: Cell) => d.volume === 0
  const bucketFor = (v: number) => {
    if (nonZero.length <= 1) return singlePointNeutralBucket
    if (v <= q20) return 1
    if (v <= q40) return 2
    if (v <= q60) return 3
    if (v <= q80) return 4
    return 5
  }

  const colorFor = (d: Cell) => {
    if (isNA(d)) return naColor
    const palette = highIsGreen ? PALETTE_LOW_RED_HIGH_GREEN : PALETTE_LOW_GREEN_HIGH_RED
    return palette[bucketFor(d.volume)]
  }
  const opacityFor = (d: Cell) => (isNA(d) ? naOpacity : 1)

  // Outer dimensions from container
  const width = Math.max(1, w)
  const heightFromParent = Math.max(1, h)
  const innerW = Math.max(0, width - padding * 2)

  // layout:
  // - week/month: single row with N columns
  // - year: wrap into multiple rows so each segment is at least minYearSegWidth wide
  let cols: number
  let rows: number

  if (mode === 'year') {
    const maxCols = Math.max(1, Math.floor((innerW + gap) / (minYearSegWidth + gap)))
    cols = Math.max(1, Math.min(N, maxCols))
    rows = Math.max(1, Math.ceil(N / cols))
  } else {
    cols = N
    rows = 1
  }

  // Calculate segment sizes
  const totalGapX = Math.max(0, (cols - 1) * gap)
  const segW = cols > 0 ? (innerW - totalGapX) / cols : 0

  // Decide final height and segment height
  let computedHeight = height
  const totalGapY = Math.max(0, (rows - 1) * gap)
  let segH: number

  if (fillParent && heightFromParent > 0) {
    // FILL STRATEGY: compute segH so that the SVG fills the parent height
    const innerH = Math.max(0, heightFromParent - padding * 2)
    segH = rows > 0 ? (innerH - totalGapY) / rows : 0
    computedHeight = heightFromParent
  } else if (autoGrow) {
    // Auto size based on segW (old behavior)
    const targetSegH =
      mode === 'week' ? Math.min(segW, 36) :
      mode === 'month' ? Math.min(segW, 26) :
      Math.min(segW * 0.85, 28)

    segH = Math.max(8, targetSegH)
    computedHeight = Math.ceil(padding * 2 + rows * segH + totalGapY)
  } else {
    const innerH = Math.max(0, height - padding * 2)
    segH = rows > 0 ? (innerH - totalGapY) / rows : 0
  }

  const rx = Math.min(6, Math.min(segW, segH) / 4)

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        width={width}
        height={computedHeight}
        viewBox={`0 0 ${width} ${computedHeight}`}
        role="img"
        aria-label="Volume heatmap"
        className="block"
      >
        {series.map((d, i) => {
          const r = Math.floor(i / cols)
          const c = i % cols
          const x = padding + c * (segW + gap)
          const y = padding + r * (segH + gap)
          return (
            <rect
              key={`${d.date}-${i}`}
              x={x}
              y={y}
              width={segW}
              height={segH}
              rx={rx}
              ry={rx}
              fill={colorFor(d)}
              opacity={opacityFor(d)}
            />
          )
        })}
      </svg>
    </div>
  )
}
