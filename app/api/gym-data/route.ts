import { NextResponse } from 'next/server'
import { getGymLifts, type GymLift } from '../../demos/gym-dashboard/form/actions'

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') ?? 'unknown'
}

function checkRateLimit(ip: string) {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (bucket && bucket.resetAt > now) {
    if (bucket.count >= RATE_LIMIT_MAX) return false
    bucket.count += 1
    rateBuckets.set(ip, bucket)
    return true
  }
  rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  return true
}

function extractToken(req: Request, searchParams: URLSearchParams) {
  const queryToken = searchParams.get('key') || searchParams.get('token')
  if (queryToken) return queryToken
  const headerToken = req.headers.get('x-lift-token')
  if (headerToken) return headerToken
  const authHeader = req.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim()
  }
  return null
}

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
    // ISO week (approx)
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const day = searchParams.get('day')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1)
  const limitParam = parseInt(searchParams.get('limit') || '200', 10)
  const limit = Math.min(Math.max(limitParam || 200, 1), 500)
  const exclude = (searchParams.get('exclude') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const password = process.env.LIFT_PASSWORD
  if (!password) {
    console.error('LIFT_PASSWORD is not defined')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const token = extractToken(req, searchParams)
  if (token !== password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = getClientIp(req)
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let rows = enrich(await getGymLifts())

  if (day) {
    rows = rows.filter(r => r.date === day)
  } else {
    if (from) rows = rows.filter(r => r.date >= from)
    if (to)   rows = rows.filter(r => r.date <= to)
  }

  if (exclude.length && rows.length) {
    rows = rows.map(r => {
      const copy: any = { ...r }
      for (const key of exclude) delete copy[key as keyof OutRow]
      return copy
    })
  }

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  const pagedRows = rows.slice(start, start + limit)

  return new NextResponse(JSON.stringify({
    meta: {
      count: pagedRows.length,
      total_count: total,
      page,
      total_pages: totalPages,
      generated_at: new Date().toISOString(),
      fields: Object.keys(pagedRows[0] ?? {}),
      filter: day ? { day } : { from, to },
      note: 'Wide export with raw + derived fields (includes dayTag, isUnilateral, equipment; excludes bodyParts).',
    },
    data: pagedRows,
  }, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${day ? `gym-lifts-${day}` : 'gym-lifts'}.json"`,
      'cache-control': 'private, max-age=0, must-revalidate',
      'x-ratelimit-limit': RATE_LIMIT_MAX.toString(),
      'x-ratelimit-remaining': Math.max(RATE_LIMIT_MAX - (rateBuckets.get(ip)?.count ?? 0), 0).toString(),
    },
  })
}
