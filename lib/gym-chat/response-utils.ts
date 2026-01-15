import type { AnalysisKind, GymChatQuery, TargetMuscleConstraint } from '@/types/gym-chat'
import { selectExercisesForMuscles } from './workout-planner'

export type MetricInfo = {
  name: string
  units: string
}

export type ResponseMeta = {
  isRankingQuestion: boolean
  requestedTopN: number | null
  defaultTopN: number
  displayCountTarget: number | null
  metricName: string | null
  metricUnits: string | null
  primaryQueryId: string | null
  rowsReturned: number | null
  rowsDisplayed: number | null
  limitApplied: number | null
  limitRequested: number | null
  timeWindowLabel: string | null
  timeWindowDays: number | null
  tieHandling: string | null
}

export type QueryResultMeta = {
  queryId: string
  rowsReturned: number
  rowsDisplayed: number
  limitApplied: number | null
  timeWindowLabel: string | null
  timeWindowDays: number | null
  hasError: boolean
}

export type ResponseValidationIssue = {
  type: 'metric_mismatch' | 'coverage_missing' | 'lowest_ambiguous' | 'topn_mismatch'
  message: string
}

export type WorkoutTemplateExercise = {
  name: string
  primaryMuscle: string
  sets: string
  reps: string
  notes?: string
}

const DEFAULT_TOP_N = 10
const TOP_N_REGEX = /\btop[-\s]+(\d+)\b/i
const RANKING_KEYWORDS = ['top', 'most', 'highest', 'lowest', 'least', 'rank', 'ranking', 'best', 'worst']

const VOLUME_KEYWORDS = ['volume', 'tonnage', 'lb-reps', 'lb reps', 'kg-reps', 'kg reps']
const VOLUME_MISMATCH_KEYWORDS = ['total volume', 'tonnage', 'lb-reps', 'lb reps', 'kg-reps', 'kg reps']

const normalizeText = (value: string) => value.toLowerCase()

const WORKOUT_EXERCISE_LIBRARY: WorkoutTemplateExercise[] = [
  { name: 'Leg Extension', primaryMuscle: 'quads', sets: '3-4', reps: '10-15' },
  { name: 'Hack Squat', primaryMuscle: 'quads', sets: '3-4', reps: '6-10' },
  { name: 'Leg Press', primaryMuscle: 'quads', sets: '3', reps: '8-12' },
  { name: 'Front Squat', primaryMuscle: 'quads', sets: '3', reps: '5-8' },
  { name: 'Bulgarian Split Squat', primaryMuscle: 'quads', sets: '3', reps: '8-12', notes: 'per leg' },
  { name: 'Seated Leg Curl', primaryMuscle: 'hamstrings', sets: '3', reps: '8-12' },
  { name: 'Romanian Deadlift', primaryMuscle: 'hamstrings', sets: '3', reps: '6-10' },
  { name: 'Hip Thrust', primaryMuscle: 'glutes', sets: '3-4', reps: '8-12' },
  { name: 'Glute Bridge', primaryMuscle: 'glutes', sets: '3', reps: '10-12' },
  { name: 'Standing Calf Raise', primaryMuscle: 'calves', sets: '3', reps: '10-15' },
  { name: 'Seated Calf Raise', primaryMuscle: 'calves', sets: '3', reps: '12-15' },
  { name: 'Hip Abduction', primaryMuscle: 'hips', sets: '3', reps: '12-15' },
  { name: 'Hip Adduction', primaryMuscle: 'hips', sets: '3', reps: '12-15' },
]

const mapWindowDays = (window: string | null | undefined) => {
  if (!window) return null
  if (window === 'all_time') return null
  const match = window.match(/(\d+)\s*(day|week|month|year)s?\b/i)
  if (!match?.[1] || !match[2]) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  const unit = match[2].toLowerCase()
  if (unit === 'day') return value
  if (unit === 'week') return value * 7
  if (unit === 'month') return value * 30
  if (unit === 'year') return value * 365
  return null
}

const selectPrimaryQuery = (queries: GymChatQuery[]) => {
  const candidates = queries.filter(query => !query.error)
  if (!candidates.length) return null
  return candidates.reduce((best, query) => {
    if (!best) return query
    if (query.rowCount !== best.rowCount) return query.rowCount > best.rowCount ? query : best
    if (query.previewRows.length !== best.previewRows.length) {
      return query.previewRows.length > best.previewRows.length ? query : best
    }
    return best
  }, candidates[0])
}

const hasWord = (text: string, word: string) => new RegExp(`\\b${word}\\b`, 'i').test(text)

export const buildAnalysisFollowUps = (analysisKind?: AnalysisKind) => {
  switch (analysisKind) {
    case 'stalled_lifts':
      return [
        'Drill into a specific lift that has stalled.',
        'Compare stalled lifts versus the ones still progressing.',
        'Extend the window to the last 24 months for stalled lifts.',
      ]
    case 'return_for_effort_progression':
      return [
        'Drill into a specific exercise progression trend.',
        'Compare the last 6 months vs the prior 6 months for progression.',
        'Show my top 5 most-improved exercises by estimated 1RM.',
      ]
    case 'return_for_effort_volume':
      return [
        'Which exercises had the highest total volume in the last 90 days?',
        'Compare total volume per exercise over the last 3 months vs the prior 3 months.',
        'Break down total volume by muscle group.',
      ]
    case 'top_end_efforts':
      return [
        'Compare top-end efforts over the last 12 months vs the last 3 months.',
        'Which exercises show the most top-end efforts?',
        'Show top-end efforts for a specific lift.',
      ]
    case 'top_end_efforts_compare_12m_3m':
      return [
        'Show only the last 3 months of top-end efforts.',
        'Which exercises improved in top-end efforts over the last 3 months?',
        'Drill into a specific lift for top-end efforts in the last 3 months.',
      ]
    case 'lighter_weight_progress':
      return [
        'Which lifts show the biggest 1RM increase despite lighter weights?',
        'Drill into a specific exercise with lighter-weight progress.',
        'Compare lighter-weight progress over the last 6 months vs the prior 6 months.',
      ]
    case 'top_weight_sets':
      return [
        'Show my top 10 highest-weight sets from the last 90 days.',
        'Show the heaviest sets for a specific exercise.',
        'Compare my top sets over the last 3 months vs the prior 3 months.',
      ]
    case 'lowest_volume_day':
      return [
        'Show the 5 lowest-volume training days in the last 90 days.',
        'Compare that day to my average session volume.',
        'List sessions with the lowest total sets in the last 30 days.',
      ]
    case 'favorite_split_day':
      return [
        'Show my split-day frequency by month.',
        'Compare push vs pull vs leg day counts over the last 12 months.',
        'Show the last 10 sessions for my most frequent split.',
      ]
    case 'weekly_volume':
      return [
        'Compare weekly volume over the last 3 months vs the prior 3 months.',
        'Show my highest-volume weeks in the last 12 months.',
        'Break weekly volume down by exercise.',
      ]
    case 'muscle_group_balance':
      return [
        'Compare upper vs lower body volume over the last 12 weeks.',
        'Which exercises drive volume for a specific body part?',
        'Show recent shifts in body-part volume over the last 12 weeks.',
      ]
    case 'progressive_overload':
      return [
        'Which lifts have the longest progressive overload streaks?',
        'Compare overload streaks over the last 6 months vs the prior 6 months.',
        'Drill into a specific exercise overload streak.',
      ]
    case 'set_count':
      return [
        'Show total sets per exercise over the last 90 days.',
        'Compare total sets over the last 3 months vs the prior 3 months.',
        'Break down total sets by muscle group.',
      ]
    case 'volume':
      return [
        'Show total volume per exercise over the last 90 days.',
        'Compare total volume over the last 3 months vs the prior 3 months.',
        'Break down total volume by muscle group.',
      ]
    case 'session_count':
      return [
        'Show my sessions per week over the last 12 months.',
        'Compare session counts over the last 3 months vs the prior 3 months.',
        'Show my most active training weeks.',
      ]
    default:
      return undefined
  }
}

const formatMuscleList = (muscles: string[]) => {
  if (muscles.length === 1) return muscles[0]
  if (muscles.length === 2) return `${muscles[0]} and ${muscles[1]}`
  return `${muscles.slice(0, -1).join(', ')}, and ${muscles[muscles.length - 1]}`
}

const buildGenericWorkoutPlan = (constraint?: TargetMuscleConstraint, maxExercises = 5) => {
  const candidates = constraint
    ? selectExercisesForMuscles(
        WORKOUT_EXERCISE_LIBRARY.map(entry => ({
          name: entry.name,
          primaryMuscle: entry.primaryMuscle,
        })),
        constraint,
      )
    : WORKOUT_EXERCISE_LIBRARY.map(entry => ({ name: entry.name, primaryMuscle: entry.primaryMuscle }))
  const allowed = new Set(candidates.map(entry => entry.name))
  const filtered = WORKOUT_EXERCISE_LIBRARY.filter(entry => allowed.has(entry.name))
  return filtered.slice(0, Math.max(1, Math.min(maxExercises, filtered.length)))
}

const formatPlanNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1)
  }
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

const formatPlanDate = (value: unknown) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') {
    const match = value.match(/\d{4}-\d{2}-\d{2}/)
    if (match?.[0]) return match[0]
  }
  return null
}

const inferRepTarget = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(numeric) || numeric <= 0) return '8-12'
  if (numeric <= 4) return '3-5'
  if (numeric <= 6) return '4-6'
  if (numeric <= 8) return '6-8'
  if (numeric <= 12) return '8-12'
  return '10-15'
}

const inferSetTarget = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(numeric)) return 3
  if (numeric >= 18) return 4
  if (numeric <= 6) return 2
  return 3
}

export const buildPlanCorrectionAcknowledgement = (constraint?: TargetMuscleConstraint) => {
  const targetList = constraint?.include?.length ? formatMuscleList(constraint.include) : 'your requested focus'
  const focusLabel = constraint?.strict ? `${targetList} only` : targetList
  return `You're right - the last plan drifted off target. I'll keep this ${focusLabel}.`
}

export const buildWorkoutPlanFromHistory = (input: {
  query: GymChatQuery | null | undefined
  constraint?: TargetMuscleConstraint
  usesHistoricalLifts?: boolean
  acknowledgement?: string
  maxExercises?: number
}) => {
  const query = input.query
  const rows = query?.previewRows ?? []
  if (!rows.length) return null
  const maxExercises = input.maxExercises && input.maxExercises > 0 ? Math.floor(input.maxExercises) : 5
  const exercises = rows
    .map(row => ({
      row,
      name: typeof row.exercise === 'string' ? row.exercise : typeof (row as any).exercise_name === 'string'
        ? (row as any).exercise_name
        : null,
    }))
    .filter(entry => entry.name)
    .slice(0, maxExercises) as Array<{ row: Record<string, unknown>; name: string }>
  if (!exercises.length) return null

  const windowLabel = typeof query?.params?.[0] === 'string' ? String(query.params[0]) : null
  const targetList = input.constraint?.include?.length ? formatMuscleList(input.constraint.include) : 'targeted'
  const focusLabel = input.constraint?.strict ? `${targetList}-only` : `${targetList}-focused`
  const opening = `${input.acknowledgement ? `${input.acknowledgement} ` : ''}Based on your ${
    windowLabel ? `${windowLabel} ` : ''
  }${focusLabel} history, here is a plan grounded in your recent working sets.`

  let hadMissingWeights = false
  const sessionLines = exercises.map(({ row, name }) => {
    const workingWeight = formatPlanNumber(row.last_working_weight)
    const workingReps = formatPlanNumber(row.last_working_reps)
    const workingAt = formatPlanDate(row.last_working_at)
    const lastWeight = formatPlanNumber(row.last_weight)
    const lastReps = formatPlanNumber(row.last_reps)
    const lastAt = formatPlanDate(row.last_at)
    const topWeight = formatPlanNumber(row.top_weight)
    const topReps = formatPlanNumber(row.top_reps)
    const topAt = formatPlanDate(row.top_at)

    const anchorWeight = workingWeight ?? lastWeight ?? topWeight
    const anchorReps = workingReps ?? lastReps ?? topReps
    const anchorDate = workingAt ?? lastAt ?? topAt
    const anchorLabel = workingWeight
      ? 'last working set'
      : lastWeight
        ? 'most recent set'
        : topWeight
          ? 'top set'
          : null

    const sets = inferSetTarget(row.total_sets)
    const reps = inferRepTarget(anchorReps)
    if (!anchorWeight) hadMissingWeights = true

    const weightLabel = anchorWeight ? `@ ${anchorWeight}` : '@ challenging load'
    const anchorNote = anchorLabel
      ? ` (based on ${anchorLabel}${anchorDate ? ` on ${anchorDate}` : ''})`
      : ''

    return `- ${name}: ${sets}x${reps} ${weightLabel}${anchorNote}`
  })

  const trainingLine = input.constraint?.strict
    ? `Keep the session strictly ${targetList} only; skip accessories for other muscle groups.`
    : `Keep the session focused on ${targetList} while staying within the requested emphasis.`
  const loadingLine = input.usesHistoricalLifts
    ? 'Aim to match your last working set; if it felt smooth, add a small plate jump next time.'
    : 'Use the historical set weights as starting anchors and adjust slightly based on fatigue.'
  const limitationLine = hadMissingWeights
    ? 'Some exercises lacked recent working weights, so use a challenging but repeatable load as your starting point.'
    : 'No material limitations detected for the requested focus.'

  return [
    opening,
    '**Proposed session**',
    sessionLines.join('\n'),
    '**Training implications**',
    `- ${trainingLine}`,
    `- ${loadingLine}`,
    '**Limitations**',
    `- ${limitationLine}`,
  ].join('\n\n')
}

export const buildWorkoutPlanFallbackMessage = (input: {
  constraint?: TargetMuscleConstraint
  usesHistoricalLifts?: boolean
  acknowledgement?: string
}) => {
  const exercises = buildGenericWorkoutPlan(input.constraint, 6)
  const targetList = input.constraint?.include?.length ? formatMuscleList(input.constraint.include) : 'targeted'
  const focusLabel = input.constraint?.strict ? `${targetList}-only` : `${targetList}-focused`
  const opening = `${input.acknowledgement ? `${input.acknowledgement} ` : ''}Here is a ${focusLabel} session.`
  const sessionLines = exercises.length
    ? exercises.map(entry => {
        const note = entry.notes ? ` (${entry.notes})` : ''
        return `- ${entry.name}: ${entry.sets} sets x ${entry.reps} reps${note}`
      })
    : ['- No default exercises are available for this focus yet.']
  const limitationLine = input.usesHistoricalLifts
    ? 'I could not find logged sets to anchor weights, so start from your last working weights and adjust by feel.'
    : 'Logged history for this focus was limited, so use a challenging but repeatable load as a starting point.'
  const trainingLine = input.constraint?.strict
    ? `Keep the session strictly ${targetList} only; skip accessories for other muscle groups.`
    : `Keep the session focused on ${targetList} while staying within the requested emphasis.`
  return [
    opening,
    '**Proposed session**',
    sessionLines.join('\n'),
    '**Training implications**',
    `- ${trainingLine}`,
    '**Limitations**',
    `- ${limitationLine}`,
  ].join('\n\n')
}

export const extractRequestedTopN = (question: string) => {
  if (!question) return null
  const match = question.match(TOP_N_REGEX)
  if (!match?.[1]) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.min(Math.floor(value), 1000)
}

export const isRankingQuestion = (question: string) => {
  if (!question) return false
  const normalized = normalizeText(question)
  return RANKING_KEYWORDS.some(keyword => normalized.includes(keyword))
}

export const detectRequestedMetric = (question: string): MetricInfo | null => {
  if (!question) return null
  const normalized = normalizeText(question)
  if (VOLUME_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return { name: 'total volume', units: 'lb-reps' }
  }
  if (normalized.includes('total sets') || hasWord(normalized, 'sets') || hasWord(normalized, 'set')) {
    return { name: 'total sets', units: 'sets' }
  }
  if (normalized.includes('total reps') || hasWord(normalized, 'reps') || hasWord(normalized, 'rep')) {
    return { name: 'total reps', units: 'reps' }
  }
  if (normalized.includes('sessions') || normalized.includes('workouts') || normalized.includes('training days')) {
    return { name: 'sessions', units: 'sessions' }
  }
  return null
}

export const buildQueryResultMetadata = (queries: GymChatQuery[]): QueryResultMeta[] =>
  queries.map(query => ({
    queryId: query.id,
    rowsReturned: query.rowCount,
    rowsDisplayed: query.previewRows.length,
    limitApplied: query.policy?.appliedLimit ?? null,
    timeWindowLabel: query.policy?.appliedTimeWindow ?? null,
    timeWindowDays: mapWindowDays(query.policy?.appliedTimeWindow ?? null),
    hasError: Boolean(query.error),
  }))

export const buildResponseMeta = (question: string, queries: GymChatQuery[]): ResponseMeta => {
  const requestedTopN = extractRequestedTopN(question)
  const rankingRequested = isRankingQuestion(question)
  const metric = detectRequestedMetric(question)
  const primary = selectPrimaryQuery(queries)
  const limitApplied = primary?.policy?.appliedLimit ?? null
  const timeWindowLabel = primary?.policy?.appliedTimeWindow ?? null
  const timeWindowDays = mapWindowDays(timeWindowLabel ?? null)
  const displayTarget =
    rankingRequested && primary ? Math.min(requestedTopN ?? DEFAULT_TOP_N, primary.previewRows.length) : null
  const rowsDisplayed = displayTarget ?? (primary?.previewRows.length ?? null)
  const tieHandling = primary?.sql?.toLowerCase().includes('with ties')
    ? 'ties expanded'
    : 'ties not expanded'

  return {
    isRankingQuestion: rankingRequested,
    requestedTopN,
    defaultTopN: DEFAULT_TOP_N,
    displayCountTarget: displayTarget,
    metricName: metric?.name ?? null,
    metricUnits: metric?.units ?? null,
    primaryQueryId: primary?.id ?? null,
    rowsReturned: primary?.rowCount ?? null,
    rowsDisplayed,
    limitApplied,
    limitRequested: requestedTopN,
    timeWindowLabel,
    timeWindowDays,
    tieHandling,
  }
}

export const formatCoverageLine = (meta: ResponseMeta) => {
  const windowLabel = meta.timeWindowLabel ?? 'unknown window'
  const rowsReturned = meta.rowsReturned ?? 'unknown'
  const rowsDisplayed = meta.rowsDisplayed ?? 'unknown'
  const limitApplied = meta.limitApplied ?? 'none'
  const topRequested = meta.requestedTopN ? `top ${meta.requestedTopN} requested` : 'top N not specified'
  const tieHandling = meta.tieHandling ?? 'tie handling unknown'
  return `Coverage/Limitations: window=${windowLabel}, rows returned=${rowsReturned}, rows shown=${rowsDisplayed}, limit=${limitApplied} (${topRequested}), tie handling=${tieHandling}.`
}

export const validateRankingResponse = (
  question: string,
  assistantMessage: string,
  meta: ResponseMeta,
): ResponseValidationIssue[] => {
  const issues: ResponseValidationIssue[] = []
  const normalized = normalizeText(assistantMessage)
  if (meta.metricName === 'total sets') {
    if (VOLUME_MISMATCH_KEYWORDS.some(keyword => normalized.includes(keyword))) {
      issues.push({
        type: 'metric_mismatch',
        message:
          'Metric mismatch: user asked for total sets. Remove volume/tonnage/lb-reps and keep all figures labeled as total sets.',
      })
    }
  }
  if (meta.isRankingQuestion) {
    const hasCoverage = normalized.includes('coverage/limitations') || /showing\s+\d+\s+of\s+\d+/.test(normalized)
    if (!hasCoverage) {
      issues.push({
        type: 'coverage_missing',
        message:
          'Add a Coverage/Limitations line stating time window, rows returned, rows shown, applied limit, and tie handling.',
      })
    }
    if (meta.requestedTopN && meta.rowsDisplayed && meta.rowsDisplayed < meta.requestedTopN) {
      if (normalized.includes(`top ${meta.requestedTopN}`)) {
        issues.push({
          type: 'topn_mismatch',
          message: `Do not claim "top ${meta.requestedTopN}" if fewer results are shown. Say "showing ${meta.rowsDisplayed} of ${meta.rowsReturned} returned" instead.`,
        })
      }
    }
    if (normalized.includes('lowest') && meta.requestedTopN) {
      const clarified = normalized.includes('among the top') || normalized.includes('among top')
      if (!clarified) {
        issues.push({
          type: 'lowest_ambiguous',
          message:
            'If mentioning "lowest", clarify whether it is "among the top N shown" or omit the lowest section.',
        })
      }
    }
  }
  return issues
}

const formatRowSample = (row: Record<string, unknown>) =>
  Object.entries(row)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${value == null ? 'n/a' : String(value)}`)
    .join(', ')

const buildRankingSample = (rows: Record<string, unknown>[], label: string, valueKey: string) => {
  if (!rows.length) return []
  return rows.slice(0, 5).map(row => {
    const name = row.exercise ?? row.body_part ?? row.day_tag ?? row.week_start ?? row.session_date ?? 'Item'
    const value = row[valueKey] ?? row.total_sets ?? row.total_volume ?? row.count ?? row.sessions
    return `- ${name}: ${value ?? 'n/a'} ${label}`.trim()
  })
}

const extractNumericStats = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return null
  const keys = Object.keys(rows[0])
  for (const key of keys) {
    const values = rows
      .map(row => {
        const raw = row[key]
        if (typeof raw === 'number') return raw
        if (typeof raw === 'string' && raw.trim()) {
          const parsed = Number(raw)
          return Number.isFinite(parsed) ? parsed : null
        }
        return null
      })
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    if (values.length < 2) continue
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    return {
      key,
      min: sorted[0],
      median,
      max: sorted[sorted.length - 1],
    }
  }
  return null
}

export const buildFallbackExplanation = (input: {
  question: string
  queries: GymChatQuery[]
  analysisKind?: AnalysisKind
  responseMeta?: ResponseMeta
  queryResultMetadata?: QueryResultMeta[]
}) => {
  const eligibleQueries = input.queries.filter(query => !query.error)
  const primary = eligibleQueries.length ? selectPrimaryQuery(eligibleQueries) : null
  const windowLabel = primary?.policy?.appliedTimeWindow ?? 'unknown window'

  if (input.analysisKind === 'session_count' && primary?.previewRows?.[0]) {
    const sessionCount = primary.previewRows[0].session_count ?? primary.previewRows[0].sessions ?? 'n/a'
    return [
      `You logged ${sessionCount} sessions over ${windowLabel}.`,
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ].join('\n')
  }

  if (input.analysisKind === 'weekly_volume' && primary?.previewRows?.length) {
    const stats = extractNumericStats(primary.previewRows)
    const first = primary.previewRows[0]
    const last = primary.previewRows[primary.previewRows.length - 1]
    return [
      `Weekly training volume over ${windowLabel} (showing ${primary.previewRows.length} weeks).`,
      `First week: ${formatRowSample(first)}`,
      `Most recent week: ${formatRowSample(last)}`,
      stats ? `Volume stats (${stats.key}): min=${stats.min}, median=${stats.median}, max=${stats.max}.` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (input.analysisKind === 'top_end_efforts' && primary?.previewRows?.length) {
    const stats = extractNumericStats(primary.previewRows)
    const lines = buildRankingSample(primary.previewRows, 'top sets', 'top_sets')
    return [
      `Top-end efforts by exercise over ${windowLabel}.`,
      ...lines,
      stats ? `Top-end stats (${stats.key}): min=${stats.min}, median=${stats.median}, max=${stats.max}.` : '',
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (input.analysisKind === 'top_weight_sets' && primary?.previewRows?.length) {
    const stats = extractNumericStats(primary.previewRows)
    const lines = primary.previewRows.slice(0, 5).map(row => {
      const name = row.exercise ?? 'Exercise'
      const weight = row.weight ?? 'n/a'
      const reps = row.reps ?? 'n/a'
      const date = row.session_date ?? row.performed_at ?? 'n/a'
      return `- ${name}: ${weight} x ${reps} (${date})`
    })
    return [
      `Top-weight sets over ${windowLabel}.`,
      ...lines,
      stats ? `Weight stats (${stats.key}): min=${stats.min}, median=${stats.median}, max=${stats.max}.` : '',
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (input.analysisKind === 'set_count' && primary?.previewRows?.length) {
    const stats = extractNumericStats(primary.previewRows)
    const lines = buildRankingSample(primary.previewRows, 'sets', 'total_sets')
    return [
      `Top exercises by total sets over ${windowLabel}.`,
      ...lines,
      stats ? `Set-count stats (${stats.key}): min=${stats.min}, median=${stats.median}, max=${stats.max}.` : '',
      input.responseMeta ? formatCoverageLine(input.responseMeta) : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (
    (input.analysisKind === 'volume' || input.analysisKind === 'return_for_effort_volume') &&
    primary?.previewRows?.length
  ) {
    const stats = extractNumericStats(primary.previewRows)
    const lines = buildRankingSample(primary.previewRows, 'total volume', 'total_volume')
    return [
      `Top exercises by total volume over ${windowLabel}.`,
      ...lines,
      stats ? `Volume stats (${stats.key}): min=${stats.min}, median=${stats.median}, max=${stats.max}.` : '',
      input.responseMeta ? formatCoverageLine(input.responseMeta) : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (input.analysisKind === 'stalled_lifts' && primary?.previewRows?.length) {
    const lines = buildRankingSample(primary.previewRows, 'days since PR', 'days_since_pr')
    return [
      `Stalled lifts (days since last estimated 1RM increase) over ${windowLabel}.`,
      ...lines,
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ].join('\n')
  }

  if (input.analysisKind === 'progressive_overload' && primary?.previewRows?.length) {
    const lines = buildRankingSample(primary.previewRows, 'streak length', 'streak_len')
    return [
      `Progressive overload streaks over ${windowLabel}.`,
      ...lines,
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ].join('\n')
  }

  if (input.analysisKind === 'lighter_weight_progress' && primary?.previewRows?.length) {
    const lines = buildRankingSample(primary.previewRows, 'est 1RM delta', 'est_1rm_delta')
    return [
      `Exercises improving 1RM despite lighter working weights over ${windowLabel}.`,
      ...lines,
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ].join('\n')
  }

  if (input.analysisKind === 'muscle_group_balance' && primary?.previewRows?.length) {
    const lines = buildRankingSample(primary.previewRows, 'pct change', 'pct_change')
    return [
      `Muscle-group balance shifts over ${windowLabel}.`,
      ...lines,
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ].join('\n')
  }

  if (input.analysisKind === 'favorite_split_day' && primary?.previewRows?.length) {
    const lines = buildRankingSample(primary.previewRows, 'sessions', 'session_count')
    return [
      `Most frequent split days over ${windowLabel}.`,
      ...lines,
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ].join('\n')
  }

  if (input.analysisKind === 'lowest_volume_day' && primary?.previewRows?.length) {
    const row = primary.previewRows[0]
    return [
      `Lowest-volume session over ${windowLabel}.`,
      `Session snapshot: ${formatRowSample(row)}`,
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ].join('\n')
  }

  if (input.analysisKind === 'return_for_effort_progression' && primary?.previewRows?.length) {
    const lines = primary.previewRows.slice(0, 5).map(row => `- ${formatRowSample(row)}`)
    return [
      `Estimated 1RM progression over ${windowLabel} (showing sample rows).`,
      ...lines,
      `Coverage/Limitations: window=${windowLabel}, rows returned=${primary.rowCount}, rows shown=${primary.previewRows.length}.`,
    ].join('\n')
  }

  if (input.analysisKind === 'top_end_efforts_compare_12m_3m' && input.queryResultMetadata?.length) {
    const lines = input.queryResultMetadata.map(
      meta =>
        `- ${meta.queryId}: ${meta.rowsReturned} rows (window ${meta.timeWindowLabel ?? 'unknown'})`,
    )
    return [
      'Top-end efforts comparison (12 months vs 3 months).',
      ...lines,
      'Review the query details to compare the two windows directly.',
    ].join('\n')
  }

  const summaryLines = input.queries.map(query => {
    const summaryWindow = query.policy?.appliedTimeWindow ?? 'unknown window'
    const status = query.error ? `error: ${query.error}` : `${query.rowCount} rows`
    return `- ${query.id}: ${query.purpose} (${status}, window ${summaryWindow}).`
  })
  const sampleRows = primary?.previewRows?.length
    ? primary.previewRows.slice(0, 3).map((row, index) => `- Row ${index + 1}: ${formatRowSample(row)}`)
    : []
  const genericStats = primary?.previewRows?.length ? extractNumericStats(primary.previewRows) : null
  const sampleSection = sampleRows.length
    ? ['Sample rows from the main query:', ...sampleRows].join('\n')
    : 'No preview rows were available to summarize.'
  return [
    'I ran the analysis, but I could not generate the full summary.',
    'Here is a quick snapshot of the results:',
    ...summaryLines,
    genericStats ? `Numeric stats (${genericStats.key}): min=${genericStats.min}, median=${genericStats.median}, max=${genericStats.max}.` : '',
    sampleSection,
    'You can open the query details below for the full output.',
  ]
    .filter(Boolean)
    .join('\n')
}
