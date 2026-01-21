import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'
import { createClient, createPool } from '@vercel/postgres'

import { getCatalogTables, loadGymCatalog } from '@/lib/gym-chat/catalog'
import {
  buildFavoriteSplitDayPlan,
  buildBodyPartDaySplitPlan,
  buildWeekdayBreakdownPlan,
  buildBestSetsPlan,
  buildExercisePrsPlan,
  buildExerciseProgressionPlan,
  buildExerciseSummaryPlan,
  buildLightWeightProgressPlan,
  buildMuscleGroupComparisonPlan,
  buildProgressiveOverloadPlan,
  buildReturnEffortVolumePlan,
  buildReturnEffortProgressionPlan,
  buildSessionCountPlan,
  buildSetCountPlan,
  buildSetBreakdownPlan,
  buildStalledLiftsPlan,
  buildTopWeightSetsPlan,
  buildTopEndEffortsComparisonPlan,
  buildTopEndEffortsPlan,
  buildVolumeRankingPlan,
  buildWeeklyVolumePlan,
  buildWorstDayVolumePlan,
  buildPeriodComparePlan,
  buildBest1rmOverallPlan,
  buildInactiveExercisesPlan,
  buildWorkoutTimingPlan,
  type CanonicalPlan,
} from '@/lib/gym-chat/canonical-plans'
import { buildSetsBaseCte, type SetsBaseCte } from '@/lib/gym-chat/sql-builders'
import {
  classifyQuestion,
  planGymSql,
  repairGymSql,
  explainFitnessGeneral,
  explainGymResults,
  isLlmRequestError,
} from '@/lib/gym-chat/llm'
import {
  DEFAULT_LIMIT,
  MAX_PREVIEW_ROWS,
  QUERY_TIMEOUT_MS,
  validateAndRewriteSql,
} from '@/lib/gym-chat/sql-policy'
import {
  buildQueryResultMetadata,
  buildFallbackExplanation,
  buildAnalysisFollowUps,
  buildSetBreakdownChartSpecs,
  buildPlanCorrectionAcknowledgement,
  buildResponseMeta,
  buildWorkoutPlanFromHistory,
  buildWorkoutPlanFallbackMessage,
  suggestExerciseNames,
  extractRequestedTopN,
  formatCoverageLine,
  formatPeriodCompareCoverageLine,
  validateRankingResponse,
  type ResponseMeta,
} from '@/lib/gym-chat/response-utils'
import {
  buildLlmContext,
  buildTerseClarificationPrompt,
  classifyTurnMode,
  containsPronounReference,
  detectTerseInput,
  isCorrection,
  resolvePronounReference,
  RETURN_EFFORT_CHOICE_REGEX,
  TERSE_CHOICE_REGEX,
  EXERCISE_CHOICE_REGEX,
  detectFormattingConstraints,
  validateFormattingConstraints,
  detectRepeatedQuestion,
} from '@/lib/gym-chat/conversation'
import type { TurnMode, FormattingConstraint } from '@/lib/gym-chat/conversation'
import { buildSqlErrorAssistantMessage } from '@/lib/gym-chat/sql-errors'
import { TEMPLATES, selectTemplates } from '@/lib/gym-chat/templates'
import {
  buildWorkoutPlanQueries,
  mergeWorkoutPlanMeta,
  normalizeMuscleName,
  parseWorkoutPlanMeta,
} from '@/lib/gym-chat/workout-planner'
import { buildExerciseGuidanceMessage, findExerciseEntry } from '@/lib/exercise-library'
import type { GymChatTemplateName } from '@/lib/gym-chat/templates'
import type {
  AnalysisKind,
  AnalysisTopic,
  ComparisonIntent,
  ContextDimension,
  ContextFrame,
  ContextScope,
  ContextSlot,
  ContextValue,
  FormatConstraints,
  GymChatCitation,
  GymChatConversationState,
  GymChatMessage,
  GymChatQuery,
  GymChatResponse,
  GymChatTimeWindow,
  LastResponseContext,
  PendingClarification,
  SessionTurnSummary,
  TargetMuscleConstraint,
  WorkoutPlanAnalysisMeta,
} from '@/types/gym-chat'

type IntentType = 'descriptive' | 'trend' | 'comparison' | 'diagnostic' | 'planning'
type PrimaryGrain = 'set' | 'session' | 'week' | 'month' | 'all_time'
type GymChatEvalMeta = {
  intentType?: IntentType
  selectedTemplate?: GymChatTemplateName
  secondaryTemplate?: GymChatTemplateName
  queryCount?: number
  fallbackCitationsApplied?: boolean
}

type LastResponseDataPoint = NonNullable<LastResponseContext['dataPoints']>[number]

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_DURATION_MS = maxDuration * 1000
const MIN_LLM_RETRY_WINDOW_MS = 16000
const DEFAULT_TIME_WINDOW = '90 days'

const SUGGESTED_QUESTIONS = [
  'What was my weekly training volume over the last 12 months?',
  'How many sessions did I log in the last 8 weeks?',
  'Which exercises had the most total sets in the last 90 days?',
  'How should I structure a 4-day split to gain muscle?',
  'Is full body training 3x/week enough?',
  'How should I set a bench press goal?',
]

const SUGGESTED_LIFT_FOLLOWUPS = [
  'Analyze my Incline Press performance.',
  'How has my Hack Squat progressed over the last 12 weeks?',
  'Show my Bench Press trend for the past 3 months.',
]

const buildRefusalMessage = (detail?: string) =>
  [
    detail || 'I can only answer questions about fitness training or your gym workout data.',
    'Try one of these:',
    ...SUGGESTED_QUESTIONS.map(question => `- ${question}`),
  ].join('\n')

const buildEvalHeaders = (meta?: GymChatEvalMeta) => {
  if (!meta) return undefined
  const headers: Record<string, string> = {}
  if (meta.intentType) headers['x-gym-chat-intent'] = meta.intentType
  if (meta.selectedTemplate) headers['x-gym-chat-template'] = meta.selectedTemplate
  if (meta.secondaryTemplate) headers['x-gym-chat-secondary-template'] = meta.secondaryTemplate
  if (meta.queryCount !== undefined) headers['x-gym-chat-query-count'] = String(meta.queryCount)
  if (meta.fallbackCitationsApplied !== undefined) {
    headers['x-gym-chat-fallback-citations'] = meta.fallbackCitationsApplied ? 'true' : 'false'
  }
  return headers
}

const resolveReadonlyConnection = () => {
  const readonly = process.env.GYM_CHAT_DATABASE_URL_READONLY
  if (readonly) return { url: readonly, fallback: false }
  if (process.env.NODE_ENV === 'development') {
    const fallback = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
    if (fallback) {
      return { url: fallback, fallback: true }
    }
  }
  return null
}

const normalizeMessages = (messages: GymChatMessage[]) =>
  messages.filter(message => message && message.role && message.content)

const extractLatestUserQuestion = (messages: GymChatMessage[]) => {
  const reversed = [...messages].reverse()
  return reversed.find(message => message.role === 'user')?.content ?? ''
}

const hasDigits = (value: string) => /\d/.test(value)

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

const parseNumberToken = (value?: string | null) => {
  if (!value) return null
  const normalized = value.toLowerCase()
  if (/^\d+$/.test(normalized)) return Number.parseInt(normalized, 10)
  if (normalized in NUMBER_WORDS) return NUMBER_WORDS[normalized]
  return null
}

const DEFAULT_MEMORY_BUDGET = { maxTurns: 50, maxBytes: 16384 }
const MAX_CONTEXT_STACK = 12
const TOPIC_SHIFT_CONFIDENCE_THRESHOLD = 0.7
const RESPONSE_HISTORY_MAX_BYTES = 120000
const RESPONSE_HISTORY_FALLBACK_TURNS = 16

const COMPARISON_SIGNAL_REGEX = /\b(compare|vs|versus|against)\b/i
const ZOOM_IN_REGEX = /\b(zoom in|drill into|drill in|focus on|narrow to|shift to|switch to)\b/i
const RETRY_CUE_REGEX = /\b(retry|re-?run|rerun|redo|try again|run that again)\b/i
const LONG_PROMPT_FORMAT_REGEX = /\b(bullets?|format|table|csv|json|markdown|strict|exact|verbatim|headings?)\b/i
const FORMAT_RESET_REGEX = /\b(ignore that|go back to (the )?original formatting|back to (the )?original formatting)\b/i
const FORMAT_CLEAR_REGEX = /\b(ignore (the )?formatting|no formatting constraints|drop formatting)\b/i
const TOPIC_RESET_REGEX = /\b(new question|different topic|let's look at|let us look at|start over|reset)\b/i
const ANALYSIS_VERB_REGEX = /\b(show|analyze|analyse|trend|compare|list|summarize|breakdown|explain)\b/i
const METRIC_NAME_REGEX = /\b(volume|sets?|reps?|1rm|one\s+rep\s+max|weight|sessions?)\b/i

const buildContextValue = <T,>(
  value: T,
  source: ContextValue<T>['source'],
  turnId: string,
  timestamp: string,
): ContextValue<T> => ({
  value,
  source,
  turnId,
  timestamp,
})

const buildEmptySlot = <T,>(): ContextSlot<T> => ({
  active: [],
})

const buildEmptyScope = (): ContextScope => ({
  exercises: buildEmptySlot<string>(),
  timeWindows: buildEmptySlot<string>(),
  metrics: buildEmptySlot<LastResponseContext['metric']>(),
  sessionDates: buildEmptySlot<string>(),
})

const uniqueValues = <T,>(values: T[]) => {
  const seen = new Set<string>()
  return values.filter(value => {
    const key = String(value)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const normalizeMetricName = (value: string): LastResponseContext['metric'] | undefined => {
  const normalized = value.trim().toLowerCase()
  if (normalized.includes('volume')) return 'volume'
  if (normalized.includes('set')) return 'sets'
  if (normalized.includes('rep')) return 'reps'
  if (normalized.includes('session')) return 'sessions'
  if (normalized.includes('1rm') || normalized.includes('one rep max')) return '1rm'
  if (normalized.includes('weight')) return 'weight'
  return undefined
}

const extractMetricFromQuestion = (text: string) => {
  if (!text) return null
  const match = text.toLowerCase().match(METRIC_NAME_REGEX)
  if (!match) return null
  return normalizeMetricName(match[0])
}

const EXERCISE_TARGET_STOPWORDS = new Set([
  'a',
  'an',
  'about',
  'all',
  'and',
  'are',
  'as',
  'at',
  'best',
  'by',
  'compare',
  'during',
  'each',
  'ever',
  'exercise',
  'exercises',
  'for',
  'from',
  'has',
  'have',
  'how',
  'i',
  'in',
  'is',
  'last',
  'lift',
  'lifts',
  'lifetime',
  'me',
  'most',
  'my',
  'now',
  'of',
  'on',
  'only',
  'over',
  'past',
  'performance',
  'per',
  'personal',
  'pr',
  'prs',
  'progress',
  'progressed',
  'progression',
  'profile',
  'record',
  'records',
  'recent',
  'recently',
  'set',
  'sets',
  'show',
  'same',
  'keep',
  'format',
  'include',
  'focus',
  'drill',
  'zoom',
  'switch',
  'shift',
  'narrow',
  'since',
  'summary',
  'summaries',
  'the',
  'that',
  'those',
  'these',
  'this',
  'it',
  'its',
  'them',
  'their',
  'one',
  'ones',
  'previous',
  'prior',
  'before',
  'time',
  'top',
  'trend',
  'trending',
  'was',
  'weight',
  'weights',
  'week',
  'weeks',
  'month',
  'months',
  'year',
  'years',
  'day',
  'days',
  'return',
  'effort',
  'session',
  'sessions',
  'volume',
  'overview',
  'breakdown',
  'what',
  'which',
  'who',
  'where',
  'when',
  'why',
  'please',
  'tell',
  'list',
  'give',
])

const EXERCISE_TARGET_SPLIT_REGEX = /\b(vs|versus|and|&)\b/i
const PHRASE_WINDOW_REGEX = /\b(this|last|past|previous)[-\s]+(week|month|year)s?\b/gi

const extractExerciseTarget = (text: string) => {
  if (!text) return null
  const normalized = normalizeWhitespace(text).toLowerCase()
  if (EXERCISE_TARGET_SPLIT_REGEX.test(normalized)) return null
  const cleaned = normalized.replace(/[^a-z0-9\s-]/g, ' ')
  const tokens = cleaned.split(/\s+/).filter(Boolean)
  const filtered = tokens.filter(token => !EXERCISE_TARGET_STOPWORDS.has(token))
  if (!filtered.length) return null
  const candidate = filtered.slice(0, 4).join(' ').trim()
  if (!candidate || candidate.length < 3) return null
  return candidate
}

const resolveExerciseTarget = (input: {
  question: string
  state?: GymChatConversationState | null
  turnMode?: string
}) => {
  const extracted = extractExerciseTarget(input.question)
  if (extracted) return extracted
  const fallbackContext = input.state?.lastResponseContext
  if (fallbackContext?.exercises && fallbackContext.exercises.length > 1) {
    return null
  }
  const scopeExercise = input.state?.scope?.exercises?.sticky?.value ?? input.state?.scope?.exercises?.primary?.value
  const fallbackExercise = fallbackContext?.exercise ?? input.state?.lastExercise ?? scopeExercise
  if (!fallbackExercise) return null
  const hasStickyExercise = Boolean(input.state?.scope?.exercises?.sticky)
  if (input.turnMode === 'analysis_followup' || containsPronounReference(input.question) || hasStickyExercise) {
    return fallbackExercise
  }
  return null
}

const extractScopeFromQuestion = (question: string): Partial<ContextFrame['scope']> => {
  const exercises: string[] = []
  const exercise = extractExerciseTarget(question)
  if (exercise) exercises.push(exercise)
  if (!exercise && EXERCISE_TARGET_SPLIT_REGEX.test(question)) {
    const parts = question.split(EXERCISE_TARGET_SPLIT_REGEX).map(part => part.trim()).filter(Boolean)
    parts.forEach(part => {
      const candidate = extractExerciseTarget(part)
      if (candidate) exercises.push(candidate)
    })
  }
  const timeWindowSet = new Set<string>()
  const explicitWindow = extractExplicitWindow(question)
  if (explicitWindow) timeWindowSet.add(explicitWindow)
  extractComparisonWindows(question).forEach(window => timeWindowSet.add(window))
  const normalized = normalizeWhitespace(question).toLowerCase()
  PHRASE_WINDOW_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = PHRASE_WINDOW_REGEX.exec(normalized))) {
    const unit = match[2] as 'week' | 'month' | 'year'
    timeWindowSet.add(`1 ${pluralizeUnit(unit, 1)}`)
  }
  if (containsKeyword(question, ALL_TIME_KEYWORDS)) timeWindowSet.add('all_time')
  const timeWindows = Array.from(timeWindowSet)
  const metrics: LastResponseContext['metric'][] = []
  const metric = extractMetricFromQuestion(question)
  if (metric) metrics.push(metric)
  const sessionDate = parseExplicitDate(question) ?? undefined
  return {
    exercises: exercises.length ? exercises : undefined,
    timeWindows: timeWindows.length ? timeWindows : undefined,
    metrics: metrics.length ? metrics : undefined,
    sessionDate,
  }
}

const mapAnalysisTopic = (kind: AnalysisKind): AnalysisTopic => {
  if (
    kind === 'exercise_prs' ||
    kind === 'best_sets' ||
    kind === 'top_weight_sets' ||
    kind === 'best_1rm_overall'
  ) {
    return 'prs'
  }
  if (
    kind === 'weekly_volume' ||
    kind === 'volume' ||
    kind === 'set_count' ||
    kind === 'session_count' ||
    kind === 'lowest_volume_day'
  ) {
    return 'volume'
  }
  if (
    kind === 'exercise_progression' ||
    kind === 'return_for_effort_progression' ||
    kind === 'progressive_overload' ||
    kind === 'lighter_weight_progress'
  ) {
    return 'progression'
  }
  if (kind === 'period_compare' || kind === 'top_end_efforts_compare_12m_3m') {
    return 'comparison'
  }
  if (kind === 'exercise_summary' || kind === 'set_breakdown' || kind === 'workout_timing') {
    return 'session_summary'
  }
  if (
    kind === 'muscle_group_balance' ||
    kind === 'body_part_day_split' ||
    kind === 'weekday_breakdown' ||
    kind === 'stalled_lifts' ||
    kind === 'inactive_exercises'
  ) {
    return 'comparison'
  }
  if (kind === 'other') return 'general'
  return 'general'
}

const getActiveScopeValues = <T,>(slot?: ContextSlot<T>): T[] => {
  if (!slot?.active?.length) return []
  return slot.active.map(entry => entry.value).filter(Boolean)
}

const buildScopeSummary = (state: GymChatConversationState): ContextFrame['scope'] => ({
  exercises: uniqueValues([
    ...getActiveScopeValues(state.scope?.exercises),
    ...(state.lastResponseContext?.exercises ?? []),
    ...(state.lastExercise ? [state.lastExercise] : []),
  ]),
  timeWindows: uniqueValues([
    ...getActiveScopeValues(state.scope?.timeWindows),
    ...(state.lastTimeWindow ? [state.lastTimeWindow] : []),
  ]),
  metrics: uniqueValues([
    ...getActiveScopeValues(state.scope?.metrics),
    ...(state.lastMetric ? [state.lastMetric] : []),
  ]),
  sessionDate: state.lastSessionDate,
})

const detectComparisonIntent = (input: {
  question: string
  state: GymChatConversationState
  extracted: Partial<ContextFrame['scope']>
  turnMode: TurnMode
}): ComparisonIntent | null => {
  const normalized = normalizeWhitespace(input.question).toLowerCase()
  const explicit = COMPARISON_SIGNAL_REGEX.test(normalized) || normalized.includes('compare')
  const zoomIn = ZOOM_IN_REGEX.test(normalized)
  const retry = RETRY_CUE_REGEX.test(normalized)
  const baseScope = buildScopeSummary(input.state)
  const candidateScope = input.extracted
  const dimensions: ContextDimension[] = []
  const candidateExercises = candidateScope.exercises ?? []
  const candidateWindows = candidateScope.timeWindows ?? []
  const candidateMetrics = candidateScope.metrics ?? []
  const hasNewExercise =
    candidateExercises.length &&
    baseScope.exercises.length &&
    candidateExercises.some(value => !baseScope.exercises.includes(value))
  const hasNewWindow =
    candidateWindows.length &&
    baseScope.timeWindows.length &&
    candidateWindows.some(value => !baseScope.timeWindows.includes(value))
  const hasNewMetric =
    candidateMetrics.length &&
    baseScope.metrics.length &&
    candidateMetrics.some(value => !baseScope.metrics.includes(value))
  const hasExplicitExerciseCompare = explicit && candidateExercises.length > 1
  const hasExplicitWindowCompare = explicit && candidateWindows.length > 1
  const hasExplicitMetricCompare = explicit && candidateMetrics.length > 1
  if (hasNewExercise || hasExplicitExerciseCompare) dimensions.push('exercise')
  if (hasNewWindow || hasExplicitWindowCompare) dimensions.push('timeWindow')
  if (hasNewMetric || hasExplicitMetricCompare) dimensions.push('metric')
  if (!dimensions.length) return null
  const baseFrameId = input.state.contextStack?.length
    ? input.state.contextStack[input.state.contextStack.length - 1]?.id
    : undefined
  if ((zoomIn || retry) && hasNewWindow && dimensions.length === 1 && dimensions[0] === 'timeWindow') {
    return {
      dimensions,
      baseFrameId,
      baseScope,
      candidateScope,
      explicit: true,
      status: 'ready',
      mode: 'replace',
    }
  }
  if (!explicit && input.turnMode === 'analysis_followup') {
    return {
      dimensions,
      baseFrameId,
      baseScope,
      candidateScope,
      explicit: false,
      status: 'ready',
      mode: 'replace',
    }
  }
  const shouldCompare =
    explicit || candidateExercises.length > 1 || candidateWindows.length > 1 || candidateMetrics.length > 1
  return {
    dimensions,
    baseFrameId,
    baseScope,
    candidateScope,
    explicit,
    status: 'ready',
    mode: shouldCompare ? 'compare' : 'replace',
  }
}

const buildComparisonClarification = (intent: ComparisonIntent) => {
  const dims = intent.dimensions.join(', ')
  return `Do you want to compare the new ${dims} to the current scope, or switch to it only? Reply (a or 1) compare, (b or 2) switch.`
}

const resolveComparisonChoice = (message: string) => {
  const normalized = normalizeWhitespace(message).toLowerCase()
  if (!normalized) return null
  const choiceMatch = normalized.match(/^(?:option|choice)?\s*([ab12])(?:[\s\).,:-]|$)/i)
  if (choiceMatch?.[1]) {
    return choiceMatch[1].toLowerCase() === 'a' || choiceMatch[1] === '1' ? 'compare' : 'replace'
  }
  if (
    normalized === 'yes' ||
    normalized.includes('compare') ||
    normalized.includes('vs') ||
    normalized === 'a' ||
    normalized === '1'
  ) {
    return 'compare'
  }
  if (
    normalized === 'no' ||
    normalized.includes('switch') ||
    normalized.includes('only') ||
    normalized === 'b' ||
    normalized === '2'
  ) {
    return 'replace'
  }
  return null
}

const formatScopeLabel = (scope: Partial<ContextFrame['scope']>) => {
  const parts: string[] = []
  if (scope.exercises?.length) parts.push(scope.exercises.join(', '))
  if (scope.metrics?.length) parts.push(scope.metrics.join(', '))
  if (scope.timeWindows?.length) {
    const label = scope.timeWindows.join(', ')
    parts.push(label)
  }
  return parts.length ? parts.join(' ') : 'the current scope'
}

const buildComparisonQuestion = (intent: ComparisonIntent, fallback: string) => {
  if (!intent.baseScope || !intent.candidateScope) return `Compare ${fallback}`
  if (!intent.baseScope.exercises?.length && intent.candidateScope.exercises?.length && intent.candidateScope.exercises.length > 1) {
    return `Compare ${intent.candidateScope.exercises.join(' vs ')}.`
  }
  if (!intent.baseScope.metrics?.length && intent.candidateScope.metrics?.length && intent.candidateScope.metrics.length > 1) {
    return `Compare ${intent.candidateScope.metrics.join(' vs ')}.`
  }
  if (!intent.baseScope.timeWindows?.length && intent.candidateScope.timeWindows?.length && intent.candidateScope.timeWindows.length > 1) {
    return `Compare ${intent.candidateScope.timeWindows.join(' vs ')}.`
  }
  const baseLabel = formatScopeLabel(intent.baseScope)
  const candidateLabel = formatScopeLabel(intent.candidateScope)
  if (!candidateLabel || candidateLabel === 'the current scope') return `Compare ${fallback}`
  return `Compare ${baseLabel} vs ${candidateLabel}.`
}

const detectTopicShift = (input: {
  question: string
  state: GymChatConversationState
  nextAnalysisKind?: AnalysisKind
  turnMode: TurnMode
  comparison?: ComparisonIntent | null
}) => {
  const normalized = normalizeWhitespace(input.question).toLowerCase()
  if (TOPIC_RESET_REGEX.test(normalized)) return true
  if (!input.nextAnalysisKind || !input.state.lastAnalysis?.kind) return false
  if (input.comparison?.dimensions?.length) return false
  const lastTopic = mapAnalysisTopic(input.state.lastAnalysis.kind)
  const nextTopic = mapAnalysisTopic(input.nextAnalysisKind)
  if (lastTopic === nextTopic) return false
  if (input.turnMode === 'analysis_followup' && !ANALYSIS_VERB_REGEX.test(normalized)) {
    return false
  }
  return true
}

const MULTI_CONTEXT_EXERCISE_CUE_REGEX =
  /\b(that|those|these|it|them|same|last session|last workout|previous|prior|before|earlier|compare)\b/i
const EXERCISE_OVERVIEW_CUE_REGEX =
  /\b(which|what|top|most|all)\s+exercises?\b|\bexercises?\s+(overview|summary|breakdown)\b/i
const EXERCISE_BREAKDOWN_CUE_REGEX =
  /\b(breakdown|over time|trend|per\s+week|per\s+month|by\s+week|by\s+month)\b/i

const shouldClarifyExerciseChoice = (input: {
  question: string
  state?: GymChatConversationState | null
  turnMode?: string
}): string[] | null => {
  const options = input.state?.lastResponseContext?.exercises ?? []
  if (options.length < 2) return null
  if (extractExerciseTarget(input.question)) return null
  const normalized = normalizeWhitespace(input.question).toLowerCase()
  if (DAY_OF_WEEK_CUE_REGEX.test(normalized)) return null
  if (RETRY_CUE_REGEX.test(normalized)) return null
  if (hasExplicitTimeWindow(input.question) || TIME_WINDOW_CUE_REGEX.test(normalized)) return null
  if (EXERCISE_OVERVIEW_CUE_REGEX.test(normalized) || EXERCISE_BREAKDOWN_CUE_REGEX.test(normalized)) return null
  // Don't clarify if the question is asking for multi-exercise analysis
  if (/biggest.*swing|week.*week|variab|fluctuat|change/i.test(normalized)) return null
  const wordCount = normalized.split(' ').filter(Boolean).length
  const isShort = wordCount <= 10 || normalized.length <= 80
  const hasCue = MULTI_CONTEXT_EXERCISE_CUE_REGEX.test(normalized) || containsPronounReference(input.question)
  const hasAnalysisCue = /compar|analyz|break.*down|biggest|most|trend|progress/i.test(normalized)
  if (input.turnMode === 'analysis_followup' && isShort && hasCue && !hasAnalysisCue) return options
  if (hasCue && isShort && !hasAnalysisCue) return options
  return null
}

const ANALYSIS_KINDS: AnalysisKind[] = [
  'muscle_group_balance',
  'return_for_effort_volume',
  'return_for_effort_progression',
  'stalled_lifts',
  'lighter_weight_progress',
  'exercise_prs',
  'best_sets',
  'set_breakdown',
  'exercise_summary',
  'exercise_progression',
  'top_weight_sets',
  'lowest_volume_day',
  'favorite_split_day',
  'body_part_day_split',
  'weekday_breakdown',
  'weekly_volume',
  'period_compare',
  'top_end_efforts',
  'top_end_efforts_compare_12m_3m',
  'progressive_overload',
  'set_count',
  'volume',
  'session_count',
  'other',
]

const normalizeAnalysisKind = (value: unknown): AnalysisKind | undefined => {
  if (typeof value !== 'string') return undefined
  return ANALYSIS_KINDS.find(kind => kind === value) ?? undefined
}

const normalizeAnalysisTargets = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const targets = value.map(entry => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
  return targets.length ? targets : undefined
}

const normalizePendingClarification = (value: unknown): PendingClarification | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const kind = (value as PendingClarification).kind
  if (kind === 'return_for_effort_metric') {
    return { kind }
  }
  if (kind === 'timeframe') {
    const timeframeObj = value as { kind: string; question?: string }
    const question =
      typeof timeframeObj.question === 'string'
        ? timeframeObj.question
        : undefined
    return question ? { kind, question } : { kind }
  }
  if (kind === 'terse_input') {
    const raw = value as { kind: string; input?: string; suggestions?: unknown }
    const input =
      typeof raw.input === 'string' && raw.input.trim()
        ? raw.input.trim()
        : undefined
    const suggestions = Array.isArray(raw.suggestions)
      ? raw.suggestions.map(entry => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
      : []
    return input ? { kind, input, suggestions } : undefined
  }
  if (kind === 'exercise_choice') {
    const raw = value as { kind: string; question?: unknown; options?: unknown }
    const question =
      typeof raw.question === 'string' && raw.question.trim()
        ? raw.question.trim()
        : undefined
    const options = Array.isArray(raw.options)
      ? raw.options.map(entry => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
      : []
    return question && options.length ? { kind, question, options } : undefined
  }
  if (kind === 'comparison') {
    const raw = value as { kind: string; question?: unknown }
    const question =
      typeof raw.question === 'string' && raw.question.trim()
        ? raw.question.trim()
        : undefined
    return question ? { kind, question } : undefined
  }
  return undefined
}

const normalizeTargetMuscleConstraint = (value: unknown): TargetMuscleConstraint | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as TargetMuscleConstraint
  if (!Array.isArray(raw.include) || raw.include.length === 0) return undefined
  const include = raw.include
    .map(entry => normalizeMuscleName(entry) ?? entry)
    .filter(Boolean)
  if (!include.length) return undefined
  const exclude = Array.isArray(raw.exclude)
    ? raw.exclude.map(entry => normalizeMuscleName(entry) ?? entry).filter(Boolean)
    : []
  const excludeFiltered = exclude.filter(entry => !include.includes(entry))
  return {
    include,
    exclude: excludeFiltered.length ? excludeFiltered : undefined,
    strict: raw.strict ? true : undefined,
  }
}

const normalizeWorkoutPlanMeta = (value: unknown): WorkoutPlanAnalysisMeta | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as WorkoutPlanAnalysisMeta
  const targetsMuscles = normalizeTargetMuscleConstraint(raw.targetsMuscles)
  const usesHistoricalLifts = raw.usesHistoricalLifts ? true : undefined
  const goal =
    raw.goal === 'strength' || raw.goal === 'hypertrophy' || raw.goal === 'endurance' ? raw.goal : undefined
  if (!targetsMuscles && !usesHistoricalLifts && !goal) return undefined
  return {
    targetsMuscles,
    usesHistoricalLifts,
    goal,
  }
}

const normalizeContextMetric = (value: unknown): LastResponseContext['metric'] | undefined => {
  if (
    value === 'volume' ||
    value === 'sets' ||
    value === 'reps' ||
    value === '1rm' ||
    value === 'weight' ||
    value === 'sessions'
  ) {
    return value
  }
  return undefined
}

const normalizeLastResponseContext = (value: unknown): LastResponseContext | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as LastResponseContext
  const exercise = typeof raw.exercise === 'string' && raw.exercise.trim() ? raw.exercise.trim() : undefined
  const exercises = Array.isArray(raw.exercises)
    ? raw.exercises.map(entry => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
    : []
  const timeWindow =
    typeof raw.timeWindow === 'string' && raw.timeWindow.trim() ? raw.timeWindow.trim() : undefined
  const sessionDate = typeof raw.sessionDate === 'string' && raw.sessionDate.trim() ? raw.sessionDate.trim() : undefined
  const metric = normalizeContextMetric(raw.metric)
  const dataPoints = Array.isArray(raw.dataPoints)
    ? raw.dataPoints
        .map(entry => {
          if (!entry || typeof entry !== 'object') return null
          const record = entry as LastResponseDataPoint
          if (typeof record.exercise !== 'string' || !record.exercise.trim()) return null
          const toNumber = (value: unknown) => {
            if (typeof value === 'number' && Number.isFinite(value)) return value
            if (typeof value === 'string' && value.trim()) {
              const parsed = Number(value)
              return Number.isFinite(parsed) ? parsed : null
            }
            return null
          }
          const weight = toNumber(record.weight)
          const reps = toNumber(record.reps)
          const volume = toNumber(record.volume)
          const e1rm = toNumber(record.e1rm)
          const date = typeof record.date === 'string' && record.date.trim() ? record.date.trim() : undefined
          const dataPoint: LastResponseDataPoint = {
            exercise: record.exercise.trim(),
            ...(weight != null ? { weight } : {}),
            ...(reps != null ? { reps } : {}),
            ...(volume != null ? { volume } : {}),
            ...(e1rm != null ? { e1rm } : {}),
            ...(date ? { date } : {}),
          }
          return dataPoint
        })
        .filter((entry): entry is LastResponseDataPoint => Boolean(entry))
    : []
  if (!exercise && !exercises.length && !sessionDate && !metric && !dataPoints.length && !timeWindow) return undefined
  return {
    exercise,
    exercises: exercises.length ? exercises : undefined,
    timeWindow,
    sessionDate,
    metric,
    dataPoints: dataPoints.length ? dataPoints : undefined,
  }
}

const normalizeContextValue = <T,>(
  value: unknown,
  isValid: (value: unknown) => value is T,
): ContextValue<T> | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as ContextValue<T>
  if (!isValid(raw.value)) return undefined
  const source =
    raw.source === 'explicit' ||
    raw.source === 'implicit' ||
    raw.source === 'resolved' ||
    raw.source === 'sticky' ||
    raw.source === 'history'
      ? raw.source
      : 'implicit'
  return {
    value: raw.value,
    source,
    turnId: typeof raw.turnId === 'string' ? raw.turnId : '',
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : '',
  }
}

const normalizeContextSlot = <T,>(
  value: unknown,
  isValid: (value: unknown) => value is T,
): ContextSlot<T> => {
  const slot = value as ContextSlot<T>
  const active = Array.isArray(slot?.active)
    ? slot.active.map(entry => normalizeContextValue(entry, isValid)).filter(Boolean) as ContextValue<T>[]
    : []
  const sticky = normalizeContextValue(slot?.sticky, isValid)
  const lastExplicit = normalizeContextValue(slot?.lastExplicit, isValid)
  const primary = normalizeContextValue(slot?.primary, isValid)
  return {
    active,
    sticky,
    lastExplicit,
    primary,
  }
}

const normalizeContextScope = (value: unknown): ContextScope => {
  const isString = (entry: unknown): entry is string => typeof entry === 'string' && entry.trim().length > 0
  const isMetric = (entry: unknown): entry is LastResponseContext['metric'] => normalizeContextMetric(entry) !== undefined
  const raw = value as ContextScope
  return {
    exercises: normalizeContextSlot(raw?.exercises, isString),
    timeWindows: normalizeContextSlot(raw?.timeWindows, isString),
    metrics: normalizeContextSlot(raw?.metrics, isMetric),
    sessionDates: normalizeContextSlot(raw?.sessionDates, isString),
  }
}

const normalizeComparisonIntent = (value: unknown): ComparisonIntent | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as ComparisonIntent
  const dimensions = Array.isArray(raw.dimensions)
    ? raw.dimensions.filter(
        entry => entry === 'exercise' || entry === 'timeWindow' || entry === 'metric' || entry === 'sessionDate',
      )
    : []
  if (!dimensions.length) return undefined
  const status = raw.status === 'pending' || raw.status === 'ready' || raw.status === 'clarify' ? raw.status : 'pending'
  const mode = raw.mode === 'replace' || raw.mode === 'compare' ? raw.mode : undefined
  return {
    dimensions,
    baseFrameId: typeof raw.baseFrameId === 'string' ? raw.baseFrameId : undefined,
    baseScope: raw.baseScope ?? {},
    candidateScope: raw.candidateScope ?? {},
    explicit: Boolean(raw.explicit),
    status,
    mode,
    clarificationQuestion:
      typeof raw.clarificationQuestion === 'string' && raw.clarificationQuestion.trim()
        ? raw.clarificationQuestion.trim()
        : undefined,
  }
}

const normalizeContextFrame = (value: unknown): ContextFrame | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as ContextFrame
  const analysisKind = normalizeAnalysisKind(raw.analysisKind)
  if (!analysisKind) return undefined
  const analysisTopic = raw.analysisTopic ?? mapAnalysisTopic(analysisKind)
  const scope = raw.scope ?? { exercises: [], timeWindows: [], metrics: [] }
  return {
    id: typeof raw.id === 'string' ? raw.id : randomUUID(),
    analysisKind,
    analysisTopic,
    scope: {
      exercises: Array.isArray(scope.exercises) ? scope.exercises.filter(Boolean) : [],
      timeWindows: Array.isArray(scope.timeWindows) ? scope.timeWindows.filter(Boolean) : [],
      metrics: Array.isArray(scope.metrics)
        ? scope.metrics.map(entry => normalizeContextMetric(entry)).filter(Boolean) as LastResponseContext['metric'][]
        : [],
      sessionDate: typeof scope.sessionDate === 'string' ? scope.sessionDate : undefined,
    },
    response: raw.response ?? {},
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    sourceTurnId: typeof raw.sourceTurnId === 'string' ? raw.sourceTurnId : '',
  }
}

const normalizeHistory = (value: unknown): SessionTurnSummary[] => {
  if (!Array.isArray(value)) return []
  return value
    .map(entry => {
      if (!entry || typeof entry !== 'object') return null
      const raw = entry as SessionTurnSummary
      if (typeof raw.text !== 'string') return null
      const analysisKind = normalizeAnalysisKind(raw.analysisKind)
      const analysisTopic = raw.analysisTopic ?? (analysisKind ? mapAnalysisTopic(analysisKind) : undefined)
      const normalized: SessionTurnSummary = {
        id: typeof raw.id === 'string' ? raw.id : '',
        role: raw.role === 'assistant' ? 'assistant' : 'user',
        text: raw.text,
        timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : '',
      }
      if (analysisKind) normalized.analysisKind = analysisKind
      if (analysisTopic) normalized.analysisTopic = analysisTopic
      if (raw.scope && typeof raw.scope === 'object') {
        normalized.scope = raw.scope
      }
      if (raw.intent === 'question' || raw.intent === 'followup' || raw.intent === 'clarification') {
        normalized.intent = raw.intent
      }
      return normalized
    })
    .filter((entry): entry is SessionTurnSummary => Boolean(entry))
}

const normalizeConversationState = (value: unknown): GymChatConversationState => {
  if (!value || typeof value !== 'object') return {}
  const state = value as GymChatConversationState
  const lastAnalysisKind = normalizeAnalysisKind(state.lastAnalysis?.kind)
  const lastErrorKind = normalizeAnalysisKind(state.lastError?.analysisKind)
  const lastPlanMeta = normalizeWorkoutPlanMeta(state.lastPlanMeta)
  const lastAnalysisTargets = normalizeAnalysisTargets(state.lastAnalysis?.targets)
  const lastResponseContext = normalizeLastResponseContext(state.lastResponseContext)
  const scope = normalizeContextScope(state.scope)
  const formatConstraints = normalizeFormatConstraints(state.formatConstraints)
  const baseFormatConstraints = normalizeFormatConstraints(state.baseFormatConstraints)
  const contextStack = Array.isArray(state.contextStack)
    ? state.contextStack.map(entry => normalizeContextFrame(entry)).filter(Boolean) as ContextFrame[]
    : []
  const pendingComparison = normalizeComparisonIntent(state.pendingComparison)
  const history = normalizeHistory(state.history)
  const memoryBudget = state.memoryBudget && typeof state.memoryBudget === 'object'
    ? {
        maxTurns: Number.isFinite(state.memoryBudget.maxTurns) ? state.memoryBudget.maxTurns : DEFAULT_MEMORY_BUDGET.maxTurns,
        maxBytes: Number.isFinite(state.memoryBudget.maxBytes) ? state.memoryBudget.maxBytes : DEFAULT_MEMORY_BUDGET.maxBytes,
      }
    : undefined
  const lastExercise =
    typeof state.lastExercise === 'string' && state.lastExercise.trim() ? state.lastExercise.trim() : undefined
  const lastSessionDate =
    typeof state.lastSessionDate === 'string' && state.lastSessionDate.trim()
      ? state.lastSessionDate.trim()
      : undefined
  const lastTimeWindow =
    typeof state.lastTimeWindow === 'string' && state.lastTimeWindow.trim()
      ? state.lastTimeWindow.trim()
      : undefined
  const lastMetric = normalizeContextMetric(state.lastMetric)
  const errorType =
    state.lastError?.type === 'sql' || state.lastError?.type === 'explanation' || state.lastError?.type === 'policy'
      ? state.lastError.type
      : undefined
  return {
    lastAnalysis: lastAnalysisKind
      ? {
          kind: lastAnalysisKind,
          canonicalPlanId: state.lastAnalysis?.canonicalPlanId,
          timeframe: state.lastAnalysis?.timeframe,
          targets: lastAnalysisTargets,
        }
      : undefined,
    lastPlanMeta,
    pendingClarification: normalizePendingClarification(state.pendingClarification),
    lastError: errorType
      ? {
          type: errorType,
          analysisKind: lastErrorKind,
          canonicalPlanId: state.lastError?.canonicalPlanId,
        }
      : undefined,
    sessionId: typeof state.sessionId === 'string' && state.sessionId.trim() ? state.sessionId.trim() : undefined,
    turnIndex: Number.isFinite(state.turnIndex) ? state.turnIndex : undefined,
    scope,
    contextStack: contextStack.length ? contextStack : undefined,
    pendingComparison: pendingComparison ?? null,
    history: history.length ? history : undefined,
    memoryBudget,
    formatConstraints,
    baseFormatConstraints,
    lastResponseContext,
    lastExercise: lastExercise ?? lastResponseContext?.exercise,
    lastSessionDate: lastSessionDate ?? lastResponseContext?.sessionDate,
    lastTimeWindow: lastTimeWindow ?? lastResponseContext?.timeWindow ?? state.lastAnalysis?.timeframe,
    lastMetric: lastMetric ?? lastResponseContext?.metric,
  }
}

const shouldKeepReturnEffortFollowUp = (question: string) => {
  const normalized = normalizeWhitespace(question).toLowerCase()
  const followUps = [
    RETURN_EFFORT_VOLUME_QUESTION,
    `${RETURN_EFFORT_VOLUME_QUESTION}?`,
    RETURN_EFFORT_PROGRESSION_QUESTION,
    `${RETURN_EFFORT_PROGRESSION_QUESTION}?`,
  ].map(entry => normalizeWhitespace(entry).toLowerCase())
  return followUps.includes(normalized)
}

const resolveReturnEffortAnalysisKind = (question: string): AnalysisKind | undefined => {
  const normalized = normalizeWhitespace(question).toLowerCase()
  if (normalized === normalizeWhitespace(RETURN_EFFORT_VOLUME_QUESTION).toLowerCase()) {
    return 'return_for_effort_volume'
  }
  if (
    normalized === normalizeWhitespace(RETURN_EFFORT_PROGRESSION_QUESTION).toLowerCase() ||
    RETURN_EFFORT_PROGRESSION_REGEX.test(question)
  ) {
    return 'return_for_effort_progression'
  }
  return undefined
}

const resolveReturnEffortChoice = (
  messages: GymChatMessage[],
  question: string,
  pendingClarification?: PendingClarification,
): {
  messages: GymChatMessage[]
  question: string
  didResolve: boolean
  clearPending: boolean
  analysisKind?: AnalysisKind
} => {
  if (!pendingClarification || pendingClarification.kind !== 'return_for_effort_metric') {
    return { messages, question, didResolve: false, clearPending: false, analysisKind: undefined }
  }
  if (shouldKeepReturnEffortFollowUp(question)) {
    const analysisKind: AnalysisKind = normalizeWhitespace(question).toLowerCase().includes('total volume')
      ? 'return_for_effort_volume'
      : 'return_for_effort_progression'
    return { messages, question, didResolve: true, clearPending: true, analysisKind }
  }
  const normalized = normalizeWhitespace(question).toLowerCase()
  if (normalized.includes('volume') || normalized.includes('total')) {
    const analysisKind: AnalysisKind = 'return_for_effort_volume'
    return { messages, question: RETURN_EFFORT_VOLUME_QUESTION, didResolve: true, clearPending: true, analysisKind }
  }
  if (normalized.includes('progress') || normalized.includes('over time') || normalized.includes('trend')) {
    const analysisKind: AnalysisKind = 'return_for_effort_progression'
    return { messages, question: RETURN_EFFORT_PROGRESSION_QUESTION, didResolve: true, clearPending: true, analysisKind }
  }
  const match = normalized.match(RETURN_EFFORT_CHOICE_REGEX)
  if (!match?.[1]) {
    return { messages, question, didResolve: false, clearPending: true, analysisKind: undefined }
  }
  const choice = match[1].toLowerCase()
  const isVolume = choice === 'a' || choice === '1'
  const isProgression = choice === 'b' || choice === '2'
  if (!isVolume && !isProgression) {
    return { messages, question, didResolve: false, clearPending: true, analysisKind: undefined }
  }
  const rewritten = isVolume ? RETURN_EFFORT_VOLUME_QUESTION : RETURN_EFFORT_PROGRESSION_QUESTION
  const updated = [...messages]
  for (let i = updated.length - 1; i >= 0; i -= 1) {
    if (updated[i].role === 'user') {
      updated[i] = { ...updated[i], content: rewritten }
      break
    }
  }
  const analysisKind: AnalysisKind = isVolume ? 'return_for_effort_volume' : 'return_for_effort_progression'
  return { messages: updated, question: rewritten, didResolve: true, clearPending: true, analysisKind }
}

const buildTerseClarificationFollowUps = (exercise: string) => [
  `Show my most recent ${exercise} session.`,
  `Show ${exercise} progression over time.`,
  `Show total volume and sets for ${exercise} over the last 90 days.`,
  `Show best sets or PRs for ${exercise}.`,
]

const resolveTerseClarification = (
  question: string,
  pendingClarification?: PendingClarification,
): { question: string; didResolve: boolean } => {
  if (!pendingClarification || pendingClarification.kind !== 'terse_input') {
    return { question, didResolve: false }
  }
  const exercise = pendingClarification.input
  if (!exercise) return { question, didResolve: false }
  const normalized = normalizeWhitespace(question).toLowerCase()
  const letterToNumber: Record<string, number> = { a: 1, b: 2, c: 3, d: 4 }
  const choiceMatch = normalized.match(TERSE_CHOICE_REGEX)
  let choiceIndex = -1
  if (choiceMatch?.[1]) {
    const choice = choiceMatch[1].toLowerCase()
    const num = letterToNumber[choice] ?? Number(choice)
    if (num >= 1 && num <= 4) choiceIndex = num - 1
  }
  if (choiceIndex === 0 || normalized.includes('last') || normalized.includes('recent') || normalized.includes('session')) {
    return { question: `Show my most recent ${exercise} session.`, didResolve: true }
  }
  if (choiceIndex === 1 || normalized.includes('progress')) {
    return { question: `Show ${exercise} progression over time.`, didResolve: true }
  }
  if (choiceIndex === 2 || normalized.includes('volume') || normalized.includes('sets')) {
    return { question: `Show total volume and sets for ${exercise} over the last ${DEFAULT_TIME_WINDOW}.`, didResolve: true }
  }
  if (choiceIndex === 3 || normalized.includes('best') || normalized.includes('pr')) {
    return { question: `Show best sets or PRs for ${exercise}.`, didResolve: true }
  }
  const containsExercise = normalized.includes(exercise.toLowerCase())
  const rewritten = containsExercise ? question : `${question} for ${exercise}`
  return { question: rewritten, didResolve: true }
}

const buildExerciseChoicePrompt = (options: string[]) => {
  const list = options.slice(0, 4)
  const lines = list.map((option, index) => {
    const letter = String.fromCharCode('a'.charCodeAt(0) + index)
    return `(${letter} or ${index + 1}) ${option}`
  })
  const more = 'Reply with a letter, number, or type the exercise name.'
  return [
    'Which exercise did you mean from the last result?',
    '',
    ...lines,
    more,
  ].join('\n')
}

const buildCorrectionAcknowledgement = (exerciseTarget?: string | null) => {
  if (exerciseTarget) {
    return `Got it - focusing on ${exerciseTarget} instead.`
  }
  return 'Got it - focusing on the corrected request instead.'
}

const applyCorrectionAcknowledgement = (message: string, acknowledgement?: string | null) => {
  if (!acknowledgement) return message
  return `${acknowledgement}\n\n${message}`
}

const resolveExerciseChoice = (
  question: string,
  pendingClarification?: PendingClarification,
): { question: string; didResolve: boolean; chosen?: string } => {
  if (!pendingClarification || pendingClarification.kind !== 'exercise_choice') {
    return { question, didResolve: false }
  }
  const normalized = normalizeWhitespace(question).toLowerCase()
  const options = pendingClarification.options ?? []
  let chosen: string | null = null
  const letterToIndex = (letter: string): number => letter.charCodeAt(0) - 'a'.charCodeAt(0)
  const choiceMatch = normalized.match(EXERCISE_CHOICE_REGEX)
  if (choiceMatch?.[1]) {
    const choice = choiceMatch[1].toLowerCase()
    let maybeIndex = -1
    if (/^[a-z]$/.test(choice)) {
      maybeIndex = letterToIndex(choice)
    } else {
      const num = Number(choice)
      if (num >= 1) maybeIndex = num - 1
    }
    if (maybeIndex >= 0 && maybeIndex < options.length) {
      chosen = options[maybeIndex]
    }
  }
  if (!chosen) {
    chosen = options.find(option => normalized.includes(option.toLowerCase())) ?? null
  }
  if (!chosen && options.length === 1) {
    chosen = options[0]
  }
  if (!chosen) {
    return { question, didResolve: false }
  }
  const baseQuestion = pendingClarification.question
  const rewritten = baseQuestion.toLowerCase().includes(chosen.toLowerCase())
    ? baseQuestion
    : `${baseQuestion} for ${chosen}`
  return { question: rewritten, didResolve: true, chosen }
}

const appendPronounContext = (
  question: string,
  resolved: { exercise?: string; dataPoint?: LastResponseDataPoint },
) => {
  if (!resolved.exercise) return question
  const parts: string[] = [resolved.exercise]
  if (resolved.dataPoint) {
    const details: string[] = []
    if (typeof resolved.dataPoint.weight === 'number') details.push(`${resolved.dataPoint.weight}lb`)
    if (typeof resolved.dataPoint.reps === 'number') details.push(`x${resolved.dataPoint.reps}`)
    if (resolved.dataPoint.date) details.push(`on ${resolved.dataPoint.date}`)
    if (details.length) {
      parts.push(details.join(' '))
    }
  }
  return `${question} (for ${parts.join(', ')})`
}

const extractMarkers = (message: string) => {
  const markers = new Set<string>()
  const regex = /\[([a-zA-Z0-9_-]+)\]/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(message))) {
    markers.add(match[1])
  }
  return markers
}

const formatCellValue = (value: unknown) => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value === 'object') return JSON.stringify(value)
  return value
}

const CANONICAL_SQL_UNSAFE_KEYWORDS = [
  'insert',
  'update',
  'delete',
  'drop',
  'alter',
  'create',
  'truncate',
  'grant',
  'revoke',
  'merge',
  'call',
  'execute',
  'vacuum',
  'copy',
]

const validateCanonicalSqlSafety = (sql: string) => {
  const trimmed = sql.trim()
  if (!trimmed) return 'Only SELECT or WITH statements are allowed.'
  const cleaned = trimmed.replace(/^\s*\/\*policy:[^*]*\*\/\s*/i, '')
  if (!cleaned) return 'Only SELECT or WITH statements are allowed.'
  const lowered = cleaned.toLowerCase()
  if (!(lowered.startsWith('select') || lowered.startsWith('with'))) {
    return 'Only SELECT or WITH statements are allowed.'
  }
  if (cleaned.includes(';')) {
    return 'Unsafe keyword detected: ;'
  }
  for (const keyword of CANONICAL_SQL_UNSAFE_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'i')
    if (pattern.test(lowered)) {
      return `Unsafe keyword detected: ${keyword}`
    }
  }
  return null
}

const inferCanonicalTimeWindow = (params: unknown[], sql?: string): GymChatTimeWindow | null => {
  const loweredSql = sql?.toLowerCase() ?? ''
  if (loweredSql.includes('policy:time_window=all_time')) return 'all_time'
  const normalized = params.map(value => String(value).toLowerCase())
  if (normalized.some(value => value.includes('all_time') || value.includes('all time'))) return 'all_time'
  const candidates = normalized
    .map(value => {
      const match = value.match(/(\d+)\s*(day|week|month|year)s?\b/)
      if (!match?.[1] || !match[2]) return null
      const count = Number(match[1])
      if (!Number.isFinite(count) || count <= 0) return null
      const unit = match[2] as 'day' | 'week' | 'month' | 'year'
      const label = `${count} ${pluralizeUnit(unit, count)}`
      const days =
        unit === 'day'
          ? count
          : unit === 'week'
            ? count * 7
            : unit === 'month'
              ? count * 30
              : count * 365
      return { label, days }
    })
    .filter((entry): entry is { label: string; days: number } => Boolean(entry))
  if (!candidates.length) return null
  const result = candidates.reduce((best, entry) => (entry.days > best.days ? entry : best)).label
  return result as GymChatTimeWindow
}

const inferCanonicalLimit = (sql: string) => {
  const match = sql.match(/\blimit\s+(\d+)\b/i)
  if (!match?.[1]) return DEFAULT_LIMIT
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT
  return Math.floor(value)
}

const inferAnalysisKindFromResponseMeta = (meta: { metricName: string | null }): AnalysisKind | undefined => {
  if (meta.metricName === 'total sets') return 'set_count'
  if (meta.metricName === 'total volume') return 'volume'
  if (meta.metricName === 'sessions') return 'session_count'
  return undefined
}

const inferTopEndWindowLabel = (query: GymChatQuery): '12 months' | '3 months' | null => {
  const paramText = query.params.map(value => String(value)).join(' ').toLowerCase()
  const purpose = query.purpose.toLowerCase()
  const combined = `${purpose} ${paramText}`
  if (combined.includes('12 months') || combined.includes('12 month')) return '12 months'
  if (combined.includes('3 months') || combined.includes('3 month')) return '3 months'
  return null
}

const buildTopEndComparisonNotes = (queries: GymChatQuery[]) => {
  const status = {
    '12 months': { hasQuery: false, hasData: false, hasError: false },
    '3 months': { hasQuery: false, hasData: false, hasError: false },
  }
  queries.forEach(query => {
    const windowLabel = inferTopEndWindowLabel(query)
    if (!windowLabel) return
    status[windowLabel].hasQuery = true
    if (query.error) {
      status[windowLabel].hasError = true
      return
    }
    if (query.rowCount > 0 || query.previewRows.length > 0) {
      status[windowLabel].hasData = true
    }
  })
  const notes: string[] = []
  ;(['12 months', '3 months'] as const).forEach(windowLabel => {
    const entry = status[windowLabel]
    if (!entry.hasQuery) {
      notes.push(
        `No ${windowLabel} query ran. State that only the available window(s) were analyzed and avoid claiming a comparison.`,
      )
      return
    }
    if (entry.hasError) {
      notes.push(
        `The ${windowLabel} window had query errors. Call out the failure and avoid claiming a full comparison.`,
      )
      return
    }
    if (!entry.hasData) {
      notes.push(
        `The ${windowLabel} window returned no rows. Mention the sparse window and avoid forcing a comparison.`,
      )
    }
  })
  return notes
}

const appendHistoryEntry = (
  history: SessionTurnSummary[] | undefined,
  entry: SessionTurnSummary,
  budget: GymChatConversationState['memoryBudget'],
) => {
  const next = [...(history ?? []), entry]
  if (!budget) return next
  const maxTurns = budget.maxTurns
  const maxBytes = budget.maxBytes
  let trimmed = next
  if (trimmed.length > maxTurns) {
    trimmed = trimmed.slice(trimmed.length - maxTurns)
  }
  const byteSize = (entries: SessionTurnSummary[]) => JSON.stringify(entries).length
  while (byteSize(trimmed) > maxBytes && trimmed.length > 1) {
    trimmed = trimmed.slice(1)
  }
  return trimmed
}

const upsertHistoryEntry = (
  history: SessionTurnSummary[] | undefined,
  entry: SessionTurnSummary,
  budget: GymChatConversationState['memoryBudget'],
) => {
  const existing = history ?? []
  const index = existing.findIndex(item => item.id === entry.id)
  if (index === -1) {
    return appendHistoryEntry(existing, entry, budget)
  }
  const prior = existing[index]
  const merged: SessionTurnSummary = {
    ...prior,
    ...entry,
    scope: entry.scope ?? prior.scope,
    analysisKind: entry.analysisKind ?? prior.analysisKind,
    analysisTopic: entry.analysisTopic ?? prior.analysisTopic,
    intent: entry.intent ?? prior.intent,
  }
  const next = [...existing.slice(0, index), merged, ...existing.slice(index + 1)]
  if (!budget) return next
  if (next.length > budget.maxTurns) {
    return next.slice(next.length - budget.maxTurns)
  }
  return next
}

const resetScopeToSticky = (scope?: ContextScope): ContextScope => {
  const ensureSlot = <T,>(slot?: ContextSlot<T>) => {
    const sticky = slot?.sticky
    const active = sticky ? [sticky] : []
    return {
      active,
      primary: sticky,
      sticky,
      lastExplicit: slot?.lastExplicit ?? sticky,
    }
  }
  return {
    exercises: ensureSlot(scope?.exercises),
    timeWindows: ensureSlot(scope?.timeWindows),
    metrics: ensureSlot(scope?.metrics),
    sessionDates: ensureSlot(scope?.sessionDates),
  }
}

const resetConversationForTopicShift = (state: GymChatConversationState) => ({
  ...state,
  lastAnalysis: undefined,
  lastResponseContext: undefined,
  pendingComparison: null,
  pendingClarification: null,
  contextStack: [],
  lastError: undefined,
  scope: resetScopeToSticky(state.scope),
})

const inferTopicFromIntent = (intent?: IntentType): AnalysisTopic | null => {
  if (!intent) return null
  if (intent === 'planning') return 'planning'
  if (intent === 'comparison') return 'comparison'
  if (intent === 'trend') return 'progression'
  if (intent === 'diagnostic') return 'comparison'
  return 'general'
}

const detectTopicShiftByTopic = (input: {
  question: string
  state: GymChatConversationState
  nextTopic?: AnalysisTopic | null
  turnMode: TurnMode
  comparison?: ComparisonIntent | null
  confidence?: number
}) => {
  const normalized = normalizeWhitespace(input.question).toLowerCase()
  if (TOPIC_RESET_REGEX.test(normalized)) return true
  const confidence = Number.isFinite(input.confidence) ? input.confidence : undefined
  if (confidence != null && confidence < TOPIC_SHIFT_CONFIDENCE_THRESHOLD) return false
  if (!input.nextTopic || !input.state.lastAnalysis?.kind) return false
  if (input.comparison?.dimensions?.length) return false
  const lastTopic = mapAnalysisTopic(input.state.lastAnalysis.kind)
  if (lastTopic === input.nextTopic) return false
  if (input.turnMode === 'analysis_followup' && !ANALYSIS_VERB_REGEX.test(normalized)) {
    return false
  }
  return true
}

const recordUserTurn = (input: {
  state: GymChatConversationState
  question: string
  turnId: string
  timestamp: string
  turnMode: TurnMode
  scope?: ContextScope
}) => {
  const scope = input.scope ?? input.state.scope
  const entry: SessionTurnSummary = {
    id: input.turnId,
    role: 'user',
    text: input.question,
    intent:
      input.turnMode === 'analysis_followup'
        ? 'followup'
        : input.turnMode === 'clarification_answer'
          ? 'clarification'
          : 'question',
    scope: scope
      ? {
          exercises: getActiveScopeValues(scope.exercises),
          timeWindows: getActiveScopeValues(scope.timeWindows),
          metrics: getActiveScopeValues(scope.metrics),
          sessionDate: scope.sessionDates.primary?.value,
        }
      : undefined,
    timestamp: input.timestamp,
  }
  return {
    ...input.state,
    history: upsertHistoryEntry(input.state.history, entry, input.state.memoryBudget),
  }
}

const recordAssistantTurn = (input: {
  state: GymChatConversationState
  message: string
  turnId?: string
  timestamp?: string
  scope?: ContextScope
}) => {
  if (!input.message || !input.turnId) return input.state
  const scope = input.scope ?? input.state.scope
  const analysisKind = input.state.lastAnalysis?.kind
  const entry: SessionTurnSummary = {
    id: `${input.turnId}-assistant`,
    role: 'assistant',
    text: input.message,
    analysisKind,
    analysisTopic: analysisKind ? mapAnalysisTopic(analysisKind) : undefined,
    scope: scope
      ? {
          exercises: getActiveScopeValues(scope.exercises),
          timeWindows: getActiveScopeValues(scope.timeWindows),
          metrics: getActiveScopeValues(scope.metrics),
          sessionDate: scope.sessionDates.primary?.value,
        }
      : undefined,
    timestamp: input.timestamp ?? new Date().toISOString(),
  }
  return {
    ...input.state,
    history: upsertHistoryEntry(input.state.history, entry, input.state.memoryBudget),
  }
}

const updateScopeFromQuestion = (input: {
  scope?: ContextScope
  extracted: Partial<ContextFrame['scope']>
  resolved?: Partial<ContextFrame['scope']>
  comparison?: ComparisonIntent | null
  turnId: string
  timestamp: string
}) => {
  const scope = input.scope ?? buildEmptyScope()
  const applySlot = <T,>(slot: ContextSlot<T>, values: T[] | undefined, source: ContextValue<T>['source']) => {
    if (!values?.length) return slot
    const mapped = values.map(value => buildContextValue(value, source, input.turnId, input.timestamp))
    return {
      ...slot,
      active: mapped,
      primary: mapped[0],
    }
  }
  const updateSticky = <T,>(slot: ContextSlot<T>, values: T[] | undefined) => {
    if (!values?.length) return slot
    const sticky = buildContextValue(values[0], 'explicit', input.turnId, input.timestamp)
    return {
      ...slot,
      sticky,
      lastExplicit: sticky,
    }
  }
  const comparisonValues = <T,>(dimension: ContextDimension, values: T[] | undefined) => {
    if (!input.comparison?.dimensions.includes(dimension) || input.comparison?.mode === 'replace') return values
    const baseValues =
      dimension === 'timeWindow'
        ? (input.comparison.baseScope.timeWindows as T[] | undefined)
        : dimension === 'sessionDate'
          ? (input.comparison.baseScope.sessionDate ? [input.comparison.baseScope.sessionDate as T] : undefined)
          : (input.comparison.baseScope[`${dimension}s` as keyof ContextFrame['scope']] as T[] | undefined)
    const candidateValues =
      dimension === 'timeWindow'
        ? (input.comparison.candidateScope.timeWindows as T[] | undefined)
        : dimension === 'sessionDate'
          ? (input.comparison.candidateScope.sessionDate ? [input.comparison.candidateScope.sessionDate as T] : undefined)
          : (input.comparison.candidateScope[`${dimension}s` as keyof ContextFrame['scope']] as T[] | undefined)
    return uniqueValues([...(baseValues ?? []), ...(candidateValues ?? []), ...(values ?? [])])
  }
  const nextExercises = comparisonValues('exercise', input.extracted.exercises ?? input.resolved?.exercises)
  const nextTimeWindows = comparisonValues('timeWindow', input.extracted.timeWindows ?? input.resolved?.timeWindows)
  const nextMetrics = comparisonValues('metric', input.extracted.metrics ?? input.resolved?.metrics)
  const explicitSessionDate = input.extracted.sessionDate ? [input.extracted.sessionDate] : undefined
  const nextSessionDates = comparisonValues(
    'sessionDate',
    input.resolved?.sessionDate ? [input.resolved.sessionDate] : explicitSessionDate,
  )
  const exerciseSource: ContextValue<string>['source'] =
    input.extracted.exercises?.length ? 'explicit' : input.resolved?.exercises?.length ? 'resolved' : 'sticky'
  const timeWindowSource: ContextValue<string>['source'] =
    input.extracted.timeWindows?.length ? 'explicit' : input.resolved?.timeWindows?.length ? 'resolved' : 'sticky'
  const metricSource: ContextValue<LastResponseContext['metric']>['source'] =
    input.extracted.metrics?.length ? 'explicit' : input.resolved?.metrics?.length ? 'resolved' : 'sticky'
  const exercises = applySlot(updateSticky(scope.exercises, input.extracted.exercises), nextExercises, exerciseSource)
  const timeWindows = applySlot(
    updateSticky(scope.timeWindows, input.extracted.timeWindows),
    nextTimeWindows,
    timeWindowSource,
  )
  const metrics = applySlot(updateSticky(scope.metrics, input.extracted.metrics), nextMetrics, metricSource)
  const sessionDates = applySlot(
    updateSticky(scope.sessionDates, explicitSessionDate),
    nextSessionDates,
    explicitSessionDate ? 'explicit' : 'resolved',
  )
  return {
    exercises: exercises.active.length ? exercises : scope.exercises,
    timeWindows: timeWindows.active.length ? timeWindows : scope.timeWindows,
    metrics: metrics.active.length ? metrics : scope.metrics,
    sessionDates: sessionDates.active.length ? sessionDates : scope.sessionDates,
  }
}

const updateScopeFromResponseContext = (input: {
  scope?: ContextScope
  context?: LastResponseContext
  turnId: string
  timestamp: string
}) => {
  if (!input.context) return input.scope ?? buildEmptyScope()
  const scope = input.scope ?? buildEmptyScope()
  const exercises = input.context.exercises ?? (input.context.exercise ? [input.context.exercise] : [])
  const timeWindows = input.context.timeWindow ? [input.context.timeWindow] : []
  const metrics = input.context.metric ? [input.context.metric] : []
  const sessionDates = input.context.sessionDate ? [input.context.sessionDate] : []
  const applySlot = <T,>(slot: ContextSlot<T>, values: T[] | undefined) => {
    if (!values?.length) return slot
    const mapped = values.map(value => buildContextValue(value, 'implicit', input.turnId, input.timestamp))
    const merged = [...(slot.active ?? []), ...mapped]
    const seen = new Set<string>()
    const deduped = merged.filter(entry => {
      const key = String(entry.value)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    return {
      ...slot,
      active: deduped,
      primary: slot.primary ?? mapped[0],
    }
  }
  return {
    exercises: applySlot(scope.exercises, exercises),
    timeWindows: applySlot(scope.timeWindows, timeWindows),
    metrics: applySlot(scope.metrics, metrics),
    sessionDates: applySlot(scope.sessionDates, sessionDates),
  }
}

const pushContextFrame = (input: {
  stack?: ContextFrame[]
  analysisKind: AnalysisKind
  scope: ContextScope | undefined
  context?: LastResponseContext
  turnId: string
  timestamp: string
  topicShifted?: boolean
}) => {
  const existing = input.topicShifted ? [] : (input.stack ?? [])
  const exercises = input.context?.exercises ?? (input.context?.exercise ? [input.context.exercise] : [])
  const timeWindows = input.context?.timeWindow ? [input.context.timeWindow] : []
  const metrics = input.context?.metric ? [input.context.metric] : []
  const frame: ContextFrame = {
    id: randomUUID(),
    analysisKind: input.analysisKind,
    analysisTopic: mapAnalysisTopic(input.analysisKind),
    scope: {
      exercises: exercises.length ? exercises : getActiveScopeValues(input.scope?.exercises),
      timeWindows: timeWindows.length ? timeWindows : getActiveScopeValues(input.scope?.timeWindows),
      metrics: metrics.length ? metrics : getActiveScopeValues(input.scope?.metrics),
      sessionDate: input.context?.sessionDate ?? undefined,
    },
    response: {
      dataPoints: input.context?.dataPoints,
    },
    createdAt: input.timestamp,
    sourceTurnId: input.turnId,
  }
  const next = [...existing, frame]
  if (next.length > MAX_CONTEXT_STACK) {
    return next.slice(next.length - MAX_CONTEXT_STACK)
  }
  return next
}

const applyAnalysisState = (
  state: GymChatConversationState,
  input: {
    kind: AnalysisKind
    canonicalPlanId?: string
    timeframe?: string
    targets?: string[]
  },
) => ({
  ...state,
  pendingClarification: null,
  lastAnalysis: {
    kind: input.kind,
    canonicalPlanId: input.canonicalPlanId,
    timeframe: input.timeframe,
    targets: input.targets,
  },
  lastError: undefined,
})

const applyErrorState = (
  state: GymChatConversationState,
  input: { type: 'sql' | 'explanation' | 'policy'; analysisKind?: AnalysisKind; canonicalPlanId?: string },
) => ({
  ...state,
  pendingClarification: null,
  lastError: {
    type: input.type,
    analysisKind: input.analysisKind,
    canonicalPlanId: input.canonicalPlanId,
  },
})

const applyPlanMeta = (state: GymChatConversationState, planMeta?: WorkoutPlanAnalysisMeta) => {
  if (!planMeta) return state
  return {
    ...state,
    lastPlanMeta: planMeta,
  }
}

const applyResponseContext = (
  state: GymChatConversationState,
  context: LastResponseContext | undefined,
  meta?: {
    analysisKind?: AnalysisKind
    question?: string
    turnId?: string
    timestamp?: string
    turnMode?: TurnMode
    topicShifted?: boolean
  },
) => {
  if (!context) return state
  const turnId = meta?.turnId ?? `t${state.turnIndex ?? 0}`
  const timestamp = meta?.timestamp ?? new Date().toISOString()
  const nextScope = updateScopeFromResponseContext({
    scope: state.scope,
    context,
    turnId,
    timestamp,
  })
  const nextStack =
    meta?.analysisKind
      ? pushContextFrame({
          stack: state.contextStack,
          analysisKind: meta.analysisKind,
          scope: nextScope,
          context,
          turnId,
          timestamp,
          topicShifted: meta?.topicShifted,
        })
      : state.contextStack
  const historyEntry: SessionTurnSummary | null =
    meta?.analysisKind && meta.question
      ? {
          id: turnId,
          role: 'user',
          text: meta.question,
          analysisKind: meta.analysisKind,
          analysisTopic: mapAnalysisTopic(meta.analysisKind),
          scope: {
            exercises: nextScope.exercises.active.map(entry => entry.value),
            timeWindows: nextScope.timeWindows.active.map(entry => entry.value),
            metrics: nextScope.metrics.active.map(entry => entry.value),
            sessionDate: nextScope.sessionDates.primary?.value,
          },
          intent:
            meta.turnMode === 'analysis_followup'
              ? 'followup'
              : meta.turnMode === 'clarification_answer'
                ? 'clarification'
                : 'question',
          timestamp,
        }
      : null
  const nextHistory = historyEntry
    ? upsertHistoryEntry(state.history, historyEntry, state.memoryBudget)
    : state.history

  // Detect if this was a zoom-in/drill-down turn
  const isZoomIn =
    meta?.turnMode === 'analysis_followup' && context.timeWindow && context.timeWindow !== state.lastTimeWindow

  // If zoom-in detected, make the time window sticky
  let finalScope = nextScope
  if (isZoomIn && context.timeWindow) {
    finalScope = {
      ...nextScope,
      timeWindows: {
        ...nextScope.timeWindows,
        sticky: {
          value: context.timeWindow,
          source: 'sticky',
          turnId,
          timestamp,
        },
      },
    }
  }

  // If user explicitly asks for a different time window, clear the sticky
  const newExplicitWindow = extractExplicitWindow(meta?.question ?? '')
  if (
    newExplicitWindow &&
    state.scope?.timeWindows?.sticky?.value &&
    newExplicitWindow !== state.scope.timeWindows.sticky.value
  ) {
    finalScope = {
      ...finalScope,
      timeWindows: {
        ...finalScope.timeWindows,
        sticky: undefined,
      },
    }
  }

  return {
    ...state,
    lastResponseContext: context,
    lastExercise: context.exercise ?? state.lastExercise,
    lastSessionDate: context.sessionDate ?? state.lastSessionDate,
    lastTimeWindow: context.timeWindow ?? state.lastTimeWindow,
    lastMetric: context.metric ?? state.lastMetric,
    scope: finalScope,
    contextStack: nextStack,
    pendingComparison: null,
    history: nextHistory,
  }
}

const formatStructuredAssistantMessage = (
  message: string,
  citations?: Pick<GymChatCitation, 'marker'>[],
) => {
  const trimmed = message?.trim()
  if (!trimmed.startsWith('{')) return message
  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      return message
    }
    const sections: string[] = []
    const directAnswer = (() => {
      const record = parsed as Record<string, unknown>
      return record.answer ?? record.directAnswer ?? record.tldr ?? record.tlDr ?? record.summary
    })()
    if (directAnswer) {
      const text =
        typeof directAnswer === 'string'
          ? directAnswer
          : Array.isArray(directAnswer)
            ? directAnswer.join(' ')
            : JSON.stringify(directAnswer)
      if (text.trim()) {
        sections.push(text.trim())
      }
    }
    const read = (keys: string[]): unknown => {
      for (const key of keys) {
        if (key in (parsed as Record<string, unknown>)) {
          return (parsed as Record<string, unknown>)[key]
        }
        const lower = key.toLowerCase()
        const entry = (parsed as Record<string, unknown>)[lower]
        if (entry !== undefined) return entry
      }
      return undefined
    }
    const formatSection = (title: string, value: unknown) => {
      if (value == null) return
      if (typeof value === 'string') {
        const text = value.trim()
        if (!text) return
        sections.push(`**${title}**\n${text}`)
        return
      }
      if (Array.isArray(value)) {
        if (!value.length) return
        const bullets = value
          .map(item => {
            if (typeof item === 'string') return `- ${item}`
            if (item && typeof item === 'object') {
              return `- ${Object.entries(item)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')}`
            }
            return `- ${String(item)}`
          })
          .join('\n')
        sections.push(`**${title}**\n${bullets}`)
        return
      }
      if (typeof value === 'object') {
        sections.push(`**${title}**\n- ${JSON.stringify(value)}`)
      }
    }

    formatSection('Key findings', read(['Key findings', 'keyFindings']))
    formatSection('Training implications', read(['Training implications', 'trainingImplications']))
    formatSection('Limitations', read(['Limitations', 'limitations']))

    if (!sections.length) {
      return message
    }
    const formatted = sections.join('\n\n')
    const markers = Array.from(
      new Set((citations ?? []).map(citation => citation.marker).filter((marker): marker is string => Boolean(marker))),
    )
    const markerSuffix = markers.length ? `\n\n${markers.map(marker => `[${marker}]`).join(' ')}` : ''
    return `${formatted}${markerSuffix}`
  } catch (error) {
    return message
  }
}

const normalizeFollowUp = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const prefixMatch = trimmed.match(/^(would you like (me )?to|interested in|are you interested in)\s+/i)
  let next = prefixMatch ? trimmed.slice(prefixMatch[0].length) : trimmed
  next = next.replace(/^see\b/i, 'Show')
  next = next.replace(/^view\b/i, 'Show')
  next = next.replace(/^to\s+/i, '')
  next = next.trim()
  if (!next) return null
  next = `${next.charAt(0).toUpperCase()}${next.slice(1)}`
  next = next.replace(/[.?!]+$/, '')
  return `${next}?`
}

const sanitizeFollowUps = (followUps?: string[]) => {
  if (!followUps?.length) return undefined
  const cleaned = followUps
    .map(entry => normalizeFollowUp(entry))
    .filter((entry): entry is string => Boolean(entry))
  return cleaned.length ? cleaned : undefined
}

const buildFallbackCitations = (assistantMessage: string, queries: GymChatQuery[]) => {
  const eligibleQueries = queries.filter(query => !query.error && query.previewRows.length > 0)
  if (!eligibleQueries.length) return null
  const fallbackCitations: GymChatCitation[] = []
  const existingMarkers = extractMarkers(assistantMessage)
  let nextMessage = assistantMessage
  eligibleQueries.forEach(query => {
    const previewCount = query.previewRows.length
    const rowLimit = Math.max(0, Math.min(previewCount, MAX_PREVIEW_ROWS) - 1)
    if (rowLimit < 0) return
    fallbackCitations.push({
      marker: query.id,
      queryId: query.id,
      rowStart: 0,
      rowEnd: rowLimit,
      note: query.purpose,
    })
    if (!existingMarkers.has(query.id)) {
      nextMessage = `${nextMessage} [${query.id}]`
      existingMarkers.add(query.id)
    }
  })
  if (!fallbackCitations.length) {
    return null
  }
  return {
    assistantMessage: nextMessage,
    citations: fallbackCitations,
  }
}

const selectContextQuery = (queries: GymChatQuery[]) => {
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

const coerceNumberValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const extractRowExercise = (row: Record<string, unknown>) => {
  const exercise = row.exercise ?? (row as { exercise_name?: unknown }).exercise_name ?? row.name
  return typeof exercise === 'string' && exercise.trim() ? exercise.trim() : null
}

const extractRowDate = (row: Record<string, unknown>) => {
  const candidate =
    row.session_date ??
    row.performed_at ??
    row.date ??
    row.period_start ??
    row.week_start ??
    row.month_start
  if (candidate instanceof Date) return candidate.toISOString().slice(0, 10)
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  return null
}

const inferContextMetric = (
  analysisKind: AnalysisKind,
  rows: Record<string, unknown>[],
  responseMeta?: ResponseMeta,
): LastResponseContext['metric'] | undefined => {
  const metricName = responseMeta?.metricName?.toLowerCase() ?? ''
  if (metricName.includes('volume')) return 'volume'
  if (metricName.includes('sets')) return 'sets'
  if (metricName.includes('reps')) return 'reps'
  if (metricName.includes('session')) return 'sessions'
  if (analysisKind === 'return_for_effort_volume' || analysisKind === 'volume') return 'volume'
  if (analysisKind === 'set_count') return 'sets'
  if (analysisKind === 'session_count') return 'sessions'
  if (analysisKind === 'exercise_prs' || analysisKind === 'best_sets' || analysisKind === 'top_weight_sets') {
    return rows.some(row => row.est_1rm != null || row.avg_est_1rm != null) ? '1rm' : 'weight'
  }
  if (
    analysisKind === 'exercise_progression' ||
    analysisKind === 'return_for_effort_progression' ||
    analysisKind === 'progressive_overload'
  ) {
    return '1rm'
  }
  if (rows.some(row => row.est_1rm != null || row.avg_est_1rm != null)) return '1rm'
  if (rows.some(row => row.weight != null || row.avg_weight != null)) return 'weight'
  if (rows.some(row => row.total_volume != null || row.volume != null)) return 'volume'
  if (rows.some(row => row.total_sets != null || row.set_count != null)) return 'sets'
  return undefined
}

const buildLastResponseContext = (input: {
  question: string
  analysisKind: AnalysisKind
  queries: GymChatQuery[]
  responseMeta?: ResponseMeta
  exerciseTarget?: string | null
  timeWindow?: string | null
}): LastResponseContext | undefined => {
  const primary = selectContextQuery(input.queries)
  if (!primary) return undefined
  const rows = primary.previewRows ?? []
  if (!rows.length && !input.exerciseTarget) return undefined
  const exercises = new Set<string>()
  const dataPoints: LastResponseContext['dataPoints'] = []
  rows.slice(0, 6).forEach(row => {
    const exercise = extractRowExercise(row as Record<string, unknown>)
    if (exercise) {
      exercises.add(exercise)
    }
    if (!exercise) return
    const weight = coerceNumberValue((row as Record<string, unknown>).weight ?? (row as any).avg_weight)
    const reps = coerceNumberValue((row as Record<string, unknown>).reps)
    const volume = coerceNumberValue((row as Record<string, unknown>).total_volume ?? (row as any).volume)
    const e1rm = coerceNumberValue((row as Record<string, unknown>).est_1rm ?? (row as any).avg_est_1rm)
    const date = extractRowDate(row as Record<string, unknown>)
    dataPoints.push({
      exercise,
      weight: weight ?? undefined,
      reps: reps ?? undefined,
      volume: volume ?? undefined,
      e1rm: e1rm ?? undefined,
      date: date ?? undefined,
    })
  })
  const exercisesList = Array.from(exercises)
  const exercise = exercisesList[0] ?? input.exerciseTarget ?? undefined
  const sessionDate = rows.length ? extractRowDate(rows[0] as Record<string, unknown>) ?? undefined : undefined
  const metric = inferContextMetric(input.analysisKind, rows as Record<string, unknown>[], input.responseMeta)
  const timeWindow = input.timeWindow ?? input.responseMeta?.timeWindowLabel ?? undefined
  if (!exercise && !exercisesList.length && !dataPoints.length && !sessionDate && !metric && !timeWindow) {
    return undefined
  }
  return {
    exercise,
    exercises: exercisesList.length ? exercisesList : undefined,
    dataPoints: dataPoints.length ? dataPoints : undefined,
    timeWindow,
    sessionDate,
    metric,
  }
}

const buildPlanResponseContext = (
  query: GymChatQuery | null | undefined,
  timeWindow?: string,
): LastResponseContext | undefined => {
  if (!query || query.error) return undefined
  const rows = query.previewRows ?? []
  if (!rows.length) return undefined
  const exercises = new Set<string>()
  rows.forEach(row => {
    const exercise = extractRowExercise(row as Record<string, unknown>)
    if (exercise) exercises.add(exercise)
  })
  const exercisesList = Array.from(exercises)
  if (!exercisesList.length) return undefined
  return {
    exercise: exercisesList[0],
    exercises: exercisesList,
    timeWindow,
  }
}

const buildDeloadRecommendation = (query: GymChatQuery | null | undefined) => {
  if (!query || query.error) return null
  const row = query.previewRows?.[0] as Record<string, unknown> | undefined
  if (!row) return null
  const weekCount = coerceNumberValue(row.week_count) ?? 0
  if (weekCount < 4) return null
  const avg = coerceNumberValue(row.avg_volume)
  const min = coerceNumberValue(row.min_volume)
  const max = coerceNumberValue(row.max_volume)
  if (!avg || !min || !max || avg <= 0) return null
  const highSpike = max >= avg * 1.5
  const deepDrop = min <= avg * 0.6
  if (!highSpike && !deepDrop) return null
  const avgLabel = Math.round(avg)
  const minLabel = Math.round(min)
  const maxLabel = Math.round(max)
  return `Recent weekly volume swings (avg ${avgLabel}, min ${minLabel}, max ${maxLabel}). Consider a 1-week deload: reduce volume 30-40% while keeping intensity moderate.`
}

const getProgressionStats = (analysisKind: AnalysisKind, queries: GymChatQuery[]) => {
  if (analysisKind !== 'exercise_progression' && analysisKind !== 'return_for_effort_progression') return null
  const primary = selectContextQuery(queries)
  const rows = primary?.previewRows ?? []
  if (!rows.length) return { rows: 0, periods: 0 }
  const sample = rows[0] as Record<string, unknown>
  const periodKey =
    sample.period_start != null
      ? 'period_start'
      : sample.session_date != null
        ? 'session_date'
        : sample.week_start != null
          ? 'week_start'
          : sample.month_start != null
            ? 'month_start'
            : null
  if (!periodKey) return { rows: rows.length, periods: rows.length }
  const uniquePeriods = new Set(rows.map(row => String((row as Record<string, unknown>)[periodKey] ?? ''))).size
  return { rows: rows.length, periods: uniquePeriods }
}

const isSparseProgressionResult = (analysisKind: AnalysisKind, queries: GymChatQuery[]) => {
  const stats = getProgressionStats(analysisKind, queries)
  if (!stats) return false
  return stats.rows < 3 || stats.periods < 3
}

const buildProgressionFallbackWindows = (explicitWindow: string | null, analysisKind: AnalysisKind) => {
  const candidates: string[] = []
  if (explicitWindow) {
    const normalized = explicitWindow.toLowerCase()
    if (normalized.includes('day') || normalized.includes('week')) {
      candidates.push('12 weeks', '6 months', '12 months')
    } else if (normalized.includes('month')) {
      candidates.push('12 months', '24 months')
    } else if (normalized.includes('year')) {
      candidates.push('24 months')
    } else {
      candidates.push('12 months')
    }
  } else {
    candidates.push('12 months')
  }
  if (analysisKind === 'exercise_progression') {
    candidates.push('all_time')
  }
  const seen = new Set<string>()
  const filtered = candidates.filter(window => {
    const key = window.toLowerCase()
    if (explicitWindow && explicitWindow.toLowerCase() === key) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return filtered
}

const buildReturnEffortProgressionPlanWithWindow = (lifts: SetsBaseCte, window: string) => {
  const basePlan = buildReturnEffortProgressionPlan(lifts)
  const query = basePlan.queries[0]
  return {
    queries: [
      {
        ...query,
        purpose: `Track estimated 1RM progression by exercise (weekly) over the last ${window}.`,
        params: [window],
      },
    ],
  }
}

const RELATIVE_WINDOW_REGEX = /(\d+)[-\s]*(day|week|month|year)s?\b/gi
const INTERVAL_PLACEHOLDER_REGEX = /\(\$(\d+)\)::interval/gi

type IntervalHint = 'day' | 'week' | 'month' | 'year'
type IntervalHints = IntervalHint[]

const extractIntervalHints = (text: string): IntervalHints => {
  const hints: IntervalHints = []
  if (!text) return hints
  const normalized = text.toLowerCase()
  let match: RegExpExecArray | null
  while ((match = RELATIVE_WINDOW_REGEX.exec(normalized))) {
    const value = Number(match[1])
    if (!Number.isFinite(value)) continue
    const unit = match[2] as 'day' | 'week' | 'month' | 'year'
    if (!unit) continue
    hints.push(unit)
  }
  return hints
}

const pluralizeUnit = (unit: 'day' | 'week' | 'month' | 'year', value: number) => {
  if (value === 1) return unit
  if (unit === 'day') return 'days'
  if (unit === 'week') return 'weeks'
  if (unit === 'month') return 'months'
  return 'years'
}

const extractExplicitWindow = (text: string) => {
  if (!text) return null
  const normalized = text.toLowerCase()
  const match = normalized.match(/(\d+)[-\s]*(day|week|month|year)s?\b/)
  if (match?.[1] && match[2]) {
    const value = Number(match[1])
    if (!Number.isFinite(value) || value <= 0) return null
    const unit = match[2] as 'day' | 'week' | 'month' | 'year'
    return `${value} ${pluralizeUnit(unit, value)}`
  }
  if (/\b(today|yesterday)\b/.test(normalized)) {
    return '1 day'
  }
  const phraseMatch = normalized.match(/\b(this|last|past|previous)[-\s]+(week|month|year)s?\b/)
  if (phraseMatch?.[2]) {
    const unit = phraseMatch[2] as 'week' | 'month' | 'year'
    return `1 ${pluralizeUnit(unit, 1)}`
  }
  return null
}

const isAllTimeWindow = (value?: string | null) => {
  if (!value) return false
  const normalized = normalizeWhitespace(value).toLowerCase()
  return normalized === 'all_time' || normalized.includes('all time') || normalized.includes('lifetime')
}

const normalizeContextWindow = (value?: string | null) => {
  if (!value) return null
  if (isAllTimeWindow(value)) return 'all_time'
  return extractExplicitWindow(value)
}

/**
 * Parse an explicit date from the question (e.g., "January 14, 2026" -> "2026-01-14").
 */
const parseExplicitDate = (text: string): string | null => {
  const match = text.match(EXPLICIT_DATE_REGEX)
  if (!match) return null
  const dateStr = match[0]
  // Parse month name (supports full and abbreviated forms)
  const monthNames: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  }
  const parts = dateStr.toLowerCase().match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/)
  if (!parts) return null
  const month = monthNames[parts[1]]
  const day = parseInt(parts[2], 10)
  const year = parseInt(parts[3], 10)
  if (!month || !day || !year) return null
  // Validate and format as ISO date
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  // Basic validation: check if the date is valid
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return null
  return isoDate
}

const resolveSessionDateFilter = (input: {
  question: string
  state?: GymChatConversationState | null
}) => {
  // First check for explicit dates in the question (e.g., "January 14, 2026")
  const explicitDate = parseExplicitDate(input.question)
  if (explicitDate) return explicitDate

  // Fall back to session phrase resolution from context
  const sessionPhrase = extractSessionWindowPhrase(input.question)
  if (!sessionPhrase) return null
  const sessionDate =
    input.state?.lastSessionDate ??
    input.state?.lastResponseContext?.sessionDate
  if (!sessionDate) return null
  return sessionDate
}

const windowToDays = (window: string | null | undefined) => {
  if (!window || window === 'all_time') return null
  const match = window.match(/(\d+)[-\s]*(day|week|month|year)s?\b/i)
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

const extractComparisonWindows = (text: string) => {
  if (!text) return []
  const normalized = text.toLowerCase()
  const windows: string[] = []
  const regex = /(\d+)[-\s]*(day|week|month|year)s?\b/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(normalized))) {
    const value = Number(match[1])
    if (!Number.isFinite(value) || value <= 0) continue
    const unit = match[2] as 'day' | 'week' | 'month' | 'year'
    windows.push(`${value} ${pluralizeUnit(unit, value)}`)
  }
  return windows
}

const TIME_WINDOW_CUE_REGEX =
  /\b(\d+[-\s]*(day|week|month|year)s?|today|yesterday|this[-\s]+(week|month|year)|last[-\s]+(week|month|year|session|sessions|workout|workouts)|past[-\s]+(week|month|year|session|sessions|workout|workouts)|most[-\s]+recent|latest|since\b|recent|lately|year[-\s]+to[-\s]+date|ytd|all[-\s]?time|lifetime)\b/i
const TIMEFRAME_PHRASE_REGEX =
  /\b(today|yesterday|this[-\s]+week|this[-\s]+month|this[-\s]+year|last[-\s]+week|last[-\s]+month|last[-\s]+year|past[-\s]+week|past[-\s]+month|past[-\s]+year|most[-\s]+recent[-\s]+session|most[-\s]+recent[-\s]+sessions|latest[-\s]+session|latest[-\s]+sessions|last[-\s]+session|last[-\s]+sessions|last[-\s]+workout|last[-\s]+workouts|all[-\s]?time|lifetime|year[-\s]+to[-\s]+date|ytd)\b/i
const TIMEFRAME_EXPLICIT_REGEX = /\b(\d+)[-\s]*(day|week|month|year)s?\b/i
const TIMEFRAME_AMBIGUOUS_REGEX = /\b(recent|lately|last|past|previous|current)\b/i
const LOG_CONTEXT_CUE_REGEX = /\b(my|mine|me|our|last|recent|latest|previous|past)\b/i
const SESSION_WINDOW_REGEX = /\b(most recent|latest|last)\s+(session|workout)\b/i

const hasExplicitTimeWindow = (text: string) => {
  if (!text) return false
  const normalized = normalizeWhitespace(text).toLowerCase()
  if (TIMEFRAME_EXPLICIT_REGEX.test(normalized)) return true
  if (TIMEFRAME_PHRASE_REGEX.test(normalized)) return true
  if (/\bsince\s+\S+/.test(normalized)) return true
  return false
}

const extractSessionWindowPhrase = (text: string) => {
  if (!text) return null
  const normalized = normalizeWhitespace(text).toLowerCase()
  const match = normalized.match(SESSION_WINDOW_REGEX)
  return match?.[0] ?? null
}

const parseTimeframeAnswer = (answer: string): { timeframe?: string } => {
  if (!answer) return {}
  const normalized = normalizeWhitespace(answer).toLowerCase()
  if (!normalized) return {}
  const explicitMatch = normalized.match(TIMEFRAME_EXPLICIT_REGEX)
  if (explicitMatch?.[1] && explicitMatch[2]) {
    const value = Number(explicitMatch[1])
    if (Number.isFinite(value) && value > 0) {
      const unit = explicitMatch[2] as IntervalHint
      return { timeframe: `${value} ${pluralizeUnit(unit, value)}` }
    }
  }
  const phraseMatch = normalized.match(TIMEFRAME_PHRASE_REGEX)
  if (phraseMatch?.[0]) {
    return { timeframe: phraseMatch[0] }
  }
  const sinceMatch = normalized.match(/\bsince\s+(.+)/)
  if (sinceMatch?.[1]?.trim()) {
    const timeframe = `since ${sinceMatch[1].trim()}`
    return { timeframe }
  }
  return {}
}

const buildTimeframedQuestion = (baseQuestion: string, timeframe: string) => {
  const trimmed = normalizeWhitespace(baseQuestion).replace(/[.?!]+$/, '')
  const window = normalizeWhitespace(timeframe)
  if (!trimmed) return window
  const lower = window.toLowerCase()
  if (lower === 'today' || lower === 'yesterday') return `${trimmed} ${window}.`
  if (lower.startsWith('since ')) return `${trimmed} ${window}.`
  if (/\ball[-\s]?time\b|\blifetime\b|\boverall\b/.test(lower)) return `${trimmed} over ${window}.`
  if (lower.startsWith('this ')) return `${trimmed} during ${window}.`
  if (lower.startsWith('last ') || lower.startsWith('past ') || lower.startsWith('previous ')) {
    return `${trimmed} over the ${window}.`
  }
  if (lower.startsWith('most recent') || lower.startsWith('latest') || lower.startsWith('last session')) {
    return `${trimmed} for the ${window}.`
  }
  if (/^\d+\s+\w+/.test(lower)) return `${trimmed} over the last ${window}.`
  return `${trimmed} over ${window}.`
}

const buildTimeframeClarificationPrompt = () =>
  'What timeframe should I use for your logs (e.g., last 4 weeks, last 3 months, all time)?'

const shouldPreferGymDataForLogQuestion = (text: string) => {
  if (!text) return false
  const normalized = normalizeWhitespace(text).toLowerCase()
  return LOG_CONTEXT_CUE_REGEX.test(normalized) && TIME_WINDOW_CUE_REGEX.test(normalized)
}

const extractPriorUserQuestion = (messages: GymChatMessage[]) => {
  for (let i = messages.length - 2; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content
  }
  return ''
}

const coerceIntervalParams = (sql: string, params: unknown[], hints: IntervalHints) => {
  const matches = Array.from(sql.matchAll(INTERVAL_PLACEHOLDER_REGEX))
  if (!matches.length) return params
  const nextParams = [...params]
  const placeholderOrder: number[] = []
  matches.forEach(match => {
    const placeholderIndex = Number(match[1])
    if (!Number.isFinite(placeholderIndex)) return
    if (!placeholderOrder.includes(placeholderIndex)) {
      placeholderOrder.push(placeholderIndex)
    }
  })
  const unitByPlaceholder = new Map<number, IntervalHint>()
  placeholderOrder.forEach((placeholderIndex, index) => {
    const unit = hints[index]
    if (unit) {
      unitByPlaceholder.set(placeholderIndex, unit)
    }
  })
  matches.forEach(match => {
    const placeholderIndex = Number(match[1])
    if (!Number.isFinite(placeholderIndex)) return
    const paramIndex = placeholderIndex - 1
    if (paramIndex < 0 || paramIndex >= nextParams.length) return
    const currentValue = nextParams[paramIndex]
    if (typeof currentValue === 'string' && /\d+\s+(day|week|month|year)s?/i.test(currentValue)) {
      return
    }
    if (typeof currentValue !== 'number' && !(typeof currentValue === 'string' && /^\d+$/.test(currentValue))) {
      return
    }
    const numericValue = Number(currentValue)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return
    const unit = unitByPlaceholder.get(placeholderIndex) ?? 'day'
    const formatted = `${numericValue} ${pluralizeUnit(unit, numericValue)}`
    nextParams[paramIndex] = formatted
  })
  return nextParams
}

const buildExecutableQueries = (
  queries: Array<{ id: string; purpose: string; sql: string; params: unknown[] }>,
  intervalHints: IntervalHints,
) => {
  const prepared: GymChatQuery[] = []
  for (const query of queries) {
    const normalizedParams = coerceIntervalParams(query.sql, query.params ?? [], intervalHints)
    try {
      const policy = validateAndRewriteSql(query.sql, normalizedParams)
      prepared.push({
        id: query.id,
        purpose: query.purpose,
        sql: policy.sql,
        params: normalizedParams,
        rowCount: 0,
        durationMs: 0,
        previewRows: [],
        error: null,
        policy: {
          appliedLimit: policy.appliedLimit,
          appliedTimeWindow: policy.appliedTimeWindow,
        },
      })
    } catch (error) {
      prepared.push({
        id: query.id,
        purpose: query.purpose,
        sql: query.sql,
        params: normalizedParams,
        rowCount: 0,
        durationMs: 0,
        previewRows: [],
        error: error instanceof Error ? error.message : 'SQL policy violation.',
      })
    }
  }
  return {
    prepared,
    hasPolicyErrors: prepared.some(query => query.error),
  }
}

const GYM_INTENT_KEYWORDS = [
  'gym',
  'workout',
  'exercise',
  'split',
  'full body',
  'full-body',
  'program',
  'programming',
  'routine',
  'hypertrophy',
  'strength',
  'set',
  'sets',
  'rep',
  'reps',
  'volume',
  'body part',
  'body parts',
  'muscle',
  'training',
  'lift',
  'lifts',
  'day tag',
  'pr',
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

const PROGRESSIVE_OVERLOAD_REGEX = /progressive overload|overload streak|longest streak|streak\b.*overload/i
const MUSCLE_GROUP_COMPARISON_REGEX =
  /muscle group|body part|body parts|compare\b.*(12\s*weeks|12-week)|average weekly volume/i
const TOP_END_EFFORT_REGEX =
  /top[-\s]?end efforts?|true top[-\s]?end|max(?:imal)? efforts?|max efforts?/i
const TOP_END_COMPARE_SIGNAL_REGEX = /\bcompare\b|\bvs\b|\bversus\b/i
const TWELVE_MONTH_REGEX = /\b12\s*(months?|mos?|m)\b|\b12-month\b|\b12m\b/i
const THREE_MONTH_REGEX = /\b3\s*(months?|mos?|m)\b|\b3-month\b|\b3m\b/i
const TOP_WEIGHT_SETS_REGEX =
  /top\s*\d+\s*(?:highest|heaviest)[-\s]?weight\s*sets?|highest[-\s]?weight\s*sets?|heaviest\s*sets?/i
const PR_REGEX = /\bpr(?:s)?\b|personal record|personal best/i
const BEST_SETS_REGEX = /\bbest\s+sets?\b/i
const SET_BREAKDOWN_REGEX =
  /\b(set[-\s]?by[-\s]?set|set breakdown|set order|set[-\s]?level|early sets|late sets|last sets|first sets|that set|within[-\s]?session|within[-\s]?workout|drop[-\s]?off.*sets?|sets?.*drop[-\s]?off|fatigue.*sets?|momentum.*sets?)\b/i
const EXERCISE_SUMMARY_REGEX =
  /\b(per[-\s]?exercise|exercise)\s+(summary|summaries|overview|breakdown|profile)\b|\bsummary\s+(?:per|by)\s+exercise\b/i
const EXERCISE_PROGRESS_REGEX = /\b(progress|progressed|progression|trend|trending|over time)\b/i
const ESTIMATED_1RM_REGEX = /\b(estimated\s*)?1rm\b|\bone[-\s]?rep\s*max\b|\be1rm\b/i
const WORST_DAY_REGEX =
  /worst day|lowest\s+total\s+volume|lowest\s+volume\s+(?:session|day)|least\s+volume/i
const WEEKDAY_CUE_REGEX =
  /\b(day[-\s]+of[-\s]+week|weekday|week[-\s]+day|by[-\s]+weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i
const TRAINING_DAY_CUE_REGEX =
  /\b(day[-\s]+tag|training[-\s]+day|training[-\s]+days|split[-\s]+day|by[-\s]+split)\b/i
const DAY_OF_WEEK_CUE_REGEX =
  /\b(day[-\s]+of[-\s]+week|weekday|week[-\s]+day|day[-\s]+tag|training[-\s]+day|training[-\s]+days|by[-\s]+day|by[-\s]+weekday)\b/i
const CROSS_TAB_REGEX = /\b(cross[-\s]?tab|crosstab|pivot)\b/i
const FAVORITE_SPLIT_REGEX =
  /fav(?:orite)?\s+(?:split|split day|day tag|training day)|which\s+split.*(?:most|often)|split\s+.*(?:most|often)/i
const WEEKLY_VOLUME_REGEX = /weekly\s+(?:training\s+)?volume|volume\s+per\s+week/i
const PERIOD_COMPARE_KEYWORD_REGEX = /\b(compare|compared to|vs|versus|prior|previous|before)\b/i
const ADHERENCE_REGEX =
  /\b(consisten|consistency|adherence|streak|gap|missed\s+weeks?|missed\s+months?|miss\s+weeks?|miss\s+months?|skipped\s+weeks?|frequency|regular)\b/i
const SET_COUNT_REGEX =
  /\b(total\s+sets|set\s+count|sets\s+per\s+exercise|most\s+sets|highest\s+sets|set rankings?)\b/i
const VOLUME_RANKING_REGEX =
  /\b(total\s+volume\s+per\s+exercise|most\s+total\s+volume|highest\s+volume|most\s+volume|tonnage|lb-reps|kg-reps)\b/i
const SESSION_COUNT_REGEX =
  /\b(how\s+many\s+sessions|session\s+count|sessions\s+(?:did|have)\s+i|training\s+days)\b/i
const SESSION_TREND_REGEX = /\bper\s+week|per\s+month|by\s+week|by\s+month\b/i
const MONTHLY_TREND_REGEX = /\b(per|by)\s+month\b|\bmonthly\b/i
const RETURN_EFFORT_REGEX =
  /return for effort|return on effort|bang for (my )?buck|bang[-\s]?for[-\s]?(my )?buck/i
const RETURN_EFFORT_PROGRESSION_REGEX =
  /progression over time for each exercise|progression over time for each lift|return for effort.*progression/i
const STALLED_LIFTS_REGEX = /stalled|stalling|stall\b|plateau|stagnat/i
const LIGHTER_WEIGHTS_REGEX = /lighter weights?|using lighter|lighter weight/i
const RETURN_EFFORT_VOLUME_QUESTION = `Show total volume per exercise over the last ${DEFAULT_TIME_WINDOW}.`
const RETURN_EFFORT_PROGRESSION_QUESTION = 'Show my progression over time for each exercise.'

// New detection patterns for fixes 3, 4, 6
const BEST_1RM_OVERALL_REGEX =
  /\b(best|highest|top)\s+(one\s*rep\s*max|1rm|1\s*rep\s*max|e1rm)\b|\bwhich\s+exercise\s+has\s+my\s+best\s+pr\b|\bmy\s+best\s+pr\b|\btop\s+pr\b/i
const INACTIVE_EXERCISES_REGEX =
  /\b(haven'?t|have\s+not|not)\s+(done|performed|trained|worked|hit)\b|\b(skipped|missing|inactive|neglected)\s+(exercises?|lifts?)\b|\bexercises?\s+i\s+(haven'?t|have\s+not|am\s+not)\b/i
const WORKOUT_TIMING_REGEX =
  /\b(what\s+)?time\s+of\s+day\b|\bwhen\s+do\s+i\s+(usually|typically|normally)?\s*(work\s*out|train|lift|exercise)\b|\bworkout\s+time\b|\btraining\s+time\b|\busual\s+time\b/i
const EXPLICIT_DATE_REGEX =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}\b/i
const PLAN_CORRECTION_REGEX =
  /\b(you gave me|you suggested|you included|that's wrong|that is wrong|i asked for|ensure your suggestions|only)\b/i
const TECHNIQUE_KEYWORDS = [
  'form',
  'technique',
  'cue',
  'cues',
  'setup',
  'how to',
  'tips',
  'mistake',
  'mistakes',
  'depth',
  'grip',
  'stance',
  'bar path',
]

const hasBodyPartsMapping = () => {
  const tables = getCatalogTables()
  const meta = tables.find(table => table.name.toLowerCase() === 'gym_day_meta')
  if (!meta) return false
  return meta.columns.some(column => column.name.toLowerCase() === 'body_parts')
}


const PLANNING_KEYWORDS = [
  'next',
  'tomorrow',
  'upcoming',
  'should i',
  'should we',
  'plan',
  'planning',
  'future',
  'target',
  'goal',
  'increase',
  'add weight',
  'progression',
  'bump',
]

const TREND_KEYWORDS = ['trend', 'over time', 'last', 'past', 'recent', 'since', 'per week', 'per month']
const COMPARISON_KEYWORDS = ['compare', 'versus', 'vs', 'difference', 'diff', 'than', 'relative to']
const DIAGNOSTIC_KEYWORDS = [
  'why',
  'lagging',
  'weak',
  'behind',
  'improve',
  'fix',
  'problem',
  'issue',
  'fatigue',
  'tired',
  'drop',
  'drop off',
  'momentum',
  'burnout',
]

const AMBIGUOUS_DIAGNOSTIC_KEYWORDS = ['momentum', 'fatigue', 'drop off', 'drop-off', 'dropoff', 'too much', 'not enough']
const WITHIN_SESSION_KEYWORDS = [
  'within session',
  'within-session',
  'within workout',
  'during workout',
  'in a workout',
  'workout',
  'session',
  'set order',
  'set-by-set',
  'set by set',
  'early sets',
  'late sets',
  'first sets',
  'last sets',
  'set number',
]
const ACROSS_WEEKS_KEYWORDS = [
  'week',
  'weekly',
  'month',
  'monthly',
  'over time',
  'trend',
  'across weeks',
  'over weeks',
  'per week',
  'per month',
  'by week',
  'by month',
]

const WEEK_KEYWORDS = ['week', 'weekly']
const MONTH_KEYWORDS = ['month', 'monthly']
const SESSION_KEYWORDS = ['day', 'daily', 'session']
const ALL_TIME_KEYWORDS = ['all time', 'lifetime', 'ever']

const TARGET_KEYWORD_MAP: Array<{ keywords: string[]; target: string }> = [
  { keywords: ['exercise', 'exercises', 'lift', 'lifts'], target: 'exercise' },
  {
    keywords: [
      'body part',
      'body parts',
      'muscle',
      'muscles',
      'chest',
      'pec',
      'pecs',
      'back',
      'lat',
      'lats',
      'shoulder',
      'shoulders',
      'delt',
      'delts',
      'biceps',
      'triceps',
      'forearms',
      'arms',
      'legs',
      'quads',
      'hamstrings',
      'glutes',
      'calves',
      'abs',
      'core',
    ],
    target: 'body_part',
  },
  { keywords: ['day tag', 'split', 'push', 'pull', 'leg', 'upper', 'lower'], target: 'day_tag' },
  { keywords: ['equipment', 'machine', 'barbell', 'dumbbell'], target: 'equipment' },
]
const BODY_PART_KEYWORDS = TARGET_KEYWORD_MAP.find(entry => entry.target === 'body_part')?.keywords ?? []

const ANALYSIS_TEMPLATE_HINTS: Partial<Record<AnalysisKind, GymChatTemplateName>> = {
  stalled_lifts: 'plateau_vs_progress',
  muscle_group_balance: 'body_part_balance',
  body_part_day_split: 'workload_consistency',
  weekday_breakdown: 'workload_consistency',
  exercise_progression: 'plateau_vs_progress',
  weekly_volume: 'workload_consistency',
  favorite_split_day: 'workload_consistency',
  period_compare: 'period_compare',
  set_breakdown: 'set_breakdown',
}

const ANALYSIS_INTENT_HINTS: Partial<Record<AnalysisKind, IntentType>> = {
  exercise_prs: 'comparison',
  best_sets: 'comparison',
  set_breakdown: 'diagnostic',
  exercise_summary: 'descriptive',
  exercise_progression: 'trend',
  muscle_group_balance: 'comparison',
  body_part_day_split: 'descriptive',
  weekday_breakdown: 'descriptive',
  return_for_effort_volume: 'comparison',
  return_for_effort_progression: 'trend',
  stalled_lifts: 'diagnostic',
  lighter_weight_progress: 'comparison',
  top_weight_sets: 'comparison',
  lowest_volume_day: 'diagnostic',
  favorite_split_day: 'descriptive',
  weekly_volume: 'trend',
  top_end_efforts: 'trend',
  top_end_efforts_compare_12m_3m: 'comparison',
  progressive_overload: 'trend',
  set_count: 'comparison',
  volume: 'comparison',
  session_count: 'trend',
  period_compare: 'comparison',
}


const ALLOWED_PRIMARY_GRAINS: PrimaryGrain[] = ['set', 'session', 'week', 'month', 'all_time']

const normalizePrimaryGrainValue = (value?: string | null): PrimaryGrain | undefined => {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, '_')
  return ALLOWED_PRIMARY_GRAINS.find(grain => grain === normalized)
}

const normalizeTemplateName = (value?: string | null): GymChatTemplateName | undefined => {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase().replace(/[-\s]+/g, '_') as GymChatTemplateName
  if (normalized in TEMPLATES) return normalized
  return undefined
}

const looksLikeGymIntent = (text: string) => {
  if (!text) return false
  const normalized = text.toLowerCase()
  return GYM_INTENT_KEYWORDS.some(keyword => normalized.includes(keyword))
}

const looksLikePlanningIntent = (text: string) => {
  if (!text) return false
  const normalized = text.toLowerCase()
  return PLANNING_KEYWORDS.some(keyword => normalized.includes(keyword))
}

const isTechniqueQuestion = (text: string) => {
  if (!text) return false
  const normalized = text.toLowerCase()
  return TECHNIQUE_KEYWORDS.some(keyword => normalized.includes(keyword))
}

const containsKeyword = (text: string, keywords: string[]) => {
  if (!text) return false
  const normalized = text.toLowerCase()
  return keywords.some(keyword => normalized.includes(keyword))
}

const isTopEndEffortsComparisonQuestion = (text: string) => {
  if (!text) return false
  const normalized = text.toLowerCase()
  if (!TOP_END_EFFORT_REGEX.test(normalized)) return false
  const has12 = TWELVE_MONTH_REGEX.test(normalized)
  const has3 = THREE_MONTH_REGEX.test(normalized)
  if (!has12 || !has3) return false
  if (TOP_END_COMPARE_SIGNAL_REGEX.test(normalized)) return true
  return normalized.includes('last 12') && normalized.includes('last 3')
}

const isTopWeightSetsQuestion = (text: string) => TOP_WEIGHT_SETS_REGEX.test(text || '')

const isPrQuestion = (text: string) => PR_REGEX.test(text || '')

const isBestSetsQuestion = (text: string) => BEST_SETS_REGEX.test(text || '')

const isSetBreakdownQuestion = (text: string) => {
  if (!text) return false
  const normalized = text.toLowerCase()
  if (BEST_SETS_REGEX.test(normalized)) return false
  if (TOP_WEIGHT_SETS_REGEX.test(normalized)) return false
  if (PR_REGEX.test(normalized)) return false
  return SET_BREAKDOWN_REGEX.test(normalized)
}

const isExerciseSummaryQuestion = (text: string) => EXERCISE_SUMMARY_REGEX.test(text || '')

const isExerciseProgressionQuestion = (text: string) => {
  if (!text) return false
  const normalized = text.toLowerCase()
  if (PROGRESSIVE_OVERLOAD_REGEX.test(normalized)) return false
  if (RETURN_EFFORT_REGEX.test(normalized)) return false
  if (!EXERCISE_PROGRESS_REGEX.test(normalized)) return false
  if (/\b(per|each)\s+(exercise|lift)\b/.test(normalized)) return true
  return Boolean(extractExerciseTarget(normalized))
}

const isWorstDayQuestion = (text: string) => WORST_DAY_REGEX.test(text || '')

const isDayOfWeekBreakdownQuestion = (text: string) => {
  if (!text) return false
  const normalized = normalizeWhitespace(text).toLowerCase()
  return DAY_OF_WEEK_CUE_REGEX.test(normalized)
}

const isFavoriteSplitQuestion = (text: string) => {
  if (!text) return false
  const normalized = normalizeWhitespace(text).toLowerCase()
  return FAVORITE_SPLIT_REGEX.test(normalized) || DAY_OF_WEEK_CUE_REGEX.test(normalized)
}

const isWeeklyVolumeQuestion = (text: string) => WEEKLY_VOLUME_REGEX.test(text || '')

const isSetCountQuestion = (text: string) => SET_COUNT_REGEX.test(text || '')

const isVolumeRankingQuestion = (text: string) => VOLUME_RANKING_REGEX.test(text || '')

const isSessionCountQuestion = (text: string) =>
  SESSION_COUNT_REGEX.test(text || '') && !SESSION_TREND_REGEX.test(text || '')

const isBest1rmOverallQuestion = (text: string) => BEST_1RM_OVERALL_REGEX.test(text || '')

const isInactiveExercisesQuestion = (text: string) => INACTIVE_EXERCISES_REGEX.test(text || '')

const isWorkoutTimingQuestion = (text: string) => WORKOUT_TIMING_REGEX.test(text || '')

const isPeriodCompareQuestion = (text: string) => {
  if (!text) return false
  const normalized = text.toLowerCase()
  if (PROGRESSIVE_OVERLOAD_REGEX.test(normalized)) return false
  if (TOP_END_EFFORT_REGEX.test(normalized) || isTopEndEffortsComparisonQuestion(normalized)) return false
  if (ADHERENCE_REGEX.test(normalized)) return true
  const hasCompareKeyword = PERIOD_COMPARE_KEYWORD_REGEX.test(normalized)
  if (!hasCompareKeyword) return false
  const hasTimeWindowCue = TIME_WINDOW_CUE_REGEX.test(normalized) || normalized.includes('before')
  return hasTimeWindowCue
}

const wantsEstimated1rm = (text: string) => ESTIMATED_1RM_REGEX.test(text || '')

const inferIntentType = (text: string): IntentType | undefined => {
  if (!text) return undefined
  if (containsKeyword(text, PLANNING_KEYWORDS)) return 'planning'
  if (containsKeyword(text, COMPARISON_KEYWORDS)) return 'comparison'
  if (containsKeyword(text, DIAGNOSTIC_KEYWORDS)) return 'diagnostic'
  if (containsKeyword(text, TREND_KEYWORDS)) return 'trend'
  return undefined
}

const inferPrimaryGrain = (text: string): PrimaryGrain | undefined => {
  if (!text) return undefined
  if (containsKeyword(text, ALL_TIME_KEYWORDS)) return 'all_time'
  if (containsKeyword(text, WEEK_KEYWORDS)) return 'week'
  if (containsKeyword(text, MONTH_KEYWORDS)) return 'month'
  if (containsKeyword(text, SESSION_KEYWORDS)) return 'session'
  return undefined
}

const inferTargets = (text: string) => {
  if (!text) return []
  const normalized = text.toLowerCase()
  const targets = new Set<string>()
  TARGET_KEYWORD_MAP.forEach(entry => {
    if (entry.keywords.some(keyword => normalized.includes(keyword))) {
      targets.add(entry.target)
    }
  })
  return Array.from(targets)
}

const RELATIVE_WINDOW_DETECT_REGEX = /(\d+)[-\s]*(day|week|month|year)s?\b/i

const UNSAFE_POLICY_ERROR_PATTERNS = [
  /unsafe keyword detected/i,
  /only select/i,
  /union, values, and recursive/i,
  /system schema is not allowed/i,
]

const isUnsafePolicyError = (error: string) => UNSAFE_POLICY_ERROR_PATTERNS.some(pattern => pattern.test(error))

const isLongPrompt = (question: string) => {
  if (!question) return false
  const normalized = normalizeWhitespace(question)
  const wordCount = normalized.split(' ').filter(Boolean).length
  return normalized.length >= 320 || wordCount >= 70 || LONG_PROMPT_FORMAT_REGEX.test(normalized)
}

const buildLongPromptRescueResponse = (question: string): GymChatResponse | null => {
  if (!isLongPrompt(question)) return null
  const exerciseTarget = extractExerciseTarget(question)
  if (!looksLikeGymIntent(question) && !exerciseTarget) return null
  const explicitWindow = extractExplicitWindow(question)
  const windowHint = explicitWindow ?? '12 weeks'
  const assistantMessage = exerciseTarget
    ? `That request has a lot of constraints. To keep it safe and accurate, pick one focus and timeframe. ` +
      `I can start with ${exerciseTarget} over the last ${windowHint} or another window.`
    : `That request has a lot of constraints. To keep it safe and accurate, pick one focus and timeframe ` +
      `(for example, last ${windowHint}).`
  const followUps = exerciseTarget
    ? sanitizeFollowUps(buildTerseClarificationFollowUps(exerciseTarget))
    : sanitizeFollowUps(SUGGESTED_QUESTIONS)
  return {
    assistantMessage,
    citations: [],
    queries: [],
    followUps,
  }
}

const resolveExerciseSuggestion = (question: string) => {
  const extracted = extractExerciseTarget(question)
  if (!extracted) return null
  const suggestions = suggestExerciseNames(extracted, 1)
  return suggestions[0] ?? null
}

const resolveLongPromptAnalysisKind = (question: string): AnalysisKind => {
  const normalized = normalizeWhitespace(question).toLowerCase()
  const hasExercise = Boolean(resolveExerciseSuggestion(question))
  if (TOP_END_EFFORT_REGEX.test(normalized)) return 'top_end_efforts'
  if (ESTIMATED_1RM_REGEX.test(normalized) || normalized.includes('strength')) {
    return hasExercise ? 'exercise_progression' : 'return_for_effort_progression'
  }
  if (EXERCISE_PROGRESS_REGEX.test(normalized)) {
    return hasExercise ? 'exercise_progression' : 'return_for_effort_progression'
  }
  if (VOLUME_RANKING_REGEX.test(normalized)) return 'volume'
  if (SET_COUNT_REGEX.test(normalized)) return 'set_count'
  if (SESSION_COUNT_REGEX.test(normalized)) return 'session_count'
  if (WEEKLY_VOLUME_REGEX.test(normalized)) return 'weekly_volume'
  if (MUSCLE_GROUP_COMPARISON_REGEX.test(normalized)) return 'muscle_group_balance'
  if (FAVORITE_SPLIT_REGEX.test(normalized)) return 'favorite_split_day'
  if (hasExercise) return 'exercise_summary'
  return 'exercise_summary'
}

const normalizeFormatConstraints = (value?: FormatConstraints | null): FormatConstraints | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as FormatConstraints
  const maxWords = Number.isFinite(raw.maxWords) && raw.maxWords ? Math.floor(raw.maxWords) : undefined
  const bulletCount = Number.isFinite(raw.bulletCount) && raw.bulletCount ? Math.floor(raw.bulletCount) : undefined
  const sentenceLimit =
    Number.isFinite(raw.sentenceLimit) && raw.sentenceLimit ? Math.floor(raw.sentenceLimit) : undefined
  const requireChartTitle = raw.requireChartTitle ? true : undefined
  if (!maxWords && !bulletCount && !sentenceLimit && !requireChartTitle) return undefined
  return {
    maxWords,
    bulletCount,
    sentenceLimit,
    requireChartTitle,
  }
}

const extractFormatConstraints = (question: string): FormatConstraints | undefined => {
  if (!question) return undefined
  const normalized = normalizeWhitespace(question).toLowerCase()
  const constraints: FormatConstraints = {}
  const bulletMatch = normalized.match(/(?:exactly|always include|include)\s+(\w+)\s+bullet/)
  const wordMatch = normalized.match(/(?:under|less than|<=)\s+(\w+)\s+words?/)
  const sentenceMatch = normalized.match(/(?:exactly\s+)?(\w+)\s+sentences?\b/)
  const bulletCount = parseNumberToken(bulletMatch?.[1])
  const maxWords = parseNumberToken(wordMatch?.[1])
  const sentenceLimit = parseNumberToken(sentenceMatch?.[1])
  if (bulletCount) constraints.bulletCount = bulletCount
  if (maxWords) constraints.maxWords = maxWords
  if (sentenceLimit) constraints.sentenceLimit = sentenceLimit
  if (normalized.includes('chart title')) constraints.requireChartTitle = true
  return normalizeFormatConstraints(constraints)
}

const mergeFormatConstraints = (
  current: FormatConstraints | undefined,
  next: FormatConstraints | undefined,
): FormatConstraints | undefined => {
  if (!next) return current
  const merged: FormatConstraints = { ...(current ?? {}) }
  if (next.maxWords) merged.maxWords = next.maxWords
  if (next.requireChartTitle) merged.requireChartTitle = true
  if (next.bulletCount) merged.bulletCount = next.bulletCount
  if (next.sentenceLimit) {
    merged.sentenceLimit = next.sentenceLimit
    if (!next.bulletCount) {
      merged.bulletCount = undefined
    }
  }
  return normalizeFormatConstraints(merged)
}

const buildChartTitle = (analysisKind?: AnalysisKind) => {
  switch (analysisKind) {
    case 'weekly_volume':
      return 'Weekly Training Volume'
    case 'session_count':
      return 'Session Count Over Time'
    case 'volume':
      return 'Total Volume by Exercise'
    case 'set_count':
      return 'Total Sets by Exercise'
    case 'exercise_progression':
      return 'Exercise Progression'
    case 'return_for_effort_progression':
      return 'Progression by Exercise'
    case 'favorite_split_day':
      return 'Session Count by Day Tag'
    case 'body_part_day_split':
      return 'Body Part by Training Day'
    case 'weekday_breakdown':
      return 'Training by Day of Week'
    case 'muscle_group_balance':
      return 'Body Part Balance'
    default:
      return 'Training Summary'
  }
}

const splitSentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map(entry => entry.trim())
    .filter(Boolean)

const extractBulletCandidates = (text: string) => {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
  const bulletLines = lines.filter(line => /^[-*]\s+/.test(line))
  if (bulletLines.length) {
    return bulletLines.map(line => line.replace(/^[-*]\s+/, '').trim()).filter(Boolean)
  }
  return splitSentences(text)
}

const trimWords = (text: string, maxWords: number) => {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return text
  return `${words.slice(0, maxWords).join(' ')}`
}

const applyFormatConstraints = (
  message: string,
  constraints: FormatConstraints,
  analysisKind?: AnalysisKind,
) => {
  if (!message) return message
  const trimmed = message.trim()
  if (!trimmed) return trimmed
  const sentenceLimit = constraints.sentenceLimit
  const bulletCount = constraints.bulletCount
  const chartTitle = constraints.requireChartTitle ? buildChartTitle(analysisKind) : null
  let bodyText = trimmed
  if (sentenceLimit) {
    bodyText = splitSentences(trimmed).slice(0, sentenceLimit).join(' ')
  } else if (bulletCount) {
    const candidates = extractBulletCandidates(trimmed)
    const bullets: string[] = []
    candidates.forEach(candidate => {
      if (bullets.length < bulletCount && candidate) bullets.push(candidate)
    })
    while (bullets.length < bulletCount) {
      bullets.push('Additional detail not available from logs.')
    }
    bodyText = bullets.map(bullet => `- ${bullet}`).join('\n')
  }
  if (constraints.maxWords) {
    const reservedWords = chartTitle ? chartTitle.split(/\s+/).length + 2 : 0
    const maxWords = Math.max(1, constraints.maxWords - reservedWords)
    bodyText = trimWords(bodyText, maxWords)
  }
  if (chartTitle) {
    bodyText = `${bodyText}\nChart title: ${chartTitle}`
  }
  return bodyText.trim()
}

const buildSimplifiedQuestion = (question: string) => {
  if (!isLongPrompt(question)) return null
  const explicitWindow = extractExplicitWindow(question)
  const metric = extractMetricFromQuestion(question)
  const exerciseTarget = extractExerciseTarget(question)
  const suggestedExercise = exerciseTarget ? suggestExerciseNames(exerciseTarget, 1)[0] ?? exerciseTarget : null
  const windowLabel = explicitWindow ?? (containsKeyword(question, ALL_TIME_KEYWORDS) ? 'all time' : null)
  const metricLabel =
    metric === '1rm'
      ? 'estimated 1RM'
      : metric === 'sessions'
        ? 'session count'
        : metric
  if (!suggestedExercise && !metricLabel) return null
  const windowSuffix = windowLabel ? ` over the last ${windowLabel}.` : '.'
  if (suggestedExercise && metricLabel) {
    return `Show my ${metricLabel} for ${suggestedExercise}${windowSuffix}`
  }
  if (suggestedExercise) {
    return `Show ${suggestedExercise} progression${windowSuffix}`
  }
  return `Show my ${metricLabel}${windowSuffix}`
}

const maybeRewriteLongPrompt = (messages: GymChatMessage[], question: string) => {
  const simplified = buildSimplifiedQuestion(question)
  if (!simplified) return { messages, question, didRewrite: false }
  const updated = [...messages]
  for (let i = updated.length - 1; i >= 0; i -= 1) {
    if (updated[i].role === 'user') {
      updated[i] = { ...updated[i], content: simplified }
      break
    }
  }
  return { messages: updated, question: simplified, didRewrite: true }
}

const shouldConfirmPlan = (question: string, intentType?: IntentType) => {
  if (!question) return false
  if (intentType !== 'diagnostic' && intentType !== 'planning') return false
  const normalized = question.toLowerCase()
  if (!AMBIGUOUS_DIAGNOSTIC_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return false
  }
  const mentionsWithinSession = WITHIN_SESSION_KEYWORDS.some(keyword => normalized.includes(keyword))
  const mentionsAcrossWeeks =
    ACROSS_WEEKS_KEYWORDS.some(keyword => normalized.includes(keyword)) || RELATIVE_WINDOW_DETECT_REGEX.test(normalized)
  return !mentionsWithinSession && !mentionsAcrossWeeks
}

type Queryable = {
  query: (query: string | { text: string; values?: unknown[] }, params?: unknown[]) => Promise<any>
}

const executeQuery = async (client: Queryable, sql: string, params: unknown[]) => {
  const started = Date.now()
  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL statement_timeout = ${QUERY_TIMEOUT_MS}`)
    const result = await client.query({
      text: sql,
      values: params ?? [],
    })
    await client.query('COMMIT')
    const durationMs = Date.now() - started
    const rows = result.rows ?? []
    return {
      rowCount: result.rowCount ?? rows.length,
      durationMs,
      rows: rows.map((row: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(row).map(([key, value]) => [key, formatCellValue(value)])),
      ),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    const durationMs = Date.now() - started
    return {
      rowCount: 0,
      durationMs,
      rows: [],
      error: error instanceof Error ? error.message : 'Query failed.',
    }
  }
}

export async function POST(req: Request) {
  const requestIdHeader = req.headers.get('x-request-id')?.trim()
  const requestId =
    requestIdHeader && requestIdHeader.length <= 128 ? requestIdHeader : randomUUID()
  const startedAt = Date.now()
  const wantsEvalMeta = req.headers.get('x-gym-chat-eval') === '1'
  const wantsDebugSql = req.headers.get('x-gym-chat-debug') === '1'
  const wantsStream =
    req.headers.get('accept')?.includes('text/event-stream') || req.headers.get('x-stream') === '1'
  let conversationState: GymChatConversationState = {}
  let turnId: string | undefined
  let turnTimestamp: string | undefined
  const log = (...args: unknown[]) => {
    console.info(`[gym-chat:${requestId}]`, ...args)
  }
  const encoder = new TextEncoder()
  const pendingEvents: string[] = []
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
  let shouldCloseStream = false
  const enqueueEvent = (payload: string) => {
    if (streamController) {
      streamController.enqueue(encoder.encode(payload))
      return
    }
    pendingEvents.push(payload)
  }
  const resolveErrorType = (status?: number) => {
    if (!status) return 'unknown'
    if (status === 503) return 'upstream'
    if (status === 504) return 'timeout'
    if (status >= 500) return 'internal'
    if (status >= 400) return 'bad_request'
    return 'unknown'
  }
  const sendEvent = (event: string, data: unknown) => {
    if (!wantsStream) return
    enqueueEvent(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }
  const sendStatus = (stage: string, message: string) => {
    sendEvent('status', { stage, message, elapsedMs: Date.now() - startedAt })
  }
  const sendError = (message: string, type: string, detail?: string) => {
    sendEvent('error', { type, message, detail, elapsedMs: Date.now() - startedAt })
    if (streamController) {
      streamController.close()
      streamController = null
    } else {
      shouldCloseStream = true
    }
  }
  const sendFinal = (payload: unknown) => {
    sendEvent('final', payload)
    if (streamController) {
      streamController.close()
      streamController = null
    } else {
      shouldCloseStream = true
    }
  }
  const llmRetryBudget = {
    remainingMs: () => Math.max(0, MAX_DURATION_MS - (Date.now() - startedAt)),
    minRetryWindowMs: MIN_LLM_RETRY_WINDOW_MS,
  }
  const llmOptions = { budget: llmRetryBudget }
  const buildConversationStateResponse = (state: GymChatConversationState) => {
    if (!state.history?.length) return state
    const fullPayload = { ...state }
    if (JSON.stringify(fullPayload).length <= RESPONSE_HISTORY_MAX_BYTES) {
      return fullPayload
    }
    return {
      ...state,
      history: state.history.slice(-RESPONSE_HISTORY_FALLBACK_TURNS),
    }
  }
  const respond = (
    body: GymChatResponse | { error: string },
    init?: { status?: number },
    meta?: GymChatEvalMeta,
  ) => {
    let responseBody = body
    const shouldApplyFormatConstraints =
      'assistantMessage' in responseBody &&
      conversationState.formatConstraints &&
      !conversationState.pendingClarification &&
      !conversationState.lastError &&
      !('refusal' in responseBody && responseBody.refusal)
    if (shouldApplyFormatConstraints) {
      responseBody = {
        ...responseBody,
        assistantMessage: applyFormatConstraints(
          responseBody.assistantMessage,
          conversationState.formatConstraints,
          conversationState.lastAnalysis?.kind,
        ),
      }
    }
    if ('assistantMessage' in responseBody && turnId) {
      conversationState = recordAssistantTurn({
        state: conversationState,
        message: responseBody.assistantMessage,
        turnId,
        timestamp: turnTimestamp,
      })
    }
    const payload =
      'assistantMessage' in responseBody
        ? { ...responseBody, conversationState: buildConversationStateResponse(conversationState) }
        : responseBody
    if (wantsStream) {
      const status = init?.status
      if ('assistantMessage' in responseBody) {
        if (status && status >= 400) {
          sendError(responseBody.assistantMessage, resolveErrorType(status))
        } else {
          sendFinal(payload)
        }
      } else {
        sendError(responseBody.error, resolveErrorType(status))
      }
      return null
    }
    const evalHeaders = wantsEvalMeta ? buildEvalHeaders(meta) : undefined
    const headers = { 'x-request-id': requestId, ...(evalHeaders ?? {}) }
    return NextResponse.json(payload, { ...(init ?? {}), headers })
  }
  const run = async () => {
    try {
    let payload: {
      messages?: GymChatMessage[]
      client?: { timezone?: string }
      conversationState?: GymChatConversationState | null
    }
    try {
      payload = await req.json()
    } catch (error) {
      return respond({ error: 'Invalid JSON payload.' }, { status: 400 })
    }

    const catalogStartedAt = Date.now()
    sendStatus('catalog', 'Loading workout catalog')
    await loadGymCatalog().catch(error => {
      log('catalog load failed', error)
    })
    log('catalog load completed', { durationMs: Date.now() - catalogStartedAt })

    conversationState = normalizeConversationState(payload.conversationState)

    let messages = normalizeMessages(payload.messages ?? [])
    if (!messages.length) {
      return respond({ error: 'Messages are required.' }, { status: 400 })
    }

    let question = extractLatestUserQuestion(messages)
    if (!question) {
      return respond({ error: 'User question is required.' }, { status: 400 })
    }
    const rawQuestion = question
    if (FORMAT_CLEAR_REGEX.test(rawQuestion)) {
      conversationState = { ...conversationState, formatConstraints: undefined, baseFormatConstraints: undefined }
    } else if (FORMAT_RESET_REGEX.test(rawQuestion) && conversationState.baseFormatConstraints) {
      conversationState = { ...conversationState, formatConstraints: conversationState.baseFormatConstraints }
    } else {
      const extractedConstraints = extractFormatConstraints(rawQuestion)
      if (extractedConstraints) {
        const merged = mergeFormatConstraints(conversationState.formatConstraints, extractedConstraints)
        const base = conversationState.baseFormatConstraints ?? merged
        conversationState = { ...conversationState, formatConstraints: merged, baseFormatConstraints: base }
      }
    }
    const wasLongPrompt = isLongPrompt(question)
    const rewriteResult = maybeRewriteLongPrompt(messages, question)
    messages = rewriteResult.messages
    question = rewriteResult.question
    const forceCanonicalFromLongPrompt = wasLongPrompt || rewriteResult.didRewrite

    const timezone = payload.client?.timezone ?? 'UTC'

    turnTimestamp = new Date().toISOString()
    const nextTurnIndex = (conversationState.turnIndex ?? 0) + 1
    turnId = `t${nextTurnIndex}`
    conversationState = {
      ...conversationState,
      sessionId: conversationState.sessionId ?? randomUUID(),
      turnIndex: nextTurnIndex,
      scope: conversationState.scope ?? buildEmptyScope(),
      contextStack: conversationState.contextStack ?? [],
      history: conversationState.history ?? [],
      memoryBudget: conversationState.memoryBudget,
    }

    let turnMode = classifyTurnMode({ message: question, state: conversationState })
    let analysisKindOverride: AnalysisKind | undefined
    let resolvedPronoun: ReturnType<typeof resolvePronounReference> | null = null
    let pendingComparison: ComparisonIntent | null = null
    let topicShifted = false
    const correctionDetected = isCorrection(question)
    if (correctionDetected && turnMode === 'analysis_followup') {
      turnMode = 'new_question'
    }
    if (RETRY_CUE_REGEX.test(question) && conversationState.lastAnalysis?.kind) {
      turnMode = 'analysis_followup'
    }

    // Check for repeated questions to avoid giving the same answer twice
    const repeatedQuestion = detectRepeatedQuestion(question, conversationState.history)
    if (repeatedQuestion && turnMode === 'new_question') {
      const response: GymChatResponse = {
        assistantMessage:
          "I recently answered a very similar question. If you're looking for updated data or a different timeframe, try specifying that explicitly (e.g., \"for the last 30 days\" or \"since last week\"). Otherwise, you can review my previous response in the chat history above.",
        conversationState,
        followUps: [
          'Show the same analysis for a different timeframe',
          'Break down the analysis by exercise',
          'Compare to a different time period',
        ],
      }
      return respond(response)
    }

    conversationState = recordUserTurn({
      state: conversationState,
      question,
      turnId,
      timestamp: turnTimestamp,
      turnMode,
    })

    if (conversationState.pendingClarification && turnMode !== 'clarification_answer') {
      conversationState = { ...conversationState, pendingClarification: null }
    }
    if (turnMode === 'new_question' && conversationState.lastError) {
      conversationState = { ...conversationState, lastError: undefined }
    }
    if (turnMode === 'new_question') {
      const terseInput = detectTerseInput(question)
      const exerciseTarget = extractExerciseTarget(question)
      if (terseInput.isTerse && exerciseTarget) {
        const nameSuggestions = suggestExerciseNames(exerciseTarget, 3)
        const canonicalExercise =
          nameSuggestions.length === 1 ? nameSuggestions[0] : exerciseTarget
        const followUps = buildTerseClarificationFollowUps(canonicalExercise)
        conversationState = {
          ...conversationState,
          pendingClarification: {
            kind: 'terse_input',
            input: canonicalExercise,
            suggestions: followUps,
          },
        }
        const matchNote =
          nameSuggestions.length > 1
            ? `\n\nPossible matches: ${nameSuggestions.join(', ')}.`
            : ''
        const response: GymChatResponse = {
          assistantMessage: `${buildTerseClarificationPrompt(canonicalExercise)}${matchNote}`,
          citations: [],
          queries: [],
          followUps: sanitizeFollowUps(followUps),
        }
        return respond(response)
      }
    }

    const parsedPlanMeta = parseWorkoutPlanMeta(question)
    const planMeta = mergeWorkoutPlanMeta(
      turnMode === 'analysis_followup' ? conversationState.lastPlanMeta : undefined,
      parsedPlanMeta,
    )
    const hasMuscleConstraint = Boolean(planMeta?.targetsMuscles?.include?.length)
    const wantsHistoricalLifts = Boolean(planMeta?.usesHistoricalLifts)
    const wantsCorrectionAcknowledgement =
      Boolean(conversationState.lastPlanMeta) && turnMode === 'analysis_followup' && PLAN_CORRECTION_REGEX.test(question)

    if (turnMode === 'clarification_answer') {
      const pending = conversationState.pendingClarification ?? undefined
      if (pending?.kind === 'return_for_effort_metric') {
        const resolvedReturnEffort = resolveReturnEffortChoice(messages, question, pending)
        messages = resolvedReturnEffort.messages
        question = resolvedReturnEffort.question
        analysisKindOverride = resolvedReturnEffort.analysisKind
        if (resolvedReturnEffort.clearPending) {
          conversationState = { ...conversationState, pendingClarification: null }
        }
        if (!resolvedReturnEffort.didResolve) {
          turnMode = 'new_question'
          messages = [{ role: 'user', content: question }]
        }
      } else if (pending?.kind === 'terse_input') {
        const resolved = resolveTerseClarification(question, pending)
        question = resolved.question
        conversationState = { ...conversationState, pendingClarification: null }
      } else if (pending?.kind === 'exercise_choice') {
        const resolved = resolveExerciseChoice(question, pending)
        if (!resolved.didResolve) {
          const response: GymChatResponse = {
            assistantMessage: buildExerciseChoicePrompt(pending.options),
            citations: [],
            queries: [],
          }
          return respond(response)
        }
        const updated = [...messages]
        for (let i = updated.length - 1; i >= 0; i -= 1) {
          if (updated[i].role === 'user') {
            updated[i] = { ...updated[i], content: resolved.question }
            break
          }
        }
        messages = updated
        question = resolved.question
        conversationState = { ...conversationState, pendingClarification: null }
      } else if (pending?.kind === 'timeframe') {
        const baseQuestion = (pending.question ?? extractPriorUserQuestion(messages)).trim()
        if (!pending.question && baseQuestion) {
          conversationState = { ...conversationState, pendingClarification: { kind: 'timeframe', question: baseQuestion } }
        }
        if (!baseQuestion) {
          const response: GymChatResponse = {
            assistantMessage: 'Can you restate the question with a timeframe (e.g., last 4 weeks)?',
            citations: [],
            queries: [],
          }
          return respond(response)
        }
        const parsed = parseTimeframeAnswer(question)
        if (!parsed.timeframe) {
          const response: GymChatResponse = {
            assistantMessage: buildTimeframeClarificationPrompt(),
            citations: [],
            queries: [],
          }
          return respond(response)
        }
        const rewritten = buildTimeframedQuestion(baseQuestion || question, parsed.timeframe)
        const updated = [...messages]
        for (let i = updated.length - 1; i >= 0; i -= 1) {
          if (updated[i].role === 'user') {
            updated[i] = { ...updated[i], content: rewritten }
            break
          }
        }
        messages = updated
        question = rewritten
        conversationState = { ...conversationState, pendingClarification: null }
      } else if (pending?.kind === 'comparison') {
        const choice = resolveComparisonChoice(question)
        if (!choice) {
          const response: GymChatResponse = {
            assistantMessage: pending.question,
            citations: [],
            queries: [],
          }
          return respond(response)
        }
        if (choice === 'compare' && conversationState.pendingComparison) {
          const compareQuestion = buildComparisonQuestion(conversationState.pendingComparison, question)
          const updated = [...messages]
          for (let i = updated.length - 1; i >= 0; i -= 1) {
            if (updated[i].role === 'user') {
              updated[i] = { ...updated[i], content: compareQuestion }
              break
            }
          }
          messages = updated
          question = compareQuestion
          conversationState = {
            ...conversationState,
            pendingClarification: null,
            pendingComparison: {
              ...conversationState.pendingComparison,
              status: 'ready',
              explicit: true,
            },
          }
        } else {
          const candidateLabel = conversationState.pendingComparison
            ? formatScopeLabel(conversationState.pendingComparison.candidateScope)
            : null
          const nextQuestion = candidateLabel && candidateLabel !== 'the current scope'
            ? `Show ${candidateLabel}.`
            : question
          const updated = [...messages]
          for (let i = updated.length - 1; i >= 0; i -= 1) {
            if (updated[i].role === 'user') {
              updated[i] = { ...updated[i], content: nextQuestion }
              break
            }
          }
          messages = updated
          question = nextQuestion
          conversationState = {
            ...conversationState,
            pendingClarification: null,
            pendingComparison: null,
          }
        }
      }
    }
    if (conversationState.lastResponseContext && containsPronounReference(question)) {
      const resolved = resolvePronounReference(question, conversationState.lastResponseContext)
      resolvedPronoun = resolved
      if (resolved.ambiguous && resolved.options?.length) {
        conversationState = {
          ...conversationState,
          pendingClarification: {
            kind: 'exercise_choice',
            question,
            options: resolved.options,
          },
        }
        const response: GymChatResponse = {
          assistantMessage: buildExerciseChoicePrompt(resolved.options),
          citations: [],
          queries: [],
          followUps: sanitizeFollowUps(resolved.options.map(option => `Use ${option}.`)),
        }
        return respond(response)
      }
      if (resolved.resolved) {
        question = appendPronounContext(question, resolved)
        if (resolved.newIndex != null && conversationState.lastResponseContext) {
          conversationState = {
            ...conversationState,
            lastResponseContext: {
              ...conversationState.lastResponseContext,
              currentIndex: resolved.newIndex,
            },
          }
        }
        if (turnMode === 'new_question') {
          turnMode = 'analysis_followup'
        }
      }
    }
    const normalizedQuestionForClarification = normalizeWhitespace(question).toLowerCase()
    const hasDayOfWeekCue = DAY_OF_WEEK_CUE_REGEX.test(normalizedQuestionForClarification)
    const hasBodyPartCue =
      BODY_PART_KEYWORDS.length > 0 && containsKeyword(normalizedQuestionForClarification, BODY_PART_KEYWORDS)
    const hasBodyPartContext =
      conversationState.lastAnalysis?.kind === 'muscle_group_balance' ||
      conversationState.lastAnalysis?.kind === 'body_part_day_split'
    const extractedExercise = extractExerciseTarget(question)
    const hasExplicitExercise = Boolean(extractedExercise && !normalizeMuscleName(extractedExercise))
    const canCrossTabBodyPartDay = hasBodyPartsMapping()
    if (hasDayOfWeekCue && (hasBodyPartCue || hasBodyPartContext) && !hasExplicitExercise && !canCrossTabBodyPartDay) {
      const response: GymChatResponse = {
        assistantMessage:
          `I can provide day-of-week breakdowns and body part balance separately. ` +
          `Try one of these:\n\n` +
          `- Show session counts by day of week over the last 12 weeks.\n` +
          `- Compare my chest vs back volume over the last ${DEFAULT_TIME_WINDOW}.`,
        citations: [],
        queries: [],
        followUps: [
          'Show session counts by day of week over the last 12 weeks',
          `Compare my chest vs back volume over the last ${DEFAULT_TIME_WINDOW}`
        ],
      }
      return respond(response)
    }
    const exerciseClarificationOptions = shouldClarifyExerciseChoice({
      question,
      state: conversationState,
      turnMode,
    })
    if (exerciseClarificationOptions?.length) {
      conversationState = {
        ...conversationState,
        pendingClarification: {
          kind: 'exercise_choice',
          question,
          options: exerciseClarificationOptions,
        },
      }
      const response: GymChatResponse = {
        assistantMessage: buildExerciseChoicePrompt(exerciseClarificationOptions),
        citations: [],
        queries: [],
        followUps: sanitizeFollowUps(exerciseClarificationOptions.map(option => `Use ${option}.`)),
      }
      return respond(response)
    }
    const extractedScope = extractScopeFromQuestion(question)
    const resolvedScope: Partial<ContextFrame['scope']> = {}
    if (resolvedPronoun?.exercise) {
      resolvedScope.exercises = [resolvedPronoun.exercise]
    }
    if (resolvedPronoun?.dataPoint?.date) {
      resolvedScope.sessionDate = resolvedPronoun.dataPoint.date
    }
    // Track multiple target exercises for multi-exercise requests
    const multipleExercises = extractedScope.exercises && extractedScope.exercises.length > 1
    const targetExercises = multipleExercises ? extractedScope.exercises : null
    const comparisonIntent = detectComparisonIntent({
      question,
      state: conversationState,
      extracted: extractedScope,
      turnMode,
    })
    if (comparisonIntent?.status === 'clarify') {
      const clarificationQuestion = buildComparisonClarification(comparisonIntent)
      conversationState = {
        ...conversationState,
        pendingClarification: { kind: 'comparison', question: clarificationQuestion },
        pendingComparison: comparisonIntent,
      }
      const response: GymChatResponse = {
        assistantMessage: clarificationQuestion,
        citations: [],
        queries: [],
      }
      return respond(response)
    }
    pendingComparison =
      comparisonIntent ?? (turnMode === 'analysis_followup' ? conversationState.pendingComparison ?? null : null)
    if (isTopEndEffortsComparisonQuestion(question)) {
      analysisKindOverride = 'top_end_efforts_compare_12m_3m'
    }
    if (!analysisKindOverride && forceCanonicalFromLongPrompt) {
      analysisKindOverride = resolveLongPromptAnalysisKind(question)
    }
    if (!analysisKindOverride && isSetBreakdownQuestion(question)) {
      analysisKindOverride = 'set_breakdown'
    }
    if (!analysisKindOverride && isPrQuestion(question)) {
      analysisKindOverride = 'exercise_prs'
    }
    if (!analysisKindOverride && isBestSetsQuestion(question)) {
      analysisKindOverride = 'best_sets'
    }
    if (!analysisKindOverride && isExerciseSummaryQuestion(question)) {
      analysisKindOverride = 'exercise_summary'
    }
    if (!analysisKindOverride && isExerciseProgressionQuestion(question)) {
      analysisKindOverride = 'exercise_progression'
    }
    if (!analysisKindOverride && isTopWeightSetsQuestion(question)) {
      analysisKindOverride = 'top_weight_sets'
    }
    if (!analysisKindOverride && isWorstDayQuestion(question)) {
      analysisKindOverride = 'lowest_volume_day'
    }
    const normalizedQuestionForOverrides = normalizeWhitespace(question).toLowerCase()
    const hasWeekdayCue = WEEKDAY_CUE_REGEX.test(normalizedQuestionForOverrides)
    const hasTrainingDayCue = TRAINING_DAY_CUE_REGEX.test(normalizedQuestionForOverrides)
    const hasDayCue = hasWeekdayCue || hasTrainingDayCue

    const wantsWeekdayBreakdown =
      hasWeekdayCue &&
      !hasTrainingDayCue &&
      ((BODY_PART_KEYWORDS.length > 0 && containsKeyword(normalizedQuestionForOverrides, BODY_PART_KEYWORDS)) ||
        CROSS_TAB_REGEX.test(normalizedQuestionForOverrides) ||
        conversationState.lastAnalysis?.kind === 'muscle_group_balance')

    const wantsBodyPartDaySplitOverride =
      hasBodyPartsMapping() &&
      (hasTrainingDayCue || (hasDayCue && !hasWeekdayCue)) &&
      ((BODY_PART_KEYWORDS.length > 0 && containsKeyword(normalizedQuestionForOverrides, BODY_PART_KEYWORDS)) ||
        conversationState.lastAnalysis?.kind === 'muscle_group_balance' ||
        conversationState.lastAnalysis?.kind === 'body_part_day_split')

    if (!analysisKindOverride && wantsWeekdayBreakdown) {
      analysisKindOverride = 'weekday_breakdown'
    }
    if (!analysisKindOverride && wantsBodyPartDaySplitOverride) {
      analysisKindOverride = 'body_part_day_split'
    }
    if (!analysisKindOverride && isFavoriteSplitQuestion(question)) {
      analysisKindOverride = 'favorite_split_day'
    }
    if (!analysisKindOverride && isWeeklyVolumeQuestion(question)) {
      analysisKindOverride = 'weekly_volume'
    }
    if (!analysisKindOverride && isPeriodCompareQuestion(question)) {
      analysisKindOverride = 'period_compare'
    }
    if (!analysisKindOverride) {
      analysisKindOverride = resolveReturnEffortAnalysisKind(question)
    }
    if (!analysisKindOverride && isSetCountQuestion(question)) {
      analysisKindOverride = 'set_count'
    }
    if (!analysisKindOverride && isVolumeRankingQuestion(question)) {
      analysisKindOverride = 'volume'
    }
    if (!analysisKindOverride && isSessionCountQuestion(question)) {
      analysisKindOverride = 'session_count'
    }
    if (!analysisKindOverride && isBest1rmOverallQuestion(question)) {
      analysisKindOverride = 'best_1rm_overall'
    }
    if (!analysisKindOverride && isInactiveExercisesQuestion(question)) {
      analysisKindOverride = 'inactive_exercises'
    }
    if (!analysisKindOverride && isWorkoutTimingQuestion(question)) {
      analysisKindOverride = 'workout_timing'
    }
    if (turnMode === 'analysis_followup' && !analysisKindOverride && conversationState.lastAnalysis?.kind) {
      analysisKindOverride = conversationState.lastAnalysis.kind
    }

    topicShifted = detectTopicShift({
      question,
      state: conversationState,
      nextAnalysisKind: analysisKindOverride ?? conversationState.lastAnalysis?.kind,
      turnMode,
      comparison: pendingComparison,
    })
    if (topicShifted) {
      conversationState = resetConversationForTopicShift(conversationState)
      pendingComparison = null
      turnMode = 'new_question'
    }

    // Avoid auto-rewriting follow-ups into comparisons; explicit compare prompts handle this already.

    const hasFollowupContext =
      turnMode === 'analysis_followup' &&
      Boolean(conversationState.lastAnalysis || conversationState.lastResponseContext || conversationState.lastPlanMeta)
    const forceCanonicalPlan = forceCanonicalFromLongPrompt || hasFollowupContext

    const updatedScope = updateScopeFromQuestion({
      scope: conversationState.scope,
      extracted: extractedScope,
      resolved: resolvedScope,
      comparison: pendingComparison,
      turnId,
      timestamp: turnTimestamp,
    })
    if (pendingComparison?.mode === 'replace') {
      pendingComparison = null
    }
    conversationState = {
      ...conversationState,
      pendingComparison,
      scope: updatedScope,
    }
    conversationState = recordUserTurn({
      state: conversationState,
      question,
      turnId,
      timestamp: turnTimestamp,
      turnMode,
      scope: conversationState.scope,
    })

    if (isTechniqueQuestion(question)) {
      const entry = findExerciseEntry(question)
      if (entry) {
        const followUps = sanitizeFollowUps([
          `Show my ${entry.name} progression over time.`,
          `Show my best sets for ${entry.name}.`,
          `Show my most recent ${entry.name} session.`,
        ])
        conversationState = applyPlanMeta(conversationState, planMeta)
        const response: GymChatResponse = {
          assistantMessage: buildExerciseGuidanceMessage(entry),
          citations: [],
          queries: [],
          followUps,
        }
        return respond(response)
      }
    }

    const llmMessages = buildLlmContext({ question, state: conversationState, mode: turnMode })
    let classification: Awaited<ReturnType<typeof classifyQuestion>>
    const combinedUserText = question
    const hasGymSignal =
      looksLikeGymIntent(combinedUserText) ||
      hasMuscleConstraint ||
      Boolean(extractedExercise) ||
      Boolean(conversationState.lastAnalysis || conversationState.lastResponseContext)
    if (forceCanonicalPlan && hasGymSignal) {
      sendStatus('classify', 'Using conversation context')
      const inferredTargetsForClassification = inferTargets(combinedUserText)
      classification = {
        domain: 'gym_data',
        confidence: 0.95,
        clarifyingQuestion: undefined,
        intentType:
          (analysisKindOverride ? ANALYSIS_INTENT_HINTS[analysisKindOverride] : undefined) ??
          inferIntentType(combinedUserText),
        primaryGrain: inferPrimaryGrain(combinedUserText),
        targets: inferredTargetsForClassification.length ? inferredTargetsForClassification : undefined,
      }
      log('classification skipped', { reason: forceCanonicalFromLongPrompt ? 'long_prompt' : 'followup' })
    } else {
      sendStatus('classify', 'Classifying question')
      const classifyStartedAt = Date.now()
      try {
        classification = await classifyQuestion(llmMessages, llmOptions)
      } catch (error) {
        if (isLlmRequestError(error)) {
          log('classification failed', { status: error.status, retryable: error.retryable, detail: error.detail })
          const likelyGymQuestion = looksLikeGymIntent(question) || hasMuscleConstraint
          const assistantMessage = likelyGymQuestion
            ? "I'm not sure I understood the specific analysis you're after. Can you rephrase with a lift or focus area and a timeframe?"
            : "I'm not sure I understood that. Can you clarify what you'd like to know about training or your workout history?"
          const response: GymChatResponse = {
            assistantMessage,
            citations: [],
            queries: [],
          }
          return respond(response)
        }
        throw error
      }
      log('classification completed', { durationMs: Date.now() - classifyStartedAt })
      log('classification', classification)
    }
    classification.primaryGrain = normalizePrimaryGrainValue(classification.primaryGrain)
    const intervalHints = extractIntervalHints(question)
    const likelyGymIntent = looksLikeGymIntent(combinedUserText) || hasMuscleConstraint
    const likelyPlanningIntent = looksLikePlanningIntent(combinedUserText) || hasMuscleConstraint
    if (likelyGymIntent) {
      if (classification.domain === 'other') {
        log('classification override: forcing fitness_general domain due to workout intent heuristics')
        classification.domain = 'fitness_general'
      }
      if (classification.confidence < 0.9) {
        classification.confidence = 0.9
      }
      if (classification.clarifyingQuestion) {
        classification.clarifyingQuestion = undefined
      }
    }
    if (likelyPlanningIntent && classification.domain === 'gym_data') {
      if (classification.intentType !== 'planning') {
        log('intent override: inferring planning intent from question heuristics')
      }
      classification.intentType = 'planning'
      if (classification.confidence < 0.9) {
        classification.confidence = 0.9
      }
      if (classification.clarifyingQuestion) {
        classification.clarifyingQuestion = undefined
      }
    }
    if (wantsHistoricalLifts && classification.domain !== 'gym_data') {
      classification.domain = 'gym_data'
      classification.confidence = Math.max(classification.confidence, 0.8)
      classification.clarifyingQuestion = undefined
    }
    const prefersGymDataForLogs = shouldPreferGymDataForLogQuestion(combinedUserText)
    if (prefersGymDataForLogs && classification.domain !== 'gym_data') {
      classification.domain = 'gym_data'
      classification.confidence = Math.max(classification.confidence, 0.85)
      classification.clarifyingQuestion = undefined
    }
    if (hasMuscleConstraint && classification.intentType !== 'planning') {
      classification.intentType = 'planning'
    }
    const hasGymContextOverride =
      Boolean(analysisKindOverride) ||
      (turnMode === 'analysis_followup' && (conversationState.lastAnalysis || conversationState.lastPlanMeta))
    if (hasGymContextOverride && classification.domain !== 'gym_data') {
      classification.domain = 'gym_data'
      classification.confidence = Math.max(classification.confidence, 0.8)
      if (classification.clarifyingQuestion) {
        classification.clarifyingQuestion = undefined
      }
    }
    if (analysisKindOverride) {
      const hintedIntent = ANALYSIS_INTENT_HINTS[analysisKindOverride]
      if (hintedIntent && (turnMode === 'analysis_followup' || !classification.intentType)) {
        classification.intentType = hintedIntent
      }
    }
    if (!classification.intentType) {
      const inferredIntent = inferIntentType(combinedUserText)
      if (inferredIntent) {
        classification.intentType = inferredIntent
      }
    }
    if (!classification.primaryGrain) {
      const inferredGrain = inferPrimaryGrain(combinedUserText)
      if (inferredGrain) {
        classification.primaryGrain = inferredGrain
      }
    }
    const inferredTargets = inferTargets(combinedUserText)
    if (inferredTargets.length) {
      const mergedTargets = new Set([...(classification.targets ?? []), ...inferredTargets])
      classification.targets = Array.from(mergedTargets)
    }
    if (hasMuscleConstraint) {
      const mergedTargets = new Set([...(classification.targets ?? []), 'body_part'])
      classification.targets = Array.from(mergedTargets)
    }
    if (!classification.intentType) {
      classification.intentType = 'descriptive'
    }
    if (!topicShifted) {
      const inferredTopic = inferTopicFromIntent(classification.intentType)
      const topicShiftFromIntent = detectTopicShiftByTopic({
        question,
        state: conversationState,
        nextTopic: inferredTopic,
        turnMode,
        comparison: pendingComparison,
        confidence: classification.confidence,
      })
      if (topicShiftFromIntent) {
        topicShifted = true
        conversationState = resetConversationForTopicShift(conversationState)
        pendingComparison = null
        turnMode = 'new_question'
      }
    }
    const intentHints = {
      intentType: classification.intentType,
      primaryGrain: classification.primaryGrain,
      targets: classification.targets,
      planMeta,
    }
    let templateSelection = selectTemplates({
      question: combinedUserText,
      intentType: classification.intentType,
      targets: classification.targets,
    })
    if (turnMode === 'analysis_followup' && conversationState.lastAnalysis?.kind) {
      const hinted = ANALYSIS_TEMPLATE_HINTS[conversationState.lastAnalysis.kind]
      if (hinted) {
        templateSelection = { primary: hinted, secondary: templateSelection.secondary }
      }
    }
    let evalMeta: GymChatEvalMeta = {
      intentType: classification.intentType,
      selectedTemplate: templateSelection.primary,
      secondaryTemplate: templateSelection.secondary,
    }
    if (classification.domain === 'other' && classification.confidence >= 0.8) {
      const response: GymChatResponse = {
        assistantMessage: buildRefusalMessage(),
        citations: [],
        queries: [],
        refusal: {
          message: 'Out of scope.',
          reason: 'Question is not about gym data.',
        },
      }
      return respond(response, undefined, evalMeta)
    }

    if (classification.confidence < 0.8) {
      if (classification.domain === 'gym_data') {
        classification.confidence = 0.8
        classification.clarifyingQuestion = undefined
      } else {
        const followUps = undefined
        const response: GymChatResponse = {
          assistantMessage:
            classification.clarifyingQuestion ||
            'Can you clarify what gym data you want to analyze?',
          citations: [],
          queries: [],
          followUps,
        }
        return respond(response, undefined, evalMeta)
      }
    }

    if (classification.domain === 'fitness_general') {
      sendStatus('explain', 'Drafting guidance')
      const explainStartedAt = Date.now()
      const explanation = await explainFitnessGeneral(llmMessages, llmOptions)
      log('fitness general explained', { durationMs: Date.now() - explainStartedAt })
      conversationState = applyPlanMeta(conversationState, planMeta)
      const response: GymChatResponse = {
        assistantMessage: explanation.assistantMessage,
        citations: [],
        queries: [],
        followUps: sanitizeFollowUps(explanation.followUps),
      }
      return respond(response, undefined, { ...evalMeta, queryCount: 0 })
    }

    if (shouldConfirmPlan(combinedUserText, classification.intentType)) {
      const response: GymChatResponse = {
        assistantMessage:
          'Proposed plan: I can analyze within-session drop-off (early vs late sets) and broader workload trends to pinpoint where momentum fades. ' +
          'Quick check: should I focus on within-session fade or across-week trends?',
        citations: [],
        queries: [],
      }
      return respond(response, undefined, evalMeta)
    }

    if (classification.domain === 'gym_data' && RETURN_EFFORT_REGEX.test(question) && !analysisKindOverride) {
      conversationState = { ...conversationState, pendingClarification: { kind: 'return_for_effort_metric' } }
      const response: GymChatResponse = {
        assistantMessage:
          "When you say 'return for effort', do you mean (a or 1) total volume per exercise, (b or 2) progression over time, or (c) something else? " +
          'I can compute (a) or (b) from your logs.',
        citations: [],
        queries: [],
        followUps: [
          'Show total volume per exercise over the last 90 days?',
          'Show my progression over time for each exercise?',
        ],
      }
      return respond(response, undefined, evalMeta)
    }

    let plan: Awaited<ReturnType<typeof planGymSql>>
    if (forceCanonicalPlan) {
      plan = {
        queries: [],
        template: templateSelection.primary,
        secondaryTemplate: templateSelection.secondary,
        refusal: undefined,
      } as Awaited<ReturnType<typeof planGymSql>>
      log('plan skipped', { reason: forceCanonicalFromLongPrompt ? 'long_prompt' : 'followup' })
    } else {
      sendStatus('plan', 'Planning SQL')
      const planStartedAt = Date.now()
      plan = await planGymSql(
        llmMessages,
        timezone,
        {
          ...intentHints,
          template: templateSelection.primary,
          secondaryTemplate: templateSelection.secondary,
        },
        llmOptions,
      )
      log('plan completed', { durationMs: Date.now() - planStartedAt })
    }
    const plannedTemplate = normalizeTemplateName(plan.template)
    const plannedSecondaryTemplate = normalizeTemplateName(plan.secondaryTemplate)
    const selectedTemplate = plannedTemplate ?? templateSelection.primary
    const secondaryTemplate =
      plannedSecondaryTemplate ??
      (plannedTemplate && plannedTemplate !== templateSelection.primary
        ? templateSelection.primary
        : templateSelection.secondary)
    evalMeta = {
      ...evalMeta,
      selectedTemplate,
      secondaryTemplate,
    }

    const useBodyParts = hasBodyPartsMapping()
    const setsBase = buildSetsBaseCte()
    const hasExplicitWindow = hasExplicitTimeWindow(question)
    const sessionDateFilter = resolveSessionDateFilter({ question, state: conversationState })
    const scopeWindow =
      conversationState.scope?.timeWindows?.sticky?.value ?? conversationState.scope?.timeWindows?.primary?.value
    const contextWindow = normalizeContextWindow(
      conversationState.lastTimeWindow ?? conversationState.lastResponseContext?.timeWindow ?? scopeWindow,
    )
    let wantsAllTimeWindow = containsKeyword(question, ALL_TIME_KEYWORDS)
    if (
      turnMode === 'analysis_followup' &&
      !hasExplicitWindow &&
      !wantsAllTimeWindow &&
      contextWindow === 'all_time'
    ) {
      wantsAllTimeWindow = true
    }
    const stickyWindow = conversationState.scope?.timeWindows?.sticky?.value ?? null
    let explicitWindow = wantsAllTimeWindow ? null : extractExplicitWindow(question) ?? stickyWindow ?? null
    if (!hasExplicitWindow && !explicitWindow && contextWindow && contextWindow !== 'all_time') {
      explicitWindow = contextWindow
    }
    let comparisonWindows = extractComparisonWindows(question)
    const comparisonWindowFromContext =
      !hasExplicitWindow &&
      comparisonWindows.length === 0 &&
      Boolean(contextWindow && contextWindow !== 'all_time')
    if (comparisonWindowFromContext && contextWindow) {
      comparisonWindows = [contextWindow]
    }
    const defaultCompareWindow = '4 weeks'
    const compareWindow = comparisonWindows[0] ?? defaultCompareWindow
    const comparePriorWindow = comparisonWindows[1] ?? compareWindow
    const compareDefaultsUsed = comparisonWindows.length === 0 && !comparisonWindowFromContext
    const comparePriorInferred = comparisonWindows.length === 1
    const requestedTopN = extractRequestedTopN(question)
    const topWeightLimit = requestedTopN ?? 5
    const rankingLimit = requestedTopN ?? 10
    const topWeightWindow = explicitWindow ?? DEFAULT_TIME_WINDOW
    const worstDayWindow = explicitWindow ?? '30 days'
    const favoriteSplitWindow = explicitWindow ?? '12 months'
    const weeklyVolumeWindow = explicitWindow ?? '12 months'
    const planningWindow = explicitWindow ?? '12 months'
    const sessionCountWindow = explicitWindow ?? '12 weeks'
    const exerciseTarget = resolveExerciseTarget({ question, state: conversationState, turnMode })
    const correctionAcknowledgement = correctionDetected ? buildCorrectionAcknowledgement(exerciseTarget) : null
    const useEstimated1rm = wantsEstimated1rm(question)
    const progressionBucket = MONTHLY_TREND_REGEX.test(question) ? 'month' : 'week'
    const summaryWindow = explicitWindow ?? DEFAULT_TIME_WINDOW
    const progressionWindow = explicitWindow ?? '12 months'
    const setBreakdownWindow = explicitWindow ?? DEFAULT_TIME_WINDOW
    const setBreakdownWindowDays = windowToDays(setBreakdownWindow)
    const setBreakdownAnchorAllTime =
      wantsAllTimeWindow || (setBreakdownWindowDays !== null && setBreakdownWindowDays >= 365)
    const setBreakdownAnchorWindow = '12 months'
    const setBreakdownAllTime = exerciseTarget ? setBreakdownAnchorAllTime : wantsAllTimeWindow
    const normalizedQuestion = normalizeWhitespace(question).toLowerCase()
    const hasDayOfWeekCueForSplit = DAY_OF_WEEK_CUE_REGEX.test(normalizedQuestion)
    const hasBodyPartCueForSplit =
      BODY_PART_KEYWORDS.length > 0 && containsKeyword(normalizedQuestion, BODY_PART_KEYWORDS)
    const hasBodyPartContextForSplit =
      conversationState.lastAnalysis?.kind === 'muscle_group_balance' ||
      conversationState.lastAnalysis?.kind === 'body_part_day_split'
    const wantsBodyPartDaySplit =
      useBodyParts &&
      (hasBodyPartCueForSplit || hasBodyPartContextForSplit) &&
      (hasDayOfWeekCueForSplit || CROSS_TAB_REGEX.test(normalizedQuestion))
    const favoriteSplitLimit = hasDayOfWeekCueForSplit ? 7 : undefined
    const isReturnEffortProgression =
      analysisKindOverride === 'return_for_effort_progression' ||
      normalizedQuestion === normalizeWhitespace(RETURN_EFFORT_PROGRESSION_QUESTION).toLowerCase() ||
      RETURN_EFFORT_PROGRESSION_REGEX.test(question)
    const isStalledLiftsQuestion = STALLED_LIFTS_REGEX.test(question)
    const isLightWeightProgressQuestion = LIGHTER_WEIGHTS_REGEX.test(question)
    const isMuscleGroupQuestion = MUSCLE_GROUP_COMPARISON_REGEX.test(combinedUserText)
    const isTopEndEffortQuestion = TOP_END_EFFORT_REGEX.test(combinedUserText)
    let canonicalAnalysisKind: AnalysisKind | undefined
    const workoutPlan =
      classification.intentType === 'planning' && hasMuscleConstraint && !analysisKindOverride
        ? buildWorkoutPlanQueries({
            lifts: setsBase,
            constraint: planMeta?.targetsMuscles,
            window: planningWindow,
            maxExercises: 6,
          })
        : null
    const canonicalPlan = (() => {
      if (analysisKindOverride === 'progressive_overload') {
        canonicalAnalysisKind = 'progressive_overload'
        return buildProgressiveOverloadPlan(setsBase)
      }
      if (analysisKindOverride === 'return_for_effort_volume') {
        canonicalAnalysisKind = 'return_for_effort_volume'
        return buildReturnEffortVolumePlan(setsBase, {
          window: explicitWindow ?? DEFAULT_TIME_WINDOW,
          limit: requestedTopN ?? undefined,
        })
      }
      if (analysisKindOverride === 'return_for_effort_progression') {
        canonicalAnalysisKind = 'return_for_effort_progression'
        return buildReturnEffortProgressionPlan(setsBase)
      }
      if (analysisKindOverride === 'set_count') {
        canonicalAnalysisKind = 'set_count'
        return buildSetCountPlan(setsBase, { limit: rankingLimit, window: topWeightWindow })
      }
      if (analysisKindOverride === 'volume') {
        canonicalAnalysisKind = 'volume'
        return buildVolumeRankingPlan(setsBase, { limit: rankingLimit, window: topWeightWindow })
      }
      if (analysisKindOverride === 'session_count') {
        canonicalAnalysisKind = 'session_count'
        return buildSessionCountPlan(setsBase, { window: sessionCountWindow })
      }
      if (analysisKindOverride === 'stalled_lifts') {
        canonicalAnalysisKind = 'stalled_lifts'
        return buildStalledLiftsPlan(setsBase)
      }
      if (analysisKindOverride === 'exercise_prs') {
        canonicalAnalysisKind = 'exercise_prs'
        return buildExercisePrsPlan(setsBase, {
          limit: rankingLimit,
          window: summaryWindow,
          exercise: exerciseTarget,
          useEstimated1rm,
          allTime: wantsAllTimeWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (analysisKindOverride === 'best_sets') {
        canonicalAnalysisKind = 'best_sets'
        return buildBestSetsPlan(setsBase, {
          limit: topWeightLimit,
          window: summaryWindow,
          exercise: exerciseTarget,
          useEstimated1rm,
          allTime: wantsAllTimeWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (analysisKindOverride === 'set_breakdown') {
        canonicalAnalysisKind = 'set_breakdown'
        return buildSetBreakdownPlan(setsBase, {
          window: setBreakdownWindow,
          exercise: exerciseTarget,
          useEstimated1rm,
          allTime: setBreakdownAllTime,
          anchorWindow: setBreakdownAnchorWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (analysisKindOverride === 'exercise_summary') {
        canonicalAnalysisKind = 'exercise_summary'
        return buildExerciseSummaryPlan(setsBase, {
          limit: rankingLimit,
          window: summaryWindow,
          exercise: exerciseTarget,
          allTime: wantsAllTimeWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (analysisKindOverride === 'exercise_progression') {
        canonicalAnalysisKind = 'exercise_progression'
        return buildExerciseProgressionPlan(setsBase, {
          window: progressionWindow,
          exercise: exerciseTarget,
          bucket: progressionBucket,
          allTime: wantsAllTimeWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (analysisKindOverride === 'lighter_weight_progress') {
        canonicalAnalysisKind = 'lighter_weight_progress'
        return buildLightWeightProgressPlan(setsBase)
      }
      if (analysisKindOverride === 'top_weight_sets') {
        canonicalAnalysisKind = 'top_weight_sets'
        return buildTopWeightSetsPlan(setsBase, { limit: topWeightLimit, window: topWeightWindow })
      }
      if (analysisKindOverride === 'lowest_volume_day') {
        canonicalAnalysisKind = 'lowest_volume_day'
        return buildWorstDayVolumePlan(setsBase, { window: worstDayWindow })
      }
      if (analysisKindOverride === 'weekday_breakdown') {
        canonicalAnalysisKind = 'weekday_breakdown'
        const hasCrossTab =
          CROSS_TAB_REGEX.test(normalizedQuestion) ||
          (BODY_PART_KEYWORDS.length > 0 && containsKeyword(normalizedQuestion, BODY_PART_KEYWORDS))

        return buildWeekdayBreakdownPlan(setsBase, {
          window: explicitWindow ?? DEFAULT_TIME_WINDOW,
          groupBy: hasCrossTab ? 'weekday_bodypart' : 'weekday',
        })
      }
      if (analysisKindOverride === 'body_part_day_split') {
        canonicalAnalysisKind = 'body_part_day_split'
        return buildBodyPartDaySplitPlan(setsBase, { window: explicitWindow ?? '12 weeks', limit: 200 })
      }
      if (analysisKindOverride === 'favorite_split_day') {
        canonicalAnalysisKind = 'favorite_split_day'
        return buildFavoriteSplitDayPlan(setsBase, { window: favoriteSplitWindow, limit: favoriteSplitLimit })
      }
      if (analysisKindOverride === 'weekly_volume') {
        canonicalAnalysisKind = 'weekly_volume'
        return buildWeeklyVolumePlan(setsBase, { window: weeklyVolumeWindow })
      }
      if (analysisKindOverride === 'period_compare') {
        canonicalAnalysisKind = 'period_compare'
        return buildPeriodComparePlan(setsBase, { window1: compareWindow, window2: comparePriorWindow })
      }
      if (analysisKindOverride === 'top_end_efforts') {
        canonicalAnalysisKind = 'top_end_efforts'
        return buildTopEndEffortsPlan(setsBase)
      }
      if (analysisKindOverride === 'top_end_efforts_compare_12m_3m') {
        canonicalAnalysisKind = 'top_end_efforts_compare_12m_3m'
        return buildTopEndEffortsComparisonPlan(setsBase)
      }
      if (analysisKindOverride === 'muscle_group_balance') {
        canonicalAnalysisKind = 'muscle_group_balance'
        return buildMuscleGroupComparisonPlan(useBodyParts, setsBase)
      }
      if (analysisKindOverride === 'best_1rm_overall') {
        canonicalAnalysisKind = 'best_1rm_overall'
        return buildBest1rmOverallPlan(setsBase, {
          window: summaryWindow,
          limit: rankingLimit,
          allTime: wantsAllTimeWindow,
        })
      }
      if (analysisKindOverride === 'inactive_exercises') {
        canonicalAnalysisKind = 'inactive_exercises'
        return buildInactiveExercisesPlan(setsBase, {
          window: explicitWindow ?? '30 days',
          limit: rankingLimit,
        })
      }
      if (analysisKindOverride === 'workout_timing') {
        canonicalAnalysisKind = 'workout_timing'
        return buildWorkoutTimingPlan(setsBase, {
          window: explicitWindow ?? '12 months',
        })
      }
      if (isPrQuestion(question)) {
        canonicalAnalysisKind = 'exercise_prs'
        return buildExercisePrsPlan(setsBase, {
          limit: rankingLimit,
          window: summaryWindow,
          exercise: exerciseTarget,
          useEstimated1rm,
          allTime: wantsAllTimeWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (isBestSetsQuestion(question)) {
        canonicalAnalysisKind = 'best_sets'
        return buildBestSetsPlan(setsBase, {
          limit: topWeightLimit,
          window: summaryWindow,
          exercise: exerciseTarget,
          useEstimated1rm,
          allTime: wantsAllTimeWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (isSetBreakdownQuestion(question)) {
        canonicalAnalysisKind = 'set_breakdown'
        return buildSetBreakdownPlan(setsBase, {
          window: setBreakdownWindow,
          exercise: exerciseTarget,
          useEstimated1rm,
          allTime: setBreakdownAllTime,
          anchorWindow: setBreakdownAnchorWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (isExerciseSummaryQuestion(question)) {
        canonicalAnalysisKind = 'exercise_summary'
        return buildExerciseSummaryPlan(setsBase, {
          limit: rankingLimit,
          window: summaryWindow,
          exercise: exerciseTarget,
          allTime: wantsAllTimeWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (isExerciseProgressionQuestion(question)) {
        canonicalAnalysisKind = 'exercise_progression'
        return buildExerciseProgressionPlan(setsBase, {
          window: progressionWindow,
          exercise: exerciseTarget,
          bucket: progressionBucket,
          allTime: wantsAllTimeWindow,
          sessionDate: sessionDateFilter ?? undefined,
        })
      }
      if (PROGRESSIVE_OVERLOAD_REGEX.test(combinedUserText)) {
        canonicalAnalysisKind = 'progressive_overload'
        return buildProgressiveOverloadPlan(setsBase)
      }
      if (isReturnEffortProgression) {
        canonicalAnalysisKind = 'return_for_effort_progression'
        return buildReturnEffortProgressionPlan(setsBase)
      }
      if (isStalledLiftsQuestion) {
        canonicalAnalysisKind = 'stalled_lifts'
        return buildStalledLiftsPlan(setsBase)
      }
      if (isLightWeightProgressQuestion) {
        canonicalAnalysisKind = 'lighter_weight_progress'
        return buildLightWeightProgressPlan(setsBase)
      }
      if (isTopWeightSetsQuestion(question)) {
        canonicalAnalysisKind = 'top_weight_sets'
        return buildTopWeightSetsPlan(setsBase, { limit: topWeightLimit, window: topWeightWindow })
      }
      if (isWorstDayQuestion(question)) {
        canonicalAnalysisKind = 'lowest_volume_day'
        return buildWorstDayVolumePlan(setsBase, { window: worstDayWindow })
      }
      if (wantsBodyPartDaySplit) {
        canonicalAnalysisKind = 'body_part_day_split'
        return buildBodyPartDaySplitPlan(setsBase, { window: explicitWindow ?? '12 weeks', limit: 200 })
      }
      if (isFavoriteSplitQuestion(question)) {
        canonicalAnalysisKind = 'favorite_split_day'
        return buildFavoriteSplitDayPlan(setsBase, { window: favoriteSplitWindow, limit: favoriteSplitLimit })
      }
      if (isWeeklyVolumeQuestion(question)) {
        canonicalAnalysisKind = 'weekly_volume'
        return buildWeeklyVolumePlan(setsBase, { window: weeklyVolumeWindow })
      }
      if (isPeriodCompareQuestion(question)) {
        canonicalAnalysisKind = 'period_compare'
        return buildPeriodComparePlan(setsBase, { window1: compareWindow, window2: comparePriorWindow })
      }
      if (isTopEndEffortQuestion) {
        canonicalAnalysisKind = 'top_end_efforts'
        return buildTopEndEffortsPlan(setsBase)
      }
      if (isMuscleGroupQuestion) {
        canonicalAnalysisKind = 'muscle_group_balance'
        return buildMuscleGroupComparisonPlan(useBodyParts, setsBase)
      }
      return null
    })()

    // Build multi-exercise plans if multiple exercises were specified
    let multiExercisePlan: CanonicalPlan | null = null
    if (targetExercises && targetExercises.length >= 2 && targetExercises.length <= 5) {
      const perExercisePlans: CanonicalPlan[] = []

      for (const exercise of targetExercises) {
        let planForExercise: CanonicalPlan | null = null

        if (canonicalAnalysisKind === 'exercise_progression') {
          planForExercise = buildExerciseProgressionPlan(setsBase, {
            exercise,
            window: explicitWindow ?? DEFAULT_TIME_WINDOW,
            bucket: progressionBucket,
          })
        } else if (canonicalAnalysisKind === 'exercise_summary') {
          planForExercise = buildExerciseSummaryPlan(setsBase, {
            exercise,
            window: explicitWindow ?? DEFAULT_TIME_WINDOW,
          })
        } else if (canonicalAnalysisKind === 'best_sets') {
          planForExercise = buildBestSetsPlan(setsBase, {
            exercise,
            window: explicitWindow ?? DEFAULT_TIME_WINDOW,
            limit: requestedTopN ?? 10,
          })
        } else {
          // Default to exercise summary
          planForExercise = buildExerciseSummaryPlan(setsBase, {
            exercise,
            window: explicitWindow ?? DEFAULT_TIME_WINDOW,
          })
        }

        if (planForExercise) {
          // Prefix query IDs with exercise name to avoid conflicts
          const prefixed: CanonicalPlan = {
            queries: planForExercise.queries.map((q: any, i: number) => ({
              ...q,
              id: `${exercise.replace(/\s+/g, '_').toLowerCase()}_${q.id || `q${i + 1}`}`,
              purpose: `[${exercise}] ${q.purpose}`,
            })),
          }
          perExercisePlans.push(prefixed)
        }
      }

      // Merge all plans
      if (perExercisePlans.length) {
        multiExercisePlan = {
          queries: perExercisePlans.flatMap((p: any) => p.queries),
        }
      }
    }

    // Use multiExercisePlan if it exists
    const finalCanonicalPlan = multiExercisePlan ?? canonicalPlan

    if (plan.refusal && !finalCanonicalPlan && !workoutPlan) {
      const response: GymChatResponse = {
        assistantMessage: plan.refusal.message,
        citations: [],
        queries: [],
        refusal: plan.refusal,
      }
      return respond(response, undefined, evalMeta)
    }

    const plannedQueries = (workoutPlan?.queries ?? finalCanonicalPlan?.queries ?? plan.queries ?? []).map((query: any, index: number) => ({
      ...query,
      id: query.id || `q${index + 1}`,
    }))
    const isCanonicalPlan = Boolean(finalCanonicalPlan) && !workoutPlan
    const isWorkoutPlan = Boolean(workoutPlan)

    log('planned queries', plannedQueries.length)

    if (!plannedQueries.length) {
      const response: GymChatResponse = {
        assistantMessage:
          'I could not plan a gym data query for that. Do you want a data-backed analysis of your logs, or general training guidance instead?',
        citations: [],
        queries: [],
      }
      return respond(response, undefined, { ...evalMeta, queryCount: 0 })
    }

    let executedQueries: GymChatQuery[] = []
    for (const query of plannedQueries) {
      const normalizedParams = coerceIntervalParams(query.sql, query.params ?? [], intervalHints)
      if (isCanonicalPlan) {
        const safetyError = validateCanonicalSqlSafety(query.sql)
        const appliedLimit = inferCanonicalLimit(query.sql)
        executedQueries.push({
          id: query.id,
          purpose: query.purpose,
          sql: query.sql,
          params: normalizedParams,
          rowCount: 0,
          durationMs: 0,
          previewRows: [],
          error: safetyError,
          policy: {
            appliedLimit,
            appliedTimeWindow: inferCanonicalTimeWindow(normalizedParams, query.sql),
          },
        })
        continue
      }
      try {
        const policy = validateAndRewriteSql(query.sql, normalizedParams)
        executedQueries.push({
          id: query.id,
          purpose: query.purpose,
          sql: policy.sql,
          params: normalizedParams,
          rowCount: 0,
          durationMs: 0,
          previewRows: [],
          error: null,
          policy: {
            appliedLimit: policy.appliedLimit,
            appliedTimeWindow: policy.appliedTimeWindow,
          },
        })
      } catch (error) {
        executedQueries.push({
          id: query.id,
          purpose: query.purpose,
          sql: query.sql,
          params: normalizedParams,
          rowCount: 0,
          durationMs: 0,
          previewRows: [],
          error: error instanceof Error ? error.message : 'SQL policy violation.',
        })
      }
    }

    let hasPolicyErrors = executedQueries.some(query => query.error)
    if (hasPolicyErrors) {
      const unsafePolicy = executedQueries.some(query => query.error && isUnsafePolicyError(query.error))
      let nextSqlById: Record<string, string> | undefined
      if (!unsafePolicy) {
        sendStatus('repair', 'Repairing query plan')
        const repairStartedAt = Date.now()
        const repairPlan = await repairGymSql(
          llmMessages,
          timezone,
          {
            question,
            failedQueries: executedQueries.map(query => ({
              id: query.id,
              purpose: query.purpose,
              sql: query.sql,
              params: query.params,
              error: query.error,
            })),
          },
          {
            intentType: intentHints.intentType,
            primaryGrain: intentHints.primaryGrain,
            targets: intentHints.targets,
            planMeta: intentHints.planMeta,
            template: selectedTemplate,
            secondaryTemplate,
          },
          llmOptions,
        )
        log('repair plan completed', { durationMs: Date.now() - repairStartedAt })
        if (repairPlan?.queries?.length) {
          nextSqlById = Object.fromEntries(repairPlan.queries.map(query => [query.id, query.sql]))
          const repairedQueries = repairPlan.queries.map((query, index) => ({
            ...query,
            id: query.id || `q${index + 1}`,
          }))
          const nextExecuted: GymChatQuery[] = []
          for (const query of repairedQueries) {
            const normalizedParams = coerceIntervalParams(query.sql, query.params ?? [], intervalHints)
            try {
              const policy = validateAndRewriteSql(query.sql, normalizedParams)
              nextExecuted.push({
                id: query.id,
                purpose: query.purpose,
                sql: policy.sql,
                params: normalizedParams,
                rowCount: 0,
                durationMs: 0,
                previewRows: [],
                error: null,
                policy: {
                  appliedLimit: policy.appliedLimit,
                  appliedTimeWindow: policy.appliedTimeWindow,
                },
              })
            } catch (error) {
              nextExecuted.push({
                id: query.id,
                purpose: query.purpose,
                sql: query.sql,
                params: normalizedParams,
                rowCount: 0,
                durationMs: 0,
                previewRows: [],
                error: error instanceof Error ? error.message : 'SQL policy violation.',
              })
            }
          }
          executedQueries = nextExecuted
          hasPolicyErrors = executedQueries.some(query => query.error)
        }
      }
      if (hasPolicyErrors) {
        if (unsafePolicy) {
          const rescueResponse = buildLongPromptRescueResponse(question)
          if (rescueResponse) {
            return respond(rescueResponse, undefined, { ...evalMeta, queryCount: executedQueries.length })
          }
          const response: GymChatResponse = {
            assistantMessage: 'I could not run that request safely. Please rephrase your question.',
            citations: [],
            queries: executedQueries,
            refusal: {
              message: 'SQL policy violation.',
            },
          }
          return respond(response, undefined, { ...evalMeta, queryCount: executedQueries.length })
        }
        const errorResult = buildSqlErrorAssistantMessage(question, executedQueries, {
          nextSqlById,
          timeWindow: explicitWindow ?? contextWindow ?? 'all_time',
        })
        const response: GymChatResponse = {
          assistantMessage: errorResult.message,
          citations: [],
          queries: executedQueries,
          followUps: errorResult.followUps,
        }
        return respond(response, undefined, { ...evalMeta, queryCount: executedQueries.length })
      }
    }

    const connection = resolveReadonlyConnection()
    if (!connection) {
      return respond(
        { error: 'Missing read-only database connection.' },
        { status: 500 },
        { ...evalMeta, queryCount: executedQueries.length },
      )
    }
    if (connection.fallback) {
      console.warn('GYM_CHAT_DATABASE_URL_READONLY missing; falling back to default connection in development.')
    }

    const usePool = connection.url.includes('-pooler.')
    const runQueries = async (queries: GymChatQuery[]) => {
      const runStartedAt = Date.now()
      sendStatus('query', 'Running queries')
      if (usePool) {
        const pool = createPool({ connectionString: connection.url })
        const client = await pool.connect()
        try {
          await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`)
          await client.query('SET default_transaction_read_only = on')

          for (const query of queries) {
            const result = await executeQuery(client, query.sql, query.params)
            query.rowCount = result.rowCount
            query.durationMs = result.durationMs
            query.previewRows = result.rows.slice(0, MAX_PREVIEW_ROWS)
            if ('error' in result && result.error) {
              query.error = result.error
            }
          }
        } finally {
          client.release()
          await pool.end()
        }
        log('queries completed', { durationMs: Date.now() - runStartedAt, queryCount: queries.length })
        return
      }

      const client = createClient({ connectionString: connection.url })
      await client.connect()
      try {
        await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`)
        await client.query('SET default_transaction_read_only = on')

        for (const query of queries) {
          const result = await executeQuery(client, query.sql, query.params)
          query.rowCount = result.rowCount
          query.durationMs = result.durationMs
          query.previewRows = result.rows.slice(0, MAX_PREVIEW_ROWS)
          if ('error' in result && result.error) {
            query.error = result.error
          }
        }
      } finally {
        await client.end()
      }
      log('queries completed', { durationMs: Date.now() - runStartedAt, queryCount: queries.length })
    }

    await runQueries(executedQueries)

    log(
      'executed queries',
      executedQueries.map(query => ({ id: query.id, rowCount: query.rowCount, durationMs: query.durationMs })),
    )

    let allErrors = executedQueries.every(query => query.error)
    let nextSqlById: Record<string, string> | undefined
    if (allErrors) {
      sendStatus('repair', 'Repairing query plan')
      const repairStartedAt = Date.now()
      const repairPlan = await repairGymSql(
        llmMessages,
        timezone,
        {
          question,
          failedQueries: executedQueries.map(query => ({
            id: query.id,
            purpose: query.purpose,
            sql: query.sql,
            params: query.params,
            error: query.error,
          })),
        },
        {
          intentType: intentHints.intentType,
          primaryGrain: intentHints.primaryGrain,
          targets: intentHints.targets,
          planMeta: intentHints.planMeta,
          template: selectedTemplate,
          secondaryTemplate,
        },
        llmOptions,
      )
      log('repair plan completed', { durationMs: Date.now() - repairStartedAt })

      if (repairPlan?.queries?.length) {
        log('repair plan generated', repairPlan.queries.length)
        nextSqlById = Object.fromEntries(repairPlan.queries.map(query => [query.id, query.sql]))
        const repairedQueries = repairPlan.queries.map((query, index) => ({
          ...query,
          id: query.id || `q${index + 1}`,
        }))
        const nextExecuted: GymChatQuery[] = []
        for (const query of repairedQueries) {
          const normalizedParams = coerceIntervalParams(query.sql, query.params ?? [], intervalHints)
          try {
            const policy = validateAndRewriteSql(query.sql, normalizedParams)
            nextExecuted.push({
              id: query.id,
              purpose: query.purpose,
              sql: policy.sql,
              params: normalizedParams,
              rowCount: 0,
              durationMs: 0,
              previewRows: [],
              error: null,
              policy: {
                appliedLimit: policy.appliedLimit,
                appliedTimeWindow: policy.appliedTimeWindow,
              },
            })
          } catch (error) {
            nextExecuted.push({
              id: query.id,
              purpose: query.purpose,
              sql: query.sql,
              params: normalizedParams,
              rowCount: 0,
              durationMs: 0,
              previewRows: [],
              error: error instanceof Error ? error.message : 'SQL policy violation.',
            })
          }
        }

        const hasRepairPolicyErrors = nextExecuted.some(query => query.error)
        if (!hasRepairPolicyErrors) {
          await runQueries(nextExecuted)
          executedQueries = nextExecuted
          allErrors = executedQueries.every(query => query.error)
          log(
            'executed repaired queries',
            executedQueries.map(query => ({ id: query.id, rowCount: query.rowCount, durationMs: query.durationMs })),
          )
        }
      }
    }

    if (allErrors && isMuscleGroupQuestion && useBodyParts) {
      log('muscle group plan failed; retrying exercise fallback')
      const fallbackPlan = buildMuscleGroupComparisonPlan(false, setsBase)
      const fallbackQueries = (fallbackPlan.queries ?? []).map((query, index) => ({
        ...query,
        id: query.id || `q${index + 1}`,
      }))
      const fallbackIsCanonical = true
      if (fallbackQueries.length) {
        let fallbackExecuted: GymChatQuery[] = []
        for (const query of fallbackQueries) {
          const normalizedParams = coerceIntervalParams(query.sql, query.params ?? [], intervalHints)
          if (fallbackIsCanonical) {
            const safetyError = validateCanonicalSqlSafety(query.sql)
            const appliedLimit = inferCanonicalLimit(query.sql)
            fallbackExecuted.push({
              id: query.id,
              purpose: query.purpose,
              sql: query.sql,
              params: normalizedParams,
              rowCount: 0,
              durationMs: 0,
              previewRows: [],
              error: safetyError,
              policy: {
                appliedLimit,
                appliedTimeWindow: inferCanonicalTimeWindow(normalizedParams, query.sql),
              },
            })
            continue
          }
          try {
            const policy = validateAndRewriteSql(query.sql, normalizedParams)
            fallbackExecuted.push({
              id: query.id,
              purpose: query.purpose,
              sql: policy.sql,
              params: normalizedParams,
              rowCount: 0,
              durationMs: 0,
              previewRows: [],
              error: null,
              policy: {
                appliedLimit: policy.appliedLimit,
                appliedTimeWindow: policy.appliedTimeWindow,
              },
            })
          } catch (error) {
            fallbackExecuted.push({
              id: query.id,
              purpose: query.purpose,
              sql: query.sql,
              params: normalizedParams,
              rowCount: 0,
              durationMs: 0,
              previewRows: [],
              error: error instanceof Error ? error.message : 'SQL policy violation.',
            })
          }
        }

        let fallbackHasPolicyErrors = fallbackExecuted.some(query => query.error)
        let fallbackNextSqlById: Record<string, string> | undefined
        if (fallbackHasPolicyErrors && !fallbackIsCanonical) {
          sendStatus('repair', 'Repairing fallback query plan')
          const repairStartedAt = Date.now()
          const fallbackRepair = await repairGymSql(
            llmMessages,
            timezone,
            {
              question,
              failedQueries: fallbackExecuted.map(query => ({
                id: query.id,
                purpose: query.purpose,
                sql: query.sql,
                params: query.params,
                error: query.error,
              })),
            },
            {
              intentType: intentHints.intentType,
              primaryGrain: intentHints.primaryGrain,
              targets: intentHints.targets,
              planMeta: intentHints.planMeta,
              template: selectedTemplate,
              secondaryTemplate,
            },
            llmOptions,
          )
          log('fallback repair completed', { durationMs: Date.now() - repairStartedAt })
          if (fallbackRepair?.queries?.length) {
            fallbackNextSqlById = Object.fromEntries(fallbackRepair.queries.map(query => [query.id, query.sql]))
            const repairedFallback = fallbackRepair.queries.map((query, index) => ({
              ...query,
              id: query.id || `q${index + 1}`,
            }))
            const nextFallback: GymChatQuery[] = []
            for (const query of repairedFallback) {
              const normalizedParams = coerceIntervalParams(query.sql, query.params ?? [], intervalHints)
              try {
                const policy = validateAndRewriteSql(query.sql, normalizedParams)
                nextFallback.push({
                  id: query.id,
                  purpose: query.purpose,
                  sql: policy.sql,
                  params: normalizedParams,
                  rowCount: 0,
                  durationMs: 0,
                  previewRows: [],
                  error: null,
                  policy: {
                    appliedLimit: policy.appliedLimit,
                    appliedTimeWindow: policy.appliedTimeWindow,
                  },
                })
              } catch (error) {
                nextFallback.push({
                  id: query.id,
                  purpose: query.purpose,
                  sql: query.sql,
                  params: normalizedParams,
                  rowCount: 0,
                  durationMs: 0,
                  previewRows: [],
                  error: error instanceof Error ? error.message : 'SQL policy violation.',
                })
              }
            }
            fallbackExecuted = nextFallback
            fallbackHasPolicyErrors = fallbackExecuted.some(query => query.error)
          }
        }

        if (!fallbackHasPolicyErrors) {
          await runQueries(fallbackExecuted)
        }
        executedQueries = fallbackExecuted
        allErrors = executedQueries.every(query => query.error)
        if (fallbackNextSqlById) {
          nextSqlById = fallbackNextSqlById
        }
        log(
          'executed fallback queries',
          executedQueries.map(query => ({ id: query.id, rowCount: query.rowCount, durationMs: query.durationMs })),
        )
      }
    }
    let progressionWindowOverride: string | null = null
    if (!allErrors && !isWorkoutPlan) {
      const progressionAnalysisKind =
        analysisKindOverride ?? canonicalAnalysisKind ?? resolveReturnEffortAnalysisKind(question) ?? 'other'
      if (
        progressionAnalysisKind === 'exercise_progression' ||
        progressionAnalysisKind === 'return_for_effort_progression'
      ) {
        const primary = selectContextQuery(executedQueries)
        const hasRows = Boolean(primary && (primary.rowCount > 0 || primary.previewRows.length > 0))
        if (!hasRows) {
          const fallbackWindows = buildProgressionFallbackWindows(explicitWindow, progressionAnalysisKind)
          for (const window of fallbackWindows) {
            const fallbackPlan =
              progressionAnalysisKind === 'exercise_progression'
                ? buildExerciseProgressionPlan(setsBase, {
                    window: window === 'all_time' ? undefined : window,
                    exercise: exerciseTarget,
                    bucket: progressionBucket,
                    allTime: window === 'all_time',
                  })
                : buildReturnEffortProgressionPlanWithWindow(setsBase, window)
            const { prepared, hasPolicyErrors } = buildExecutableQueries(fallbackPlan.queries, intervalHints)
            if (hasPolicyErrors) continue
            await runQueries(prepared)
            executedQueries = prepared
            allErrors = executedQueries.every(query => query.error)
            const hasFallbackRows = prepared.some(
              query => !query.error && (query.rowCount > 0 || query.previewRows.length > 0),
            )
            progressionWindowOverride = window
            log('progression fallback window', { window, hasFallbackRows })
            if (hasFallbackRows) break
          }
        }
      }
    }
    if (allErrors) {
      const errorAnalysisKind =
        analysisKindOverride ?? canonicalAnalysisKind ?? resolveReturnEffortAnalysisKind(question) ?? 'other'
      conversationState = applyPlanMeta(conversationState, planMeta)
      conversationState = applyErrorState(conversationState, {
        type: executedQueries.some(query => query.error && isUnsafePolicyError(query.error)) ? 'policy' : 'sql',
        analysisKind: errorAnalysisKind,
        canonicalPlanId: canonicalAnalysisKind,
      })
      const errorResult = buildSqlErrorAssistantMessage(question, executedQueries, {
        nextSqlById,
        debug: wantsDebugSql,
        timeWindow: explicitWindow ?? contextWindow ?? 'all_time',
      })
      const response: GymChatResponse = {
        assistantMessage: errorResult.message,
        citations: [],
        queries: executedQueries,
        followUps: errorResult.followUps,
      }
      return respond(response, undefined, { ...evalMeta, queryCount: executedQueries.length })
    }

    if (isWorkoutPlan) {
      const planQuery = executedQueries.find(query => query.id === 'q1')
      const deloadQuery = executedQueries.find(query => query.id === 'q2')
      const planTimeframe =
        typeof planQuery?.params?.[0] === 'string'
          ? String(planQuery.params[0])
          : planQuery?.policy?.appliedTimeWindow ?? undefined
      const planResponseContext = buildPlanResponseContext(planQuery, planTimeframe)
      const deloadRecommendation = buildDeloadRecommendation(deloadQuery)
      const hasPlanRows =
        planQuery && !planQuery.error && (planQuery.rowCount > 0 || planQuery.previewRows.length > 0)
      if (!hasPlanRows) {
        const acknowledgement = wantsCorrectionAcknowledgement
          ? buildPlanCorrectionAcknowledgement(planMeta?.targetsMuscles)
          : undefined
        let assistantMessage = buildWorkoutPlanFallbackMessage({
          constraint: planMeta?.targetsMuscles,
          usesHistoricalLifts: planMeta?.usesHistoricalLifts,
          acknowledgement,
          goal: planMeta?.goal,
        })
        if (deloadRecommendation) {
          assistantMessage = `${assistantMessage}\n\n**Deload suggestion**\n- ${deloadRecommendation}`
        }
        conversationState = applyPlanMeta(conversationState, planMeta)
        const response: GymChatResponse = {
          assistantMessage,
          citations: [],
          queries: executedQueries,
        }
        return respond(response, undefined, { ...evalMeta, queryCount: executedQueries.length })
      }

      const acknowledgement = wantsCorrectionAcknowledgement
        ? buildPlanCorrectionAcknowledgement(planMeta?.targetsMuscles)
        : undefined
      const historicalPlan = buildWorkoutPlanFromHistory({
        query: planQuery,
        constraint: planMeta?.targetsMuscles,
        usesHistoricalLifts: planMeta?.usesHistoricalLifts,
        acknowledgement,
        maxExercises: 5,
        goal: planMeta?.goal,
      })
      if (historicalPlan) {
        let assistantMessage = historicalPlan
        if (deloadRecommendation) {
          assistantMessage = `${assistantMessage}\n\n**Deload suggestion**\n- ${deloadRecommendation}`
        }
        let citations: GymChatCitation[] = []
        const fallback = buildFallbackCitations(assistantMessage, executedQueries)
        if (fallback) {
          assistantMessage = fallback.assistantMessage
          citations = fallback.citations
        }
        const targetList = planMeta?.targetsMuscles?.include?.length
          ? planMeta.targetsMuscles.include.join(', ')
          : null
        const followUps = sanitizeFollowUps(
          targetList
            ? [
                `Show my recent ${targetList} history.`,
                `Adjust this ${targetList} plan for strength focus.`,
              ]
            : ['Show my most recent sessions.', 'Plan another focused session.'],
        )
        const planAnalysisKind = analysisKindOverride ?? canonicalAnalysisKind ?? 'other'
        conversationState = applyAnalysisState(conversationState, {
          kind: planAnalysisKind,
          canonicalPlanId: canonicalAnalysisKind,
          timeframe: planTimeframe ?? undefined,
          targets: intentHints.targets,
        })
        conversationState = applyPlanMeta(conversationState, planMeta)
        conversationState = applyResponseContext(conversationState, planResponseContext, {
          analysisKind: planAnalysisKind,
          question,
          turnId,
          timestamp: turnTimestamp,
          turnMode,
          topicShifted,
        })
        const response: GymChatResponse = {
          assistantMessage,
          citations,
          queries: executedQueries,
          followUps,
        }
        return respond(response, undefined, { ...evalMeta, queryCount: executedQueries.length })
      }
    }

    const responseMeta = buildResponseMeta(question, executedQueries)
    const queryResultMetadata = buildQueryResultMetadata(executedQueries)
    const analysisKind =
      analysisKindOverride ??
      canonicalAnalysisKind ??
      resolveReturnEffortAnalysisKind(question) ??
      inferAnalysisKindFromResponseMeta(responseMeta) ??
      'other'
    const analysisTimeframe =
      analysisKind === 'top_end_efforts_compare_12m_3m'
        ? '12 months vs 3 months'
        : analysisKind === 'period_compare'
          ? `${compareWindow} vs prior ${comparePriorWindow}`
        : responseMeta.timeWindowLabel ?? undefined
    const canonicalPlanId = canonicalAnalysisKind ?? undefined
    const periodCompareCoverage =
      analysisKind === 'period_compare'
        ? {
            windowRecent: compareWindow,
            windowPrior: comparePriorWindow,
            defaultsUsed: compareDefaultsUsed,
            priorInferred: comparePriorInferred,
          }
        : undefined
    const comparisonNotes =
      analysisKind === 'top_end_efforts_compare_12m_3m' ? buildTopEndComparisonNotes(executedQueries) : []
    const responseContext = buildLastResponseContext({
      question,
      analysisKind,
      queries: executedQueries,
      responseMeta,
      exerciseTarget,
      timeWindow: sessionDateFilter
        ? `session ${sessionDateFilter}`
        : analysisKind === 'period_compare'
          ? compareWindow
          : explicitWindow ?? responseMeta.timeWindowLabel ?? undefined,
    })

    if (isSparseProgressionResult(analysisKind, executedQueries)) {
      const targetLabel = exerciseTarget ? `for ${exerciseTarget}` : 'across your exercises'
      const stats = getProgressionStats(analysisKind, executedQueries)
      const count = stats?.periods ?? stats?.rows ?? 0
      const countLine = count
        ? `You have ${count} data point${count === 1 ? '' : 's'} in this window; I need at least 3.`
        : 'I could not find any logged data points in this window.'
      const expansionLine = progressionWindowOverride
        ? `I expanded the window to ${progressionWindowOverride} and still found too little data.`
        : null
      let availabilityLine: string | null = null
      if (exerciseTarget) {
        const availabilityWindow = progressionWindowOverride ?? explicitWindow ?? '12 months'
        const availabilityPlan = buildExerciseSummaryPlan(setsBase, {
          limit: 5,
          window: availabilityWindow === 'all_time' ? '12 months' : availabilityWindow,
          allTime: availabilityWindow === 'all_time',
        })
        const { prepared, hasPolicyErrors } = buildExecutableQueries(availabilityPlan.queries, intervalHints)
        if (!hasPolicyErrors) {
          await runQueries(prepared)
          const availabilityQuery = prepared.find(query => !query.error)
          const availableExercises = Array.from(
            new Set(
              (availabilityQuery?.previewRows ?? [])
                .map(row => extractRowExercise(row as Record<string, unknown>))
                .filter((exercise): exercise is string => Boolean(exercise)),
            ),
          ).slice(0, 5)
          if (availableExercises.length) {
            const availabilityLabel =
              availabilityWindow === 'all_time' ? 'all time' : `the last ${availabilityWindow}`
            availabilityLine = `Exercises with recent data in ${availabilityLabel}: ${availableExercises.join(', ')}.`
          }
          executedQueries = [...executedQueries, ...prepared]
        }
      }
      const suggestions = exerciseTarget
        ? suggestExerciseNames(exerciseTarget, 3).filter(name => name.toLowerCase() !== exerciseTarget.toLowerCase())
        : []
      const suggestionLine = suggestions.length
        ? `Similar lifts with data may include: ${suggestions.join(', ')}.`
        : null
      let assistantMessage =
        `I do not have enough logged sessions to show a progression trend ${targetLabel}. ` +
        'Try a longer time window (for example, last 12 months) or ask for best sets or PRs instead.\n\n' +
        [countLine, expansionLine, availabilityLine, suggestionLine].filter(Boolean).join('\n')
      assistantMessage = applyCorrectionAcknowledgement(assistantMessage, correctionAcknowledgement)
      const followUps = sanitizeFollowUps([
        exerciseTarget ? `Show best sets or PRs for ${exerciseTarget}.` : 'Show my best sets or PRs.',
        exerciseTarget ? `Show my most recent ${exerciseTarget} session.` : 'Show my most recent sessions.',
        'Expand the window to the last 12 months.',
      ])
      conversationState = applyAnalysisState(conversationState, {
        kind: analysisKind,
        canonicalPlanId,
        timeframe: analysisTimeframe,
        targets: intentHints.targets,
      })
      conversationState = applyPlanMeta(conversationState, planMeta)
      conversationState = applyResponseContext(conversationState, responseContext, {
        analysisKind,
        question,
        turnId,
        timestamp: turnTimestamp,
        turnMode,
        topicShifted,
      })
      const response: GymChatResponse = {
        assistantMessage,
        citations: [],
        queries: executedQueries,
        followUps,
      }
      return respond(response, undefined, { ...evalMeta, queryCount: executedQueries.length })
    }

    const explainChecklist = (() => {
      const checklist: string[] = []
      if (selectedTemplate && TEMPLATES[selectedTemplate]) {
        checklist.push(...TEMPLATES[selectedTemplate].explainChecklist)
      }
      if (secondaryTemplate && TEMPLATES[secondaryTemplate]) {
        TEMPLATES[secondaryTemplate].explainChecklist.forEach(item => {
          if (!checklist.includes(item)) {
            checklist.push(item)
          }
        })
      }
      if (analysisKind === 'top_end_efforts_compare_12m_3m') {
        checklist.push(
          'Explicitly compare top-end efforts over the last 12 months vs the last 3 months using the provided windowed queries.',
        )
      }
      if (analysisKind === 'period_compare') {
        checklist.push(
          'Explicitly compare recent vs prior windows for sessions, sets, and volume, including deltas.',
        )
        checklist.push('Summarize adherence metrics (longest streak, longest gap, missed weeks/months) with citations.')
        checklist.push(
          `State the time windows used (${compareWindow} vs prior ${comparePriorWindow}) and note if any defaults were applied.`,
        )
      }
      if (analysisKind === 'set_breakdown') {
        checklist.push('Explicitly describe the set order proxy (set_number buckets or thirds).')
        checklist.push('Quantify early vs late set drop-off with citations.')
        checklist.push('Call out the best and worst sets in the window with citations.')
      }
      if (analysisKind === 'favorite_split_day') {
        checklist.push(
          'Define "favorite split day" as the most frequent day_tag by session count in the requested window.',
        )
      }
      if (analysisKind === 'weekly_volume') {
        checklist.push('Summarize weekly training volume over the requested window with citations.')
      }
      if (progressionWindowOverride) {
        checklist.push(`No data in the requested window; expanded to ${progressionWindowOverride}.`)
      }
      if (intentHints.intentType === 'planning' && planMeta?.targetsMuscles?.include?.length) {
        const targetList = planMeta.targetsMuscles.include.join(', ')
        checklist.push(`Ensure the proposed session only includes ${targetList} exercises.`)
      }
      if (wantsCorrectionAcknowledgement) {
        checklist.push('Acknowledge the correction and restate the muscle-only constraint before the plan.')
      }
      if (correctionDetected) {
        checklist.push('Acknowledge the correction and restate the corrected focus before the analysis.')
      }
      if (targetExercises && targetExercises.length > 1) {
        checklist.push(
          `This analysis covers ${targetExercises.length} exercises: ${targetExercises.join(', ')}. ` +
            `Present each exercise in a separate section with a clear heading.`,
        )
      }
      if (
        CROSS_TAB_REGEX.test(question) ||
        canonicalAnalysisKind === 'body_part_day_split' ||
        canonicalAnalysisKind === 'weekday_breakdown'
      ) {
        checklist.push(
          'This is a cross-tabulation request. Provide a narrative summary of the patterns ' +
            '(e.g., "chest volume peaks on Push Day at 12,500 lb-reps"). ' +
            'Note that the full cross-tab table is available in the query details.',
        )
      }
      return checklist
    })()

    const formattingConstraints = detectFormattingConstraints(question)

    try {
      sendStatus('explain', 'Generating response')
      const explainStartedAt = Date.now()
      let explanation = await explainGymResults(
        {
        question,
        queries: executedQueries,
        intentType: intentHints.intentType,
        selectedTemplate,
        secondaryTemplate,
        explainChecklist,
        responseMeta,
        queryResultMetadata,
        planMeta: intentHints.planMeta,
        validationNotes: comparisonNotes.length ? comparisonNotes : undefined,
        formattingConstraints: formattingConstraints.length ? formattingConstraints : undefined,
        },
        llmOptions,
      )
      let validationIssues = validateRankingResponse(question, explanation.assistantMessage, responseMeta)

      // Validate formatting constraints
      let formattingIssues: string[] = []
      if (formattingConstraints.length) {
        formattingIssues = validateFormattingConstraints(
          explanation.assistantMessage,
          formattingConstraints,
          targetExercises,
        )
      }

      // Retry if there are validation or formatting issues
      if (validationIssues.length || formattingIssues.length) {
        const allValidationNotes = [
          ...comparisonNotes,
          ...validationIssues.map(issue => issue.message),
          ...formattingIssues,
        ]

        explanation = await explainGymResults(
          {
            question,
            queries: executedQueries,
            intentType: intentHints.intentType,
            selectedTemplate,
            secondaryTemplate,
            explainChecklist,
            responseMeta,
            queryResultMetadata,
            planMeta: intentHints.planMeta,
            validationNotes: allValidationNotes,
            formattingConstraints: formattingConstraints.length ? formattingConstraints : undefined,
            forceCitations: true,
          },
          llmOptions,
        )
        validationIssues = validateRankingResponse(question, explanation.assistantMessage, responseMeta)
        const missingCoverage = validationIssues.some(issue => issue.type === 'coverage_missing')
        if (missingCoverage && responseMeta.isRankingQuestion) {
          explanation.assistantMessage = `${explanation.assistantMessage}\n\n${formatCoverageLine(responseMeta, {
            debug: wantsDebugSql,
          })}`
        }
        const metricMismatch = validationIssues.some(issue => issue.type === 'metric_mismatch')
        if (metricMismatch) {
          const metricName = responseMeta.metricName ?? 'the requested metric'
          explanation.assistantMessage = `${explanation.assistantMessage}\n\nNote: Results are based on ${metricName}.`
        }
      }
      const allowedIds = new Set(executedQueries.map(query => query.id))
      let citations = explanation.citations.filter(citation => allowedIds.has(citation.queryId))
      explanation.assistantMessage = formatStructuredAssistantMessage(explanation.assistantMessage, citations)
      let markerSet = extractMarkers(explanation.assistantMessage)

      let citationMarkersOk = citations.length && citations.every(citation => markerSet.has(citation.marker))
      let fallbackCitationsApplied = false
      const applyFallbackCitationsIfPossible = () => {
        const fallback = buildFallbackCitations(explanation.assistantMessage, executedQueries)
        if (!fallback) return false
        citations = fallback.citations.filter(citation => allowedIds.has(citation.queryId))
        if (!citations.length) return false
        fallbackCitationsApplied = true
        explanation.assistantMessage = formatStructuredAssistantMessage(fallback.assistantMessage, citations)
        markerSet = extractMarkers(explanation.assistantMessage)
        citationMarkersOk = citations.length && citations.every(citation => markerSet.has(citation.marker))
        return citationMarkersOk
      }
      const hasPreviewRows = executedQueries.some(query => !query.error && query.previewRows.length > 0)
      const canEnforceCitations = hasPreviewRows
      const needsCitations = () =>
        canEnforceCitations &&
        ((hasDigits(explanation.assistantMessage) && !citations.length) || !citationMarkersOk)
      if (needsCitations()) {
        const fallbackResolved = applyFallbackCitationsIfPossible()
        if (!fallbackResolved && needsCitations()) {
          explanation = await explainGymResults(
            {
              question,
              queries: executedQueries,
              intentType: intentHints.intentType,
              selectedTemplate,
              secondaryTemplate,
              explainChecklist,
              responseMeta,
              queryResultMetadata,
              planMeta: intentHints.planMeta,
              formattingConstraints: formattingConstraints.length ? formattingConstraints : undefined,
              forceCitations: true,
            },
            llmOptions,
          )
          citations = explanation.citations.filter(citation => allowedIds.has(citation.queryId))
          explanation.assistantMessage = formatStructuredAssistantMessage(explanation.assistantMessage, citations)
          markerSet = extractMarkers(explanation.assistantMessage)
          citationMarkersOk = citations.length && citations.every(citation => markerSet.has(citation.marker))
          if (needsCitations()) {
            applyFallbackCitationsIfPossible()
          }
        }
      }

      if (responseMeta.isRankingQuestion) {
        const coverageMissing = validateRankingResponse(question, explanation.assistantMessage, responseMeta).some(
          issue => issue.type === 'coverage_missing',
        )
        if (coverageMissing) {
          explanation.assistantMessage = `${explanation.assistantMessage}\n\n${formatCoverageLine(responseMeta, {
            debug: wantsDebugSql,
          })}`
          if (needsCitations()) {
            applyFallbackCitationsIfPossible()
          }
        }
      }
      if (periodCompareCoverage) {
        const hasCompareCoverage = /coverage/i.test(explanation.assistantMessage)
        if (!hasCompareCoverage) {
          explanation.assistantMessage = `${explanation.assistantMessage}\n\n${formatPeriodCompareCoverageLine(
            periodCompareCoverage,
            { debug: wantsDebugSql },
          )}`
        }
      }
      if (canEnforceCitations && needsCitations()) {
        conversationState = applyAnalysisState(conversationState, {
          kind: analysisKind,
          canonicalPlanId,
          timeframe: analysisTimeframe,
          targets: intentHints.targets,
        })
        conversationState = applyPlanMeta(conversationState, planMeta)
        conversationState = applyErrorState(conversationState, { type: 'explanation', analysisKind, canonicalPlanId })
        const response: GymChatResponse = {
          assistantMessage: 'I could not verify the results with citations. Please rephrase your question.',
          citations: [],
          queries: executedQueries,
          refusal: {
            message: 'Missing citations.',
          },
        }
        log('fallback citations applied', fallbackCitationsApplied)
        return respond(response, undefined, {
          ...evalMeta,
          queryCount: executedQueries.length,
          fallbackCitationsApplied,
        })
      }

      const initialChartSpecs = explanation.chartSpecs?.filter(spec => allowedIds.has(spec.queryId))
      const fallbackChartSpecs =
        analysisKind === 'set_breakdown' && (!initialChartSpecs || initialChartSpecs.length === 0)
          ? buildSetBreakdownChartSpecs({ queries: executedQueries, preferEstimated1rm: useEstimated1rm })
          : undefined
      const chartSpecs = initialChartSpecs && initialChartSpecs.length ? initialChartSpecs : fallbackChartSpecs
      const followUps = sanitizeFollowUps(buildAnalysisFollowUps(analysisKind) ?? explanation.followUps)
      const assistantMessage = applyCorrectionAcknowledgement(explanation.assistantMessage, correctionAcknowledgement)
      conversationState = applyAnalysisState(conversationState, {
        kind: analysisKind,
        canonicalPlanId,
        timeframe: analysisTimeframe,
        targets: intentHints.targets,
      })
      conversationState = applyPlanMeta(conversationState, planMeta)
      conversationState = applyResponseContext(conversationState, responseContext, {
        analysisKind,
        question,
        turnId,
        timestamp: turnTimestamp,
        turnMode,
        topicShifted,
      })
      log('explain completed', { durationMs: Date.now() - explainStartedAt })
      const response: GymChatResponse = {
        assistantMessage,
        citations,
        queries: executedQueries,
        chartSpecs,
        followUps,
      }
      log('fallback citations applied', fallbackCitationsApplied)
      return respond(response, undefined, {
        ...evalMeta,
        queryCount: executedQueries.length,
        fallbackCitationsApplied,
      })
    } catch (error) {
      if (isLlmRequestError(error)) {
        log('explanation failed', { status: error.status, retryable: error.retryable, detail: error.detail })
        const hasAnyDataOrError = executedQueries.some(
          query => query.rowCount > 0 || query.previewRows.length > 0 || query.error,
        )
        const isRecoveryQuestion = /recover/i.test(question)
        const assistantMessage = hasAnyDataOrError
          ? buildFallbackExplanation({
              question,
              queries: executedQueries,
              analysisKind,
              responseMeta,
              queryResultMetadata,
              periodCompareCoverage,
            })
          : isRecoveryQuestion
            ? 'I tried to run queries to analyze your recovery between sessions, but they returned no usable data. This often means the time window is small or the filters are too strict. Try starting with a simpler window, like "last 8 weeks of sessions."'
            : 'I tried to run queries to analyze this, but they returned no usable data. This often means the time window is small or the filters are too strict. Try starting with a simpler window, like "last 8 weeks of sessions."'
        const correctedMessage = applyCorrectionAcknowledgement(assistantMessage, correctionAcknowledgement)
        const followUps = sanitizeFollowUps(
          buildAnalysisFollowUps(analysisKind) ??
            (hasAnyDataOrError
              ? ['Retry the analysis with the same question.', 'Analyze a different lift.']
              : ['Show my sessions from the last 8 weeks.', 'Show my most recent sessions.']),
        )
        conversationState = applyAnalysisState(conversationState, {
          kind: analysisKind,
          canonicalPlanId,
          timeframe: analysisTimeframe,
          targets: intentHints.targets,
        })
        conversationState = applyPlanMeta(conversationState, planMeta)
        conversationState = applyResponseContext(conversationState, responseContext, {
          analysisKind,
          question,
          turnId,
          timestamp: turnTimestamp,
          turnMode,
          topicShifted,
        })
        conversationState = applyErrorState(conversationState, { type: 'explanation', analysisKind, canonicalPlanId })
        const response: GymChatResponse = {
          assistantMessage: correctedMessage,
          citations: [],
          chartSpecs: [],
          followUps,
          explanationError: {
            message: error.message,
          },
          queries: executedQueries,
        }
        return respond(response, undefined, { ...evalMeta, queryCount: executedQueries.length })
      }
      throw error
    }
  } catch (error) {
    if (isLlmRequestError(error)) {
      const isMissingKey = error.message.startsWith('Missing OpenAI API key')
      log('llm error', { status: error.status, retryable: error.retryable, detail: error.detail })
      const response: GymChatResponse = {
        assistantMessage: isMissingKey
          ? 'Missing OpenAI API key. Please set OPENAI_API_KEY to continue.'
          : "I couldn't reach the model I use to plan or summarize your gym-data analysis. " +
            "I can't safely answer this from your logs right now. You can try again soon, or ask a general training question that doesn't require your history.",
        citations: [],
        queries: [],
      }
      return respond(response, { status: isMissingKey ? 500 : 503 })
    }
    log('unhandled error', error)
    return respond({ error: 'Internal server error.' }, { status: 500 })
  } finally {
    log('completed in', `${Date.now() - startedAt}ms`)
  }
  }

  if (wantsStream) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller
        pendingEvents.splice(0).forEach(event => controller.enqueue(encoder.encode(event)))
        if (shouldCloseStream) {
          controller.close()
          streamController = null
        }
      },
      cancel() {
        streamController = null
      },
    })
    sendStatus('started', 'Starting request')
    const headers = {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-request-id': requestId,
    }
    void run().catch(error => {
      log('stream error', error)
      sendError('Internal server error.', 'internal')
    })
    return new Response(stream, { headers })
  }

  return await run()
}

export const __testUtils = {
  extractIntervalHints,
  coerceIntervalParams,
  parseTimeframeAnswer,
  buildTimeframedQuestion,
  hasExplicitTimeWindow,
  shouldPreferGymDataForLogQuestion,
}
