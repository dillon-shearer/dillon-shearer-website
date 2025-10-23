// app/api/gym-data.csv/route.ts
import { NextResponse } from 'next/server'
import { getGymLifts, type GymLift } from '../../demos/gym-dashboard/form/actions'

// Keep the enrichment identical to JSON route
type OutRow = GymLift & {
  volume: number
  oneRM_est: number
  day_of_week: string
  iso_week: string
  month: string
  year: number
}

function enrich(lifts: GymLift[]): OutRow[] {
  return lifts.map((l) => {
    const d = new Date(l.date + 'T00:00:00Z')
    const dow = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
    const iso = (() => {
      const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
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

// very small CSV helper
const csvEscape = (v: unknown) => {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let rows = enrich(await getGymLifts())
  if (from) rows = rows.filter(r => r.date >= from)
  if (to)   rows = rows.filter(r => r.date <= to)

  const headers = rows[0] ? Object.keys(rows[0]) : [
    'id','date','exercise','weight','reps','setNumber','timestamp',
    'volume','oneRM_est','day_of_week','iso_week','month','year'
  ]
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => csvEscape((r as any)[h])).join(',')),
  ]
  const csv = lines.join('\n')

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="gym-lifts.csv"',
      'cache-control': 'no-store',
    },
  })
}
