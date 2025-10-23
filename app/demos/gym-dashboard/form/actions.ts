// app/demos/gym-dashboard/form/actions.ts
'use server'

import { sql } from '@vercel/postgres'

export interface GymLift {
  id: string
  date: string
  exercise: string
  weight: number
  reps: number
  setNumber: number
  timestamp: string
  dayTag?: string | null
  isUnilateral?: boolean | null
  equipment?: string | null            // NEW
}

export interface GymDayMeta {
  date: string
  dayTag: string | null
  bodyParts: string[] | null
  updatedAt: string
}

/** Server-side canonical defaults for recognized day tags. */
const DAYTAG_DEFAULTS_SERVER: Record<string, string[]> = {
  'push day': ['chest', 'biceps', 'shoulders'],
  'pull day': ['back', 'triceps', 'core'],
  'leg day':  ['quads', 'hamstrings', 'hips', 'glutes', 'calves'],
}

/** Postgres text[] literal from string[], or null */
function toPgTextArrayLiteral(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return null
  const cleaned = arr.map(s => s.trim().toLowerCase().replace(/[{}"]/g, '')).filter(Boolean)
  if (cleaned.length === 0) return null
  return `{${cleaned.join(',')}}`
}

/** Fetch all lifts */
export async function getGymLifts(): Promise<GymLift[]> {
  const { rows } = await sql/* sql */`
    SELECT
      id,
      date,
      exercise,
      weight,
      reps,
      set_number AS "setNumber",
      timestamp,
      day_tag AS "dayTag",
      is_unilateral AS "isUnilateral",
      equipment AS "equipment"          -- NEW
    FROM gym_lifts
    ORDER BY date DESC, exercise ASC, set_number ASC
  `
  return rows as GymLift[]
}

/** Distinct day tags */
export async function getDayTags(): Promise<string[]> {
  const { rows } = await sql/* sql */`
    SELECT DISTINCT day_tag AS "dayTag"
    FROM gym_lifts
    WHERE day_tag IS NOT NULL AND day_tag <> ''
    ORDER BY "dayTag" ASC
  `
  return rows.map(r => r.dayTag as string)
}

/** Get day tag for a date */
export async function getDayTagForDate(date: string): Promise<string | null> {
  const meta = await sql/* sql */`
    SELECT day_tag AS "dayTag"
    FROM gym_day_meta
    WHERE date = ${date}::date
    LIMIT 1
  `
  if (meta.rows[0]?.dayTag) return meta.rows[0].dayTag as string

  const { rows } = await sql/* sql */`
    SELECT day_tag AS "dayTag"
    FROM gym_lifts
    WHERE date = ${date}::date AND day_tag IS NOT NULL AND day_tag <> ''
    LIMIT 1
  `
  return (rows[0]?.dayTag as string | undefined) ?? null
}

/** Get body parts for a date */
export async function getBodyPartsForDate(date: string): Promise<string[]> {
  const { rows } = await sql/* sql */`
    SELECT body_parts AS "bodyParts"
    FROM gym_day_meta
    WHERE date = ${date}::date
    LIMIT 1
  `
  const val = rows[0]?.bodyParts as unknown
  if (!val) return []
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return []
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s)
        return Array.isArray(parsed) ? parsed.map(String) : []
      } catch { return [] }
    }
    const inner = s.startsWith('{') && s.endsWith('}') ? s.slice(1, -1) : s
    return inner ? inner.split(',').map(x => x.trim()).filter(Boolean) : []
  }
  return []
}

/** Set body parts for a date */
export async function setBodyPartsForDate(date: string, parts: string[] | null) {
  const lit = toPgTextArrayLiteral(parts)
  if (lit) {
    await sql/* sql */`
      INSERT INTO gym_day_meta (date, body_parts, updated_at)
      VALUES (${date}::date, ${lit}::text[], NOW())
      ON CONFLICT (date) DO UPDATE SET
        body_parts = ${lit}::text[],
        updated_at = NOW()
    `
  } else {
    await sql/* sql */`
      INSERT INTO gym_day_meta (date, body_parts, updated_at)
      VALUES (${date}::date, NULL, NOW())
      ON CONFLICT (date) DO UPDATE SET
        body_parts = NULL,
        updated_at = NOW()
    `
  }
  return { success: true }
}

/** Set/replace day tag for a date and optionally backfill defaults */
export async function setDayTagForDate(date: string, tag: string | null) {
  const normalized = (tag ?? '').trim().toLowerCase()
  const defaults = normalized && DAYTAG_DEFAULTS_SERVER[normalized] ? DAYTAG_DEFAULTS_SERVER[normalized] : null

  await sql/* sql */`
    INSERT INTO gym_day_meta (date, day_tag, updated_at)
    VALUES (${date}::date, ${tag}, NOW())
    ON CONFLICT (date) DO UPDATE SET
      day_tag = ${tag},
      updated_at = NOW()
  `

  if (defaults && defaults.length) {
    const existing = await sql/* sql */`
      SELECT body_parts
      FROM gym_day_meta
      WHERE date = ${date}::date
      LIMIT 1
    `
    const hasBodyParts = !!existing.rows[0]?.body_parts
    if (!hasBodyParts) {
      const lit = toPgTextArrayLiteral(defaults)!
      await sql/* sql */`
        UPDATE gym_day_meta
        SET body_parts = ${lit}::text[]
        WHERE date = ${date}::date
      `
    }
  }

  await sql/* sql */`
    UPDATE gym_lifts
    SET day_tag = ${tag}
    WHERE date = ${date}::date
  `
  return { success: true }
}

/** Insert a new lift (now includes equipment) */
export async function addGymLift(lift: Omit<GymLift, 'id' | 'timestamp'>) {
  const id = `lift_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const timestamp = new Date().toISOString()

  // Coerce & sanitize
  const date = String(lift.date)
  const exercise = String(lift.exercise).trim()
  const weight = Number(lift.weight)
  const reps = Number(lift.reps)
  const setNumber = Number(lift.setNumber)
  const isUnilateral = lift.isUnilateral === undefined ? null : Boolean(lift.isUnilateral)
  const equipment = (lift.equipment ?? '').toString().trim() || null
  let tagToUse = (lift.dayTag ?? '').trim()

  if (!tagToUse) {
    const inherited = await getDayTagForDate(date)
    if (inherited) tagToUse = inherited
  }

  // Ensure meta row / defaults as before
  if (tagToUse) {
    const normalized = tagToUse.trim().toLowerCase()
    const defaults = DAYTAG_DEFAULTS_SERVER[normalized] ?? null

    await sql/* sql */`
      INSERT INTO gym_day_meta (date, day_tag, updated_at)
      VALUES (${date}::date, ${tagToUse}, NOW())
      ON CONFLICT (date) DO UPDATE SET
        day_tag = COALESCE(EXCLUDED.day_tag, gym_day_meta.day_tag),
        updated_at = NOW()
    `

    if (defaults && defaults.length) {
      const meta = await sql/* sql */`
        SELECT body_parts
        FROM gym_day_meta
        WHERE date = ${date}::date
        LIMIT 1
      `
      const hasBodyParts = !!meta.rows[0]?.body_parts
      if (!hasBodyParts) {
        const lit = toPgTextArrayLiteral(defaults)!
        await sql/* sql */`
          UPDATE gym_day_meta
          SET body_parts = ${lit}::text[]
          WHERE date = ${date}::date
        `
      }
    }
  }

  await sql/* sql */`
    INSERT INTO gym_lifts (
      id, date, exercise, weight, reps, set_number, timestamp, day_tag, is_unilateral, equipment
    )
    VALUES (
      ${id},
      ${date}::date,
      ${exercise},
      ${weight}::numeric,
      ${reps}::int,
      ${setNumber}::int,
      ${timestamp},
      ${tagToUse || null},
      ${isUnilateral}::boolean,
      ${equipment}::text
    )
  `

  const newLift: GymLift = {
    id,
    date,
    exercise,
    weight,
    reps,
    setNumber,
    timestamp,
    dayTag: tagToUse || null,
    isUnilateral,
    equipment,
  }
  return { success: true, data: newLift }
}

/** Delete a lift */
export async function deleteGymLift(id: string) {
  await sql/* sql */`DELETE FROM gym_lifts WHERE id = ${id}`
  return { success: true }
}

/** Update a lift (casts applied; includes equipment) */
export async function updateGymLift(
  id: string,
  updated: Omit<GymLift, 'id' | 'timestamp'>
) {
  const weight = Number(updated.weight)
  const reps = Number(updated.reps)
  const setNumber = Number(updated.setNumber)
  const isUnilateral = updated.isUnilateral === undefined ? null : Boolean(updated.isUnilateral)
  const equipment = (updated.equipment ?? '').toString().trim() || null

  await sql/* sql */`
    UPDATE gym_lifts
    SET
      date = ${updated.date}::date,
      exercise = ${updated.exercise},
      weight = ${weight}::numeric,
      reps = ${reps}::int,
      set_number = ${setNumber}::int,
      day_tag = ${updated.dayTag ?? null},
      is_unilateral = ${isUnilateral}::boolean,
      equipment = ${equipment}::text
    WHERE id = ${id}
  `
  return { success: true }
}

/** Recent lifts (include equipment) */
export async function getRecentLifts(limit: number = 10): Promise<GymLift[]> {
  const { rows } = await sql/* sql */`
    SELECT
      id,
      date,
      exercise,
      weight,
      reps,
      set_number AS "setNumber",
      timestamp,
      day_tag AS "dayTag",
      is_unilateral AS "isUnilateral",
      equipment AS "equipment"
    FROM gym_lifts
    ORDER BY date DESC, timestamp DESC
    LIMIT ${limit}
  `
  return rows as GymLift[]
}
