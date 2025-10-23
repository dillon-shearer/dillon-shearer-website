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
      timestamp
    FROM gym_lifts
    ORDER BY date DESC, exercise ASC, set_number ASC
  `
  return rows as GymLift[]
}

/**
 * Insert a new lift
 */
export async function addGymLift(lift: Omit<GymLift, 'id' | 'timestamp'>) {
  const id = `lift_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const timestamp = new Date().toISOString()

  await sql/* sql */`
    INSERT INTO gym_lifts (id, date, exercise, weight, reps, set_number, timestamp)
    VALUES (${id}, ${lift.date}, ${lift.exercise}, ${lift.weight}, ${lift.reps}, ${lift.setNumber}, ${timestamp})
  `

  const newLift: GymLift = { ...lift, id, timestamp }
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
      date = ${updated.date},
      exercise = ${updated.exercise},
      weight = ${updated.weight},
      reps = ${updated.reps},
      set_number = ${updated.setNumber}
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
      timestamp
    FROM gym_lifts
    ORDER BY date DESC, timestamp DESC
    LIMIT ${limit}
  `
  return rows as GymLift[]
}
