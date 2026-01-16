import type { TargetMuscleConstraint, WorkoutPlanAnalysisMeta } from '@/types/gym-chat'
import type { SetsBaseCte } from './sql-builders'

const STRICT_KEYWORDS = /\b(only|just|solely|nothing but|purely|exclusively)\b/i
const EXCLUDE_KEYWORDS = ['no', 'not', 'without', 'exclude', 'skip']
const HISTORY_KEYWORDS =
  /\b(use|using|based on|from)\s+(my|our)?\s*(previous|past|last|recent|logged)?\s*(lifts|workouts|sets|logs|history)\b/i
const GOAL_KEYWORDS = {
  strength: ['strength', 'power', 'max strength', 'heavy'],
  hypertrophy: ['hypertrophy', 'muscle', 'size', 'mass', 'gain muscle'],
  endurance: ['endurance', 'conditioning', 'stamina', 'work capacity'],
}

const MUSCLE_ALIASES: Record<string, string[]> = {
  quads: ['quad', 'quads', 'quadricep', 'quadriceps'],
  hamstrings: ['hamstring', 'hamstrings'],
  glutes: ['glute', 'glutes'],
  calves: ['calf', 'calves', 'soleus'],
  hips: ['hip', 'hips', 'abductor', 'adductor'],
  core: ['core', 'abs', 'abdominals', 'ab'],
  chest: ['chest', 'pec', 'pecs', 'pectoral', 'pectorals'],
  back: ['back', 'lats', 'lat'],
  shoulders: ['shoulder', 'shoulders', 'delt', 'delts', 'deltoid', 'deltoids'],
  biceps: ['bicep', 'biceps'],
  triceps: ['tricep', 'triceps'],
  forearms: ['forearm', 'forearms'],
}

const EXERCISE_KEYWORDS: Record<string, string[]> = {
  quads: [
    'squat',
    'front squat',
    'hack squat',
    'belt squat',
    'leg press',
    'leg extension',
    'split squat',
    'bulgarian',
    'lunge',
    'step up',
    'sissy squat',
  ],
  hamstrings: [
    'hamstring',
    'leg curl',
    'seated curl',
    'lying curl',
    'romanian deadlift',
    'rdl',
    'stiff leg',
    'good morning',
    'glute ham',
    'nordic',
  ],
  glutes: ['glute', 'hip thrust', 'glute bridge', 'kickback', 'pull through', 'hip extension', 'frog pump'],
  calves: ['calf', 'soleus'],
  hips: ['abductor', 'adductor', 'hip abduction', 'hip adduction'],
  core: ['plank', 'crunch', 'sit up', 'sit-up', 'hanging leg raise', 'leg raise', 'ab wheel', 'ab rollout', 'core'],
  chest: ['bench', 'chest', 'pec', 'fly', 'incline press', 'decline press'],
  back: ['row', 'pull up', 'pull-up', 'pulldown', 'lat', 'deadlift'],
  shoulders: ['overhead press', 'shoulder press', 'lateral raise', 'rear delt', 'upright row'],
  biceps: ['curl', 'bicep'],
  triceps: ['tricep', 'pushdown', 'skullcrusher', 'extension', 'dip'],
  forearms: ['forearm', 'wrist curl', 'grip'],
}

const MUSCLE_PRIORITY: string[] = [
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'hips',
  'core',
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
]

const normalizeText = (value: string) => value.toLowerCase()

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const normalizeMuscleName = (value: string): string | null => {
  const normalized = normalizeText(value)
  for (const [muscle, aliases] of Object.entries(MUSCLE_ALIASES)) {
    if (aliases.some(alias => normalized === alias)) {
      return muscle
    }
  }
  if (normalized in MUSCLE_ALIASES) {
    return normalized
  }
  return null
}

const extractMuscleMentions = (text: string) => {
  const normalized = normalizeText(text)
  const found = new Set<string>()
  for (const [muscle, aliases] of Object.entries(MUSCLE_ALIASES)) {
    const pattern = new RegExp(`\\b(${aliases.map(escapeRegex).join('|')})\\b`, 'i')
    if (pattern.test(normalized)) {
      found.add(muscle)
    }
  }
  return Array.from(found)
}

const extractExcludedMuscles = (text: string) => {
  const normalized = normalizeText(text)
  const found = new Set<string>()
  const keywordPattern = EXCLUDE_KEYWORDS.map(escapeRegex).join('|')
  for (const [muscle, aliases] of Object.entries(MUSCLE_ALIASES)) {
    const musclePattern = aliases.map(escapeRegex).join('|')
    const pattern = new RegExp(`\\b(?:${keywordPattern})\\s+(?:any\\s+)?(${musclePattern})\\b`, 'i')
    if (pattern.test(normalized)) {
      found.add(muscle)
    }
  }
  return Array.from(found)
}

const applyStrictDefaults = (constraint: TargetMuscleConstraint): TargetMuscleConstraint => {
  if (!constraint.strict || constraint.exclude?.length || constraint.include.length !== 1) {
    return constraint
  }
  const primary = constraint.include[0]
  const defaults: Record<string, string[]> = {
    quads: ['hamstrings', 'glutes', 'calves', 'hips'],
    hamstrings: ['quads', 'glutes', 'calves', 'hips'],
    glutes: ['quads', 'hamstrings', 'calves', 'hips'],
    calves: ['quads', 'hamstrings', 'glutes', 'hips'],
    hips: ['quads', 'hamstrings', 'glutes', 'calves'],
  }
  const exclude = defaults[primary]
  if (!exclude?.length) return constraint
  return { ...constraint, exclude }
}

const normalizeConstraint = (constraint: TargetMuscleConstraint): TargetMuscleConstraint => {
  const include = Array.from(new Set(constraint.include.map(muscle => normalizeMuscleName(muscle) ?? muscle)))
    .filter(Boolean)
  const exclude = Array.from(
    new Set((constraint.exclude ?? []).map(muscle => normalizeMuscleName(muscle) ?? muscle)),
  ).filter(Boolean)
  const excludeFiltered = exclude.filter(muscle => !include.includes(muscle))
  return {
    include,
    exclude: excludeFiltered.length ? excludeFiltered : undefined,
    strict: constraint.strict ? true : undefined,
  }
}

export const parseTargetMuscleConstraint = (text: string): TargetMuscleConstraint | null => {
  if (!text) return null
  const includes = extractMuscleMentions(text)
  if (!includes.length) return null
  const excludes = extractExcludedMuscles(text)
  const strict = STRICT_KEYWORDS.test(text)
  return normalizeConstraint(
    applyStrictDefaults({
      include: includes,
      exclude: excludes.length ? excludes : undefined,
      strict: strict ? true : undefined,
    }),
  )
}

export const detectHistoricalLiftRequest = (text: string): boolean => HISTORY_KEYWORDS.test(text || '')

const detectGoal = (text: string): WorkoutPlanAnalysisMeta['goal'] | undefined => {
  if (!text) return undefined
  const normalized = text.toLowerCase()
  if (GOAL_KEYWORDS.strength.some(keyword => normalized.includes(keyword))) return 'strength'
  if (GOAL_KEYWORDS.hypertrophy.some(keyword => normalized.includes(keyword))) return 'hypertrophy'
  if (GOAL_KEYWORDS.endurance.some(keyword => normalized.includes(keyword))) return 'endurance'
  return undefined
}

export const parseWorkoutPlanMeta = (text: string): WorkoutPlanAnalysisMeta => {
  const targetsMuscles = parseTargetMuscleConstraint(text) ?? undefined
  const usesHistoricalLifts = detectHistoricalLiftRequest(text) ? true : undefined
  const goal = detectGoal(text)
  return {
    targetsMuscles,
    usesHistoricalLifts,
    goal,
  }
}

export const mergeWorkoutPlanMeta = (
  base?: WorkoutPlanAnalysisMeta | null,
  next?: WorkoutPlanAnalysisMeta | null,
): WorkoutPlanAnalysisMeta | undefined => {
  if (!base && !next) return undefined
  const baseTargets = base?.targetsMuscles
  const nextTargets = next?.targetsMuscles
  const targetsMuscles = nextTargets?.include?.length ? nextTargets : baseTargets
  const usesHistoricalLifts = Boolean(next?.usesHistoricalLifts || base?.usesHistoricalLifts)
  const goal = next?.goal ?? base?.goal
  if (!targetsMuscles && !usesHistoricalLifts && !goal) return undefined
  return {
    targetsMuscles,
    usesHistoricalLifts: usesHistoricalLifts ? true : undefined,
    goal,
  }
}

export const buildExerciseNameFilters = (constraint?: TargetMuscleConstraint | null) => {
  if (!constraint?.include?.length) {
    return { include: [] as string[], exclude: [] as string[] }
  }
  const include = new Set<string>()
  const exclude = new Set<string>()
  constraint.include.forEach(muscle => {
    const patterns = EXERCISE_KEYWORDS[muscle] ?? [muscle]
    patterns.forEach(pattern => include.add(`%${pattern}%`))
  })
  constraint.exclude?.forEach(muscle => {
    const patterns = EXERCISE_KEYWORDS[muscle] ?? [muscle]
    patterns.forEach(pattern => exclude.add(`%${pattern}%`))
  })
  return {
    include: Array.from(include),
    exclude: Array.from(exclude),
  }
}

export type ExerciseCandidate = {
  name: string
  primaryMuscle?: string | null
}

export const resolveExercisePrimaryMuscle = (name: string): string | null => {
  const normalized = normalizeText(name)
  for (const muscle of MUSCLE_PRIORITY) {
    const keywords = EXERCISE_KEYWORDS[muscle] ?? []
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return muscle
    }
  }
  return null
}

export const selectExercisesForMuscles = (
  availableExercises: ExerciseCandidate[],
  constraint: TargetMuscleConstraint,
) => {
  const include = new Set(constraint.include.map(muscle => normalizeMuscleName(muscle) ?? muscle))
  const exclude = new Set((constraint.exclude ?? []).map(muscle => normalizeMuscleName(muscle) ?? muscle))
  const strict = Boolean(constraint.strict)
  return availableExercises.filter(exercise => {
    const primary = exercise.primaryMuscle ?? resolveExercisePrimaryMuscle(exercise.name)
    if (!primary) {
      return !strict && include.size === 0
    }
    if (exclude.has(primary)) return false
    if (!include.size) return true
    return include.has(primary)
  })
}

const buildPatternArrayClause = (column: string, paramIndex: number) => {
  return `${column} ILIKE ANY($${paramIndex}::text[])`
}

export type WorkoutPlanQueryPlan = {
  queries: Array<{ id: string; purpose: string; sql: string; params: unknown[] }>
  filterApplied: boolean
}

export const buildWorkoutPlanQueries = (input: {
  lifts: SetsBaseCte
  constraint?: TargetMuscleConstraint | null
  window?: string
  maxExercises?: number
}): WorkoutPlanQueryPlan => {
  const window = input.window ?? '12 months'
  const deloadWindow = '12 weeks'
  const maxExercises = input.maxExercises && input.maxExercises > 0 ? Math.floor(input.maxExercises) : 6
  const { include, exclude } = buildExerciseNameFilters(input.constraint ?? undefined)
  const filterApplied = include.length > 0
  let clauseParts: string[] = []
  let params: unknown[] = [window]
  let nextIndex = 2
  if (include.length) {
    params = [...params, include]
    clauseParts.push(buildPatternArrayClause(`${input.lifts.alias}.exercise`, nextIndex))
    nextIndex += 1
  }
  if (exclude.length) {
    params = [...params, exclude]
    clauseParts.push(`NOT (${buildPatternArrayClause(`${input.lifts.alias}.exercise`, nextIndex)})`)
    nextIndex += 1
  }
  const filterClause = filterApplied ? `AND ${clauseParts.join(' AND ')}` : 'AND 1 = 0'
  const purpose = filterApplied
    ? `Summarize recent exercise history for targeted muscles over the last ${window}.`
    : `Fallback: no exercise name patterns matched the target muscles, so return no rows for the last ${window}.`

  const sql =
    `WITH ${input.lifts.cte}, filtered AS (` +
    `SELECT ${input.lifts.alias}.exercise, ${input.lifts.alias}.weight, ${input.lifts.alias}.reps, ` +
    `${input.lifts.volumeExpr} AS volume, ` +
    `${input.lifts.performedAtExpr} AS performed_at, ${input.lifts.sessionDateExpr} AS session_date ` +
    `FROM ${input.lifts.alias} ` +
    `WHERE ${input.lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
    `${filterClause}` +
    '), volume AS (' +
    'SELECT exercise, SUM(volume) AS total_volume, COUNT(*) AS total_sets ' +
    'FROM filtered GROUP BY exercise' +
    '), ranked AS (' +
    'SELECT exercise, total_volume, total_sets, ' +
    'ROW_NUMBER() OVER (ORDER BY total_volume DESC NULLS LAST) AS rn ' +
    'FROM volume' +
    '), recent_working AS (' +
    'SELECT exercise, weight, reps, performed_at, ' +
    'ROW_NUMBER() OVER (PARTITION BY exercise ORDER BY performed_at DESC) AS rn ' +
    'FROM filtered WHERE reps BETWEEN 6 AND 12' +
    '), recent_any AS (' +
    'SELECT exercise, weight, reps, performed_at, ' +
    'ROW_NUMBER() OVER (PARTITION BY exercise ORDER BY performed_at DESC) AS rn ' +
    'FROM filtered' +
    '), top_set AS (' +
    'SELECT exercise, weight, reps, performed_at, ' +
    'ROW_NUMBER() OVER (PARTITION BY exercise ORDER BY weight DESC NULLS LAST, reps DESC NULLS LAST) AS rn ' +
    'FROM filtered' +
    ') ' +
    'SELECT r.exercise, r.total_volume, r.total_sets, ' +
    'rw.weight AS last_working_weight, rw.reps AS last_working_reps, rw.performed_at AS last_working_at, ' +
    'ra.weight AS last_weight, ra.reps AS last_reps, ra.performed_at AS last_at, ' +
    'ts.weight AS top_weight, ts.reps AS top_reps, ts.performed_at AS top_at ' +
    'FROM ranked r ' +
    'LEFT JOIN recent_working rw ON rw.exercise = r.exercise AND rw.rn = 1 ' +
    'LEFT JOIN recent_any ra ON ra.exercise = r.exercise AND ra.rn = 1 ' +
    'LEFT JOIN top_set ts ON ts.exercise = r.exercise AND ts.rn = 1 ' +
    `WHERE r.rn <= ${maxExercises} ` +
    'ORDER BY r.total_volume DESC NULLS LAST'

  const deloadSql =
    `WITH ${input.lifts.cte}, weekly AS (` +
    `SELECT DATE_TRUNC('week', ${input.lifts.performedAtExpr})::date AS week_start, ` +
    `SUM(${input.lifts.volumeExpr}) AS total_volume ` +
    `FROM ${input.lifts.alias} ` +
    `WHERE ${input.lifts.performedAtExpr} >= CURRENT_DATE - ($1)::interval ` +
    'GROUP BY week_start' +
    ') ' +
    'SELECT COUNT(*) AS week_count, AVG(total_volume) AS avg_volume, ' +
    'MIN(total_volume) AS min_volume, MAX(total_volume) AS max_volume ' +
    'FROM weekly'

  return {
    filterApplied,
    queries: [
      {
        id: 'q1',
        purpose,
        sql,
        params,
      },
      {
        id: 'q2',
        purpose: `Summarize weekly training volume over the last ${deloadWindow} for deload checks.`,
        sql: deloadSql,
        params: [deloadWindow],
      },
    ],
  }
}
