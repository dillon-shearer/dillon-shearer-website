// app/demos/gym-dashboard/catalog.ts
'use server'

import { sql } from '@vercel/postgres'

export type BodyPartKey =
  | 'biceps' | 'chest' | 'shoulders' | 'back' | 'triceps'
  | 'quads' | 'hamstrings' | 'forearms' | 'core'
  | 'glutes' | 'calves' | 'hips'

export interface BodyPartRow {
  key: BodyPartKey
  label: string
}

export interface Exercise {
  id: string
  name: string
  bodyPartKey: BodyPartKey | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const clean = (s: string) => s.normalize('NFKC').trim()
const toLower = (s: string) => clean(s).toLowerCase()

export async function listBodyParts(): Promise<BodyPartRow[]> {
  const { rows } = await sql/* sql */`
    SELECT key, label
    FROM body_parts
    ORDER BY label ASC
  `
  return rows as BodyPartRow[]
}

export async function listExercises(): Promise<Exercise[]> {
  const { rows } = await sql/* sql */`
    SELECT
      id,
      name,
      body_part_key AS "bodyPartKey",
      is_active     AS "isActive",
      created_at    AS "createdAt",
      updated_at    AS "updatedAt"
    FROM exercises
    WHERE is_active = TRUE
    ORDER BY LOWER(name) ASC
  `
  return rows as Exercise[]
}

export async function listExercisesForParts(parts: BodyPartKey[]): Promise<Exercise[]> {
  if (!parts?.length) return listExercises()

  // Old @vercel/postgres: no sql.array/join — pass array param and cast in SQL.
  const partsParam = parts as unknown as any

  const { rows } = await sql/* sql */`
    SELECT
      id,
      name,
      body_part_key AS "bodyPartKey",
      is_active     AS "isActive",
      created_at    AS "createdAt",
      updated_at    AS "updatedAt"
    FROM exercises
    WHERE is_active = TRUE
      AND body_part_key = ANY(${partsParam}::text[])
    ORDER BY LOWER(name) ASC
  `
  return rows as Exercise[]
}

export async function upsertExercise(input: {
  id?: string
  name: string
  bodyPartKey: BodyPartKey | null
  aliases?: string[]
  isActive?: boolean
}): Promise<{ success: true; id: string }> {
  const name = clean(input.name)
  if (!name) throw new Error('Exercise name is required.')

  const bp = input.bodyPartKey ?? null
  const isActive = input.isActive ?? true
  let id = input.id ?? null

  if (id) {
    await sql/* sql */`
      UPDATE exercises
      SET
        name = ${name},
        body_part_key = ${bp},
        is_active = ${isActive},
        updated_at = NOW()
      WHERE id = ${id}
    `
  } else {
    const { rows } = await sql/* sql */`
      INSERT INTO exercises (name, body_part_key, is_active)
      VALUES (${name}, ${bp}, ${isActive})
      ON CONFLICT (name) DO UPDATE SET
        body_part_key = EXCLUDED.body_part_key,
        is_active     = EXCLUDED.is_active,
        updated_at    = NOW()
      RETURNING id
    `
    id = rows[0]?.id as string
  }

  if (id && input.aliases?.length) {
    for (const raw of input.aliases) {
      const alias = clean(raw)
      if (!alias) continue
      await sql/* sql */`
        INSERT INTO exercise_aliases (exercise_id, alias)
        VALUES (${id}, ${alias})
        ON CONFLICT (alias) DO NOTHING
      `
    }
  }

  return { success: true, id: id! }
}

export async function softDeleteExercise(id: string): Promise<{ success: true }> {
  await sql/* sql */`
    UPDATE exercises
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = ${id}
  `
  return { success: true }
}

export async function addExerciseAlias(exerciseId: string, alias: string): Promise<{ success: true }> {
  const a = clean(alias)
  if (!a) throw new Error('Alias is required.')
  await sql/* sql */`
    INSERT INTO exercise_aliases (exercise_id, alias)
    VALUES (${exerciseId}, ${a})
    ON CONFLICT (alias) DO NOTHING
  `
  return { success: true }
}

export async function removeExerciseAlias(alias: string): Promise<{ success: true }> {
  const a = clean(alias)
  if (!a) return { success: true }
  await sql/* sql */`
    DELETE FROM exercise_aliases
    WHERE LOWER(alias) = ${toLower(a)}
  `
  return { success: true }
}

export async function bodyPartForExerciseName(name: string): Promise<BodyPartKey | null> {
  const n = clean(name)
  if (!n) return null

  const { rows } = await sql/* sql */`
    SELECT e.body_part_key AS "bodyPartKey"
    FROM exercises e
    WHERE LOWER(e.name) = ${toLower(n)}
    UNION
    SELECT e.body_part_key AS "bodyPartKey"
    FROM exercise_aliases a
    JOIN exercises e ON a.exercise_id = e.id
    WHERE LOWER(a.alias) = ${toLower(n)}
    LIMIT 1
  `
  return (rows[0]?.bodyPartKey as BodyPartKey) ?? null
}
