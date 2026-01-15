import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'
import { createClient, createPool } from '@vercel/postgres'

import { getCatalogTables, loadGymCatalog } from '@/lib/gym-chat/catalog'
import {
  buildFavoriteSplitDayPlan,
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
} from '@/lib/gym-chat/canonical-plans'
import { buildSetsBaseCte } from '@/lib/gym-chat/sql-builders'
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
  extractRequestedTopN,
  formatCoverageLine,
  formatPeriodCompareCoverageLine,
  validateRankingResponse,
} from '@/lib/gym-chat/response-utils'
import { buildLlmContext, classifyTurnMode, RETURN_EFFORT_CHOICE_REGEX } from '@/lib/gym-chat/conversation'
import { buildSqlErrorAssistantMessage } from '@/lib/gym-chat/sql-errors'
import { TEMPLATES, selectTemplates } from '@/lib/gym-chat/templates'
import {
  buildWorkoutPlanQueries,
  mergeWorkoutPlanMeta,
  normalizeMuscleName,
  parseWorkoutPlanMeta,
} from '@/lib/gym-chat/workout-planner'
import type { GymChatTemplateName } from '@/lib/gym-chat/templates'
import type {
  AnalysisKind,
  GymChatCitation,
  GymChatConversationState,
  GymChatMessage,
  GymChatQuery,
  GymChatResponse,
  GymChatTimeWindow,
  PendingClarification,
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

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_DURATION_MS = maxDuration * 1000
const MIN_LLM_RETRY_WINDOW_MS = 16000

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
  'of',
  'on',
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
  'since',
  'summary',
  'summaries',
  'the',
  'this',
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
  if (!targetsMuscles && !usesHistoricalLifts) return undefined
  return {
    targetsMuscles,
    usesHistoricalLifts,
  }
}

const normalizeConversationState = (value: unknown): GymChatConversationState => {
  if (!value || typeof value !== 'object') return {}
  const state = value as GymChatConversationState
  const lastAnalysisKind = normalizeAnalysisKind(state.lastAnalysis?.kind)
  const lastErrorKind = normalizeAnalysisKind(state.lastError?.analysisKind)
  const lastPlanMeta = normalizeWorkoutPlanMeta(state.lastPlanMeta)
  const lastAnalysisTargets = normalizeAnalysisTargets(state.lastAnalysis?.targets)
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
  const isVolume = match[1].toLowerCase() === 'a'
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

const RELATIVE_WINDOW_REGEX = /(\d+)[-\s]+(day|week|month|year)s?\b/gi
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
  const match = normalized.match(/(\d+)\s*(day|week|month|year)s?\b/)
  if (!match?.[1] || !match[2]) return null
  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null
  const unit = match[2] as 'day' | 'week' | 'month' | 'year'
  return `${value} ${pluralizeUnit(unit, value)}`
}

const windowToDays = (window: string | null | undefined) => {
  if (!window || window === 'all_time') return null
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

const extractComparisonWindows = (text: string) => {
  if (!text) return []
  const normalized = text.toLowerCase()
  const windows: string[] = []
  const regex = /(\d+)\s*(day|week|month|year)s?\b/g
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
  /\b(\d+\s*(day|week|month|year)s?|today|yesterday|this\s+(week|month|year)|last\s+(week|month|year|session|sessions|workout|workouts)|past\s+(week|month|year|session|sessions|workout|workouts)|most recent|latest|since\b|recent|lately|year to date|ytd|all[-\s]?time|lifetime)\b/i
const TIMEFRAME_PHRASE_REGEX =
  /\b(today|yesterday|this week|this month|this year|last week|last month|last year|past week|past month|past year|most recent session|most recent sessions|latest session|latest sessions|last session|last sessions|last workout|last workouts|all[-\s]?time|lifetime|year to date|ytd)\b/i
const TIMEFRAME_EXPLICIT_REGEX = /\b(\d+)\s*(day|week|month|year)s?\b/i
const TIMEFRAME_AMBIGUOUS_REGEX = /\b(recent|lately|last|past|previous|current)\b/i
const LOG_CONTEXT_CUE_REGEX = /\b(my|mine|me|our|last|recent|latest|previous|past)\b/i

const hasExplicitTimeWindow = (text: string) => {
  if (!text) return false
  const normalized = normalizeWhitespace(text).toLowerCase()
  if (TIMEFRAME_EXPLICIT_REGEX.test(normalized)) return true
  if (TIMEFRAME_PHRASE_REGEX.test(normalized)) return true
  if (/\bsince\s+\S+/.test(normalized)) return true
  return false
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
const FAVORITE_SPLIT_REGEX =
  /fav(?:orite)?\s+(?:split|split day|day tag)|which\s+split.*(?:most|often)|split\s+.*(?:most|often)/i
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
const RETURN_EFFORT_VOLUME_QUESTION = 'Show total volume per exercise over the last 90 days.'
const RETURN_EFFORT_PROGRESSION_QUESTION = 'Show my progression over time for each exercise.'
const PLAN_CORRECTION_REGEX =
  /\b(you gave me|you suggested|you included|that's wrong|that is wrong|i asked for|ensure your suggestions|only)\b/i

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

const ANALYSIS_TEMPLATE_HINTS: Partial<Record<AnalysisKind, GymChatTemplateName>> = {
  stalled_lifts: 'plateau_vs_progress',
  muscle_group_balance: 'body_part_balance',
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

const isFavoriteSplitQuestion = (text: string) => FAVORITE_SPLIT_REGEX.test(text || '')

const isWeeklyVolumeQuestion = (text: string) => WEEKLY_VOLUME_REGEX.test(text || '')

const isSetCountQuestion = (text: string) => SET_COUNT_REGEX.test(text || '')

const isVolumeRankingQuestion = (text: string) => VOLUME_RANKING_REGEX.test(text || '')

const isSessionCountQuestion = (text: string) =>
  SESSION_COUNT_REGEX.test(text || '') && !SESSION_TREND_REGEX.test(text || '')

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

const RELATIVE_WINDOW_DETECT_REGEX = /(\d+)[-\s]+(day|week|month|year)s?\b/i

const UNSAFE_POLICY_ERROR_PATTERNS = [
  /unsafe keyword detected/i,
  /only select/i,
  /union, values, and recursive/i,
  /system schema is not allowed/i,
]

const isUnsafePolicyError = (error: string) => UNSAFE_POLICY_ERROR_PATTERNS.some(pattern => pattern.test(error))

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
  const respond = (
    body: GymChatResponse | { error: string },
    init?: { status?: number },
    meta?: GymChatEvalMeta,
  ) => {
    const payload =
      'assistantMessage' in body
        ? { ...body, conversationState }
        : body
    if (wantsStream) {
      const status = init?.status
      if ('assistantMessage' in body) {
        if (status && status >= 400) {
          sendError(body.assistantMessage, resolveErrorType(status))
        } else {
          sendFinal(payload)
        }
      } else {
        sendError(body.error, resolveErrorType(status))
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

    const timezone = payload.client?.timezone ?? 'UTC'

    let turnMode = classifyTurnMode({ message: question, state: conversationState })
    let analysisKindOverride: AnalysisKind | undefined

    if (conversationState.pendingClarification && turnMode !== 'clarification_answer') {
      conversationState = { ...conversationState, pendingClarification: null }
    }
    if (turnMode === 'new_question' && conversationState.lastError) {
      conversationState = { ...conversationState, lastError: undefined }
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
      }
    }
    if (isTopEndEffortsComparisonQuestion(question)) {
      analysisKindOverride = 'top_end_efforts_compare_12m_3m'
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
    if (turnMode === 'analysis_followup' && !analysisKindOverride && conversationState.lastAnalysis?.kind) {
      analysisKindOverride = conversationState.lastAnalysis.kind
    }

    const llmMessages = buildLlmContext({ question, state: conversationState, mode: turnMode })
    let classification: Awaited<ReturnType<typeof classifyQuestion>>
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
    classification.primaryGrain = normalizePrimaryGrainValue(classification.primaryGrain)
    const intervalHints = extractIntervalHints(question)
    const combinedUserText = question
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
          "When you say 'return for effort', do you mean (a) total volume per exercise, (b) progression over time, or (c) something else? " +
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

    sendStatus('plan', 'Planning SQL')
    const planStartedAt = Date.now()
    const plan = await planGymSql(
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
    const wantsAllTimeWindow = containsKeyword(question, ALL_TIME_KEYWORDS)
    const explicitWindow = wantsAllTimeWindow ? null : extractExplicitWindow(question)
    const comparisonWindows = extractComparisonWindows(question)
    const defaultCompareWindow = '4 weeks'
    const compareWindow = comparisonWindows[0] ?? defaultCompareWindow
    const comparePriorWindow = comparisonWindows[1] ?? compareWindow
    const compareDefaultsUsed = comparisonWindows.length === 0
    const comparePriorInferred = comparisonWindows.length === 1
    const requestedTopN = extractRequestedTopN(question)
    const topWeightLimit = requestedTopN ?? 5
    const rankingLimit = requestedTopN ?? 10
    const topWeightWindow = explicitWindow ?? '90 days'
    const worstDayWindow = explicitWindow ?? '30 days'
    const favoriteSplitWindow = explicitWindow ?? '12 months'
    const weeklyVolumeWindow = explicitWindow ?? '12 months'
    const planningWindow = explicitWindow ?? '12 months'
    const sessionCountWindow = explicitWindow ?? '12 weeks'
    const exerciseTarget = extractExerciseTarget(question)
    const useEstimated1rm = wantsEstimated1rm(question)
    const progressionBucket = MONTHLY_TREND_REGEX.test(question) ? 'month' : 'week'
    const summaryWindow = explicitWindow ?? '90 days'
    const progressionWindow = explicitWindow ?? '12 months'
    const setBreakdownWindow = explicitWindow ?? '90 days'
    const setBreakdownWindowDays = windowToDays(setBreakdownWindow)
    const setBreakdownAnchorAllTime =
      wantsAllTimeWindow || (setBreakdownWindowDays !== null && setBreakdownWindowDays >= 365)
    const setBreakdownAnchorWindow = '12 months'
    const setBreakdownAllTime = exerciseTarget ? setBreakdownAnchorAllTime : wantsAllTimeWindow
    const normalizedQuestion = normalizeWhitespace(question).toLowerCase()
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
          window: explicitWindow ?? '90 days',
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
        })
      }
      if (analysisKindOverride === 'exercise_summary') {
        canonicalAnalysisKind = 'exercise_summary'
        return buildExerciseSummaryPlan(setsBase, {
          limit: rankingLimit,
          window: summaryWindow,
          exercise: exerciseTarget,
          allTime: wantsAllTimeWindow,
        })
      }
      if (analysisKindOverride === 'exercise_progression') {
        canonicalAnalysisKind = 'exercise_progression'
        return buildExerciseProgressionPlan(setsBase, {
          window: progressionWindow,
          exercise: exerciseTarget,
          bucket: progressionBucket,
          allTime: wantsAllTimeWindow,
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
      if (analysisKindOverride === 'favorite_split_day') {
        canonicalAnalysisKind = 'favorite_split_day'
        return buildFavoriteSplitDayPlan(setsBase, { window: favoriteSplitWindow })
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
      if (isPrQuestion(question)) {
        canonicalAnalysisKind = 'exercise_prs'
        return buildExercisePrsPlan(setsBase, {
          limit: rankingLimit,
          window: summaryWindow,
          exercise: exerciseTarget,
          useEstimated1rm,
          allTime: wantsAllTimeWindow,
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
        })
      }
      if (isExerciseSummaryQuestion(question)) {
        canonicalAnalysisKind = 'exercise_summary'
        return buildExerciseSummaryPlan(setsBase, {
          limit: rankingLimit,
          window: summaryWindow,
          exercise: exerciseTarget,
          allTime: wantsAllTimeWindow,
        })
      }
      if (isExerciseProgressionQuestion(question)) {
        canonicalAnalysisKind = 'exercise_progression'
        return buildExerciseProgressionPlan(setsBase, {
          window: progressionWindow,
          exercise: exerciseTarget,
          bucket: progressionBucket,
          allTime: wantsAllTimeWindow,
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
      if (isFavoriteSplitQuestion(question)) {
        canonicalAnalysisKind = 'favorite_split_day'
        return buildFavoriteSplitDayPlan(setsBase, { window: favoriteSplitWindow })
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

    if (plan.refusal && !canonicalPlan && !workoutPlan) {
      const response: GymChatResponse = {
        assistantMessage: plan.refusal.message,
        citations: [],
        queries: [],
        refusal: plan.refusal,
      }
      return respond(response, undefined, evalMeta)
    }

    const plannedQueries = (workoutPlan?.queries ?? canonicalPlan?.queries ?? plan.queries ?? []).map((query, index) => ({
      ...query,
      id: query.id || `q${index + 1}`,
    }))
    const isCanonicalPlan = Boolean(canonicalPlan) && !workoutPlan
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
        const assistantMessage = buildSqlErrorAssistantMessage(question, executedQueries, { nextSqlById })
        const response: GymChatResponse = {
          assistantMessage,
          citations: [],
          queries: executedQueries,
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
    if (allErrors) {
      const errorAnalysisKind =
        analysisKindOverride ?? canonicalAnalysisKind ?? resolveReturnEffortAnalysisKind(question) ?? 'other'
      conversationState = applyPlanMeta(conversationState, planMeta)
      conversationState = applyErrorState(conversationState, {
        type: executedQueries.some(query => query.error && isUnsafePolicyError(query.error)) ? 'policy' : 'sql',
        analysisKind: errorAnalysisKind,
        canonicalPlanId: canonicalAnalysisKind,
      })
      const assistantMessage = buildSqlErrorAssistantMessage(question, executedQueries, {
        nextSqlById,
        debug: wantsDebugSql,
      })
      const response: GymChatResponse = {
        assistantMessage,
        citations: [],
        queries: executedQueries,
      }
      return respond(response, undefined, { ...evalMeta, queryCount: executedQueries.length })
    }

    if (isWorkoutPlan) {
      const planQuery = executedQueries.find(query => query.id === 'q1')
      const hasPlanRows =
        planQuery && !planQuery.error && (planQuery.rowCount > 0 || planQuery.previewRows.length > 0)
      if (!hasPlanRows) {
        const acknowledgement = wantsCorrectionAcknowledgement
          ? buildPlanCorrectionAcknowledgement(planMeta?.targetsMuscles)
          : undefined
        const assistantMessage = buildWorkoutPlanFallbackMessage({
          constraint: planMeta?.targetsMuscles,
          usesHistoricalLifts: planMeta?.usesHistoricalLifts,
          acknowledgement,
        })
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
      })
      if (historicalPlan) {
        let assistantMessage = historicalPlan
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
        const planTimeframe =
          typeof planQuery?.params?.[0] === 'string'
            ? String(planQuery.params[0])
            : planQuery?.policy?.appliedTimeWindow ?? undefined
        const planAnalysisKind = analysisKindOverride ?? canonicalAnalysisKind ?? 'other'
        conversationState = applyAnalysisState(conversationState, {
          kind: planAnalysisKind,
          canonicalPlanId: canonicalAnalysisKind,
          timeframe: planTimeframe ?? undefined,
          targets: intentHints.targets,
        })
        conversationState = applyPlanMeta(conversationState, planMeta)
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
      if (intentHints.intentType === 'planning' && planMeta?.targetsMuscles?.include?.length) {
        const targetList = planMeta.targetsMuscles.include.join(', ')
        checklist.push(`Ensure the proposed session only includes ${targetList} exercises.`)
      }
      if (wantsCorrectionAcknowledgement) {
        checklist.push('Acknowledge the correction and restate the muscle-only constraint before the plan.')
      }
      return checklist
    })()

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
        },
        llmOptions,
      )
      let validationIssues = validateRankingResponse(question, explanation.assistantMessage, responseMeta)
      if (validationIssues.length) {
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
            validationNotes: [
              ...comparisonNotes,
              ...validationIssues.map(issue => issue.message),
            ],
            forceCitations: true,
          },
          llmOptions,
        )
        validationIssues = validateRankingResponse(question, explanation.assistantMessage, responseMeta)
        const missingCoverage = validationIssues.some(issue => issue.type === 'coverage_missing')
        if (missingCoverage && responseMeta.isRankingQuestion) {
          explanation.assistantMessage = `${explanation.assistantMessage}\n\n${formatCoverageLine(responseMeta)}`
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
          explanation.assistantMessage = `${explanation.assistantMessage}\n\n${formatCoverageLine(responseMeta)}`
          if (needsCitations()) {
            applyFallbackCitationsIfPossible()
          }
        }
      }
      if (periodCompareCoverage) {
        const hasCompareCoverage = /window_recent=|window_prior=/i.test(explanation.assistantMessage)
        if (!hasCompareCoverage) {
          explanation.assistantMessage = `${explanation.assistantMessage}\n\n${formatPeriodCompareCoverageLine(
            periodCompareCoverage,
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
      conversationState = applyAnalysisState(conversationState, {
        kind: analysisKind,
        canonicalPlanId,
        timeframe: analysisTimeframe,
        targets: intentHints.targets,
      })
      conversationState = applyPlanMeta(conversationState, planMeta)
      log('explain completed', { durationMs: Date.now() - explainStartedAt })
      const response: GymChatResponse = {
        assistantMessage: explanation.assistantMessage,
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
        conversationState = applyErrorState(conversationState, { type: 'explanation', analysisKind, canonicalPlanId })
        const response: GymChatResponse = {
          assistantMessage,
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
