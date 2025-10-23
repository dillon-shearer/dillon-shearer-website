// app/api/gym-data/route.ts
import { NextResponse } from 'next/server'
import { getGymLifts, type GymLift } from '../../demos/gym-dashboard/form/actions'

type OutRow = GymLift & {
  volume: number
  oneRM_est: number
  day_of_week: string
  iso_week: string
  month: string   // YYYY-MM
  year: number
}

function enrich(lifts: GymLift[]): OutRow[] {
  return lifts.map((l) => {
    const d = new Date(l.date + 'T00:00:00Z')
    // day-of-week in UTC (Mon..Sun)
    const dow = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
    // ISO week (rough approach, good enough for download)
    const iso = (() => {
      const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      // Thursday in current week decides the year.
      date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
      const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
    })()
    const month = l.date.slice(0, 7)
    const year = parseInt(l.date.slice(0, 4), 10)
    const volume = l.weight * l.reps
    const oneRM_est = Math.round(l.weight * (1 + l.reps / 30))
    return { ...l, volume, oneRM_est, day_of_week: dow, iso_week: iso, month, year }
  })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') // YYYY-MM-DD (optional)
  const to = searchParams.get('to')     // YYYY-MM-DD (optional)

  let rows = enrich(await getGymLifts())

  if (from) rows = rows.filter(r => r.date >= from)
  if (to)   rows = rows.filter(r => r.date <= to)

  // Download-friendly headers
  return new NextResponse(JSON.stringify({
    meta: {
      count: rows.length,
      generated_at: new Date().toISOString(),
      fields: Object.keys(rows[0] ?? {}),
      filter: { from, to },
      note: 'This is a wide “ML-style” export with raw and derived fields.',
    },
    data: rows,
  }, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="gym-lifts.json"',
      'cache-control': 'no-store',
    },
  })
}
