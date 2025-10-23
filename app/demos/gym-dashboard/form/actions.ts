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

/**
 * Convert a string[] to a Postgres text[] array literal string.
 * We only ever store simple, lowercase tokens (no commas/braces/quotes),
 * so we can safely join with commas. Returns null when no items.
 * Example: ['quads','glutes'] -> '{quads,glutes}'
 */
function toPgTextArrayLiteral(arr: string[] | null | undefined): string | null {
  if (!arr || arr.length === 0) return null
  // sanitize defensively even though our tokens are simple
  const cleaned = arr.map(s => s.trim().toLowerCase().replace(/[{}"]/g, '')).filter(Boolean)
  if (cleaned.length === 0) return null
  return `{${cleaned.join(',')}}`
}

/**
 * Fetch all lifts (sorted newest date first, then exercise, then setNumber)
 */
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
      is_unilateral AS "isUnilateral"
    FROM gym_lifts
    ORDER BY date DESC, exercise ASC, set_number ASC
  `
  return rows as GymLift[]
}

/**
 * Distinct day tags (for smart typing suggestions)
 */
export async function getDayTags(): Promise<string[]> {
  const { rows } = await sql/* sql */`
    SELECT DISTINCT day_tag AS "dayTag"
    FROM gym_lifts
    WHERE day_tag IS NOT NULL AND day_tag <> ''
    ORDER BY "dayTag" ASC
  `
  return rows.map(r => r.dayTag as string)
}

/**
 * Get the day tag assigned to a specific date (canonical: gym_day_meta; fallback: lifts)
 */
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

/**
 * Get body parts for a date (from gym_day_meta)
 */
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
    // Handles '{a,b}' or '["a","b"]'
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

/**
 * Set body parts for a date (upsert into gym_day_meta)
 */
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
    // Explicitly set to NULL when no parts provided
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

/**
 * Set/replace the day tag for a date (upsert meta + sync onto lifts for compatibility)
 * Also: if body_parts is currently NULL for that date and the tag is recognized,
 * initialize body_parts to the defaults for that day tag.
 */
export async function setDayTagForDate(date: string, tag: string | null) {
  const normalized = (tag ?? '').trim().toLowerCase()
  const defaults = normalized && DAYTAG_DEFAULTS_SERVER[normalized] ? DAYTAG_DEFAULTS_SERVER[normalized] : null

  // Upsert day_tag
  await sql/* sql */`
    INSERT INTO gym_day_meta (date, day_tag, updated_at)
    VALUES (${date}::date, ${tag}, NOW())
    ON CONFLICT (date) DO UPDATE SET
      day_tag = ${tag},
      updated_at = NOW()
  `

  // If body_parts is null, set defaults (do not overwrite if already set)
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

  // Keep legacy column in sync for existing rows
  await sql/* sql */`
    UPDATE gym_lifts
    SET day_tag = ${tag}
    WHERE date = ${date}::date
  `
  return { success: true }
}

/**
 * Insert a new lift
 * - If dayTag is empty/null, inherit the day's existing tag automatically.
 * - Also ensure gym_day_meta exists; if it exists but body_parts is NULL and tag is recognized,
 *   backfill body_parts with defaults.
 */
export async function addGymLift(lift: Omit<GymLift, 'id' | 'timestamp'>) {
  const id = `lift_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const timestamp = new Date().toISOString()

  let tagToUse = (lift.dayTag ?? '').trim()
  if (!tagToUse) {
    const inherited = await getDayTagForDate(lift.date)
    if (inherited) tagToUse = inherited
  }

  // Ensure gym_day_meta row (day_tag) and possibly body_parts defaults
  if (tagToUse) {
    const normalized = tagToUse.trim().toLowerCase()
    const defaults = DAYTAG_DEFAULTS_SERVER[normalized] ?? null

    // Upsert meta row with day_tag
    await sql/* sql */`
      INSERT INTO gym_day_meta (date, day_tag, updated_at)
      VALUES (${lift.date}::date, ${tagToUse}, NOW())
      ON CONFLICT (date) DO UPDATE SET
        day_tag = COALESCE(EXCLUDED.day_tag, gym_day_meta.day_tag),
        updated_at = NOW()
    `

    // Backfill body_parts if missing and defaults exist
    if (defaults && defaults.length) {
      const meta = await sql/* sql */`
        SELECT body_parts
        FROM gym_day_meta
        WHERE date = ${lift.date}::date
        LIMIT 1
      `
      const hasBodyParts = !!meta.rows[0]?.body_parts
      if (!hasBodyParts) {
        const lit = toPgTextArrayLiteral(defaults)!
        await sql/* sql */`
          UPDATE gym_day_meta
          SET body_parts = ${lit}::text[]
          WHERE date = ${lift.date}::date
        `
      }
    }
  }

  await sql/* sql */`
    INSERT INTO gym_lifts (
      id, date, exercise, weight, reps, set_number, timestamp, day_tag, is_unilateral
    )
    VALUES (
      ${id}, ${lift.date}::date, ${lift.exercise}, ${lift.reps}, ${lift.reps},
      ${lift.setNumber}, ${timestamp}, ${tagToUse || null}, ${lift.isUnilateral ?? null}
    )
  `

  const newLift: GymLift = { ...lift, id, timestamp, dayTag: tagToUse || null }
  return { success: true, data: newLift }
}

/**
 * Delete a lift by id
 */
export async function deleteGymLift(id: string) {
  await sql/* sql */`DELETE FROM gym_lifts WHERE id = ${id}`
  return { success: true }
}

/**
 * Update a lift by id (keeps original timestamp)
 */
export async function updateGymLift(
  id: string,
  updated: Omit<GymLift, 'id' | 'timestamp'>
) {
  await sql/* sql */`
    UPDATE gym_lifts
    SET
      date = ${updated.date}::date,
      exercise = ${updated.exercise},
      weight = ${updated.weight},
      reps = ${updated.reps},
      set_number = ${updated.setNumber},
      day_tag = ${updated.dayTag ?? null},
      is_unilateral = ${updated.isUnilateral ?? null}
    WHERE id = ${id}
  `
  return { success: true }
}

/**
 * Get recent lifts (limit N)
 */
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
      is_unilateral AS "isUnilateral"
    FROM gym_lifts
    ORDER BY date DESC, timestamp DESC
    LIMIT ${limit}
  `
  return rows as GymLift[]
}
