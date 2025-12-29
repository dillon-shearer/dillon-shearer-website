import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'
import { createClient, createPool } from '@vercel/postgres'

import { loadGymCatalog } from '@/lib/gym-chat/catalog'
import {
  classifyQuestion,
  planGymSql,
  explainFitnessGeneral,
  explainGymResults,
  isLlmRequestError,
} from '@/lib/gym-chat/llm'
import {
  MAX_PREVIEW_ROWS,
  QUERY_TIMEOUT_MS,
  validateAndRewriteSql,
} from '@/lib/gym-chat/sql-policy'
import { TEMPLATES, selectTemplates } from '@/lib/gym-chat/templates'
import type { GymChatTemplateName } from '@/lib/gym-chat/templates'
import type { GymChatCitation, GymChatMessage, GymChatQuery, GymChatResponse } from '@/types/gym-chat'

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

const SUGGESTED_QUESTIONS = [
  'What was my weekly training volume over the last 12 months?',
  'How many sessions did I log in the last 8 weeks?',
  'Which exercises had the most total sets in the last 90 days?',
  'How should I structure a 4-day split to gain muscle?',
  'Is full body training 3x/week enough?',
  'How should I set a bench press goal?',
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

type IntervalHints = Map<number, 'day' | 'week' | 'month' | 'year'>

const extractIntervalHints = (text: string): IntervalHints => {
  const hints: IntervalHints = new Map()
  if (!text) return hints
  const normalized = text.toLowerCase()
  let match: RegExpExecArray | null
  while ((match = RELATIVE_WINDOW_REGEX.exec(normalized))) {
    const value = Number(match[1])
    if (!Number.isFinite(value)) continue
    const unit = match[2] as 'day' | 'week' | 'month' | 'year'
    if (!unit) continue
    hints.set(value, unit)
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

const coerceIntervalParams = (sql: string, params: unknown[], hints: IntervalHints) => {
  const matches = Array.from(sql.matchAll(INTERVAL_PLACEHOLDER_REGEX))
  if (!matches.length) return params
  const nextParams = [...params]
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
    const unit = hints.get(numericValue) ?? 'day'
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
]

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
  const requestId = randomUUID()
  const startedAt = Date.now()
  const wantsEvalMeta = req.headers.get('x-gym-chat-eval') === '1'
  const log = (...args: unknown[]) => {
    console.info(`[gym-chat:${requestId}]`, ...args)
  }
  const respond = (
    body: GymChatResponse | { error: string },
    init?: { status?: number },
    meta?: GymChatEvalMeta,
  ) => {
    const headers = wantsEvalMeta ? buildEvalHeaders(meta) : undefined
    if (headers) {
      return NextResponse.json(body, { ...(init ?? {}), headers })
    }
    return NextResponse.json(body, init)
  }

  try {
    let payload: { messages?: GymChatMessage[]; client?: { timezone?: string } }
    try {
      payload = await req.json()
    } catch (error) {
      return respond({ error: 'Invalid JSON payload.' }, { status: 400 })
    }

    await loadGymCatalog().catch(error => {
      log('catalog load failed', error)
    })

    const messages = normalizeMessages(payload.messages ?? [])
    if (!messages.length) {
      return respond({ error: 'Messages are required.' }, { status: 400 })
    }

    const question = extractLatestUserQuestion(messages)
    if (!question) {
      return respond({ error: 'User question is required.' }, { status: 400 })
    }

    const timezone = payload.client?.timezone ?? 'UTC'

    const classification = await classifyQuestion(messages)
    log('classification', classification)
    classification.primaryGrain = normalizePrimaryGrainValue(classification.primaryGrain)
    const intervalHints = extractIntervalHints(question)
    const userContext = messages.filter(message => message.role === 'user').map(message => message.content).join(' ')
    const combinedUserText = `${question} ${userContext}`
    const likelyGymIntent = looksLikeGymIntent(combinedUserText)
    const likelyPlanningIntent = looksLikePlanningIntent(combinedUserText)
    if (likelyGymIntent) {
      if (classification.domain === 'other') {
        log('classification override: forcing fitness_general domain due to workout intent heuristics')
        classification.domain = 'fitness_general'
      }
      if (classification.confidence < 0.9 && classification.domain !== 'other') {
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
    if (!classification.intentType) {
      classification.intentType = 'descriptive'
    }

    const intentHints = {
      intentType: classification.intentType,
      primaryGrain: classification.primaryGrain,
      targets: classification.targets,
    }
    const templateSelection = selectTemplates({
      question: combinedUserText,
      intentType: classification.intentType,
      targets: classification.targets,
    })
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
      const response: GymChatResponse = {
        assistantMessage:
          classification.clarifyingQuestion ||
          'Can you clarify what gym data you want to analyze?',
        citations: [],
        queries: [],
      }
      return respond(response, undefined, evalMeta)
    }

    if (classification.domain === 'fitness_general') {
      const explanation = await explainFitnessGeneral(messages)
      const response: GymChatResponse = {
        assistantMessage: explanation.assistantMessage,
        citations: [],
        queries: [],
        followUps: explanation.followUps,
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

    const plan = await planGymSql(messages, timezone, {
      ...intentHints,
      template: templateSelection.primary,
      secondaryTemplate: templateSelection.secondary,
    })
    if (plan.refusal) {
      const response: GymChatResponse = {
        assistantMessage: plan.refusal.message,
        citations: [],
        queries: [],
        refusal: plan.refusal,
      }
      return respond(response, undefined, evalMeta)
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

    const plannedQueries = (plan.queries ?? []).map((query, index) => ({
      ...query,
      id: query.id || `q${index + 1}`,
    }))

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

    const executedQueries: GymChatQuery[] = []
    for (const query of plannedQueries) {
      const normalizedParams = coerceIntervalParams(query.sql, query.params ?? [], intervalHints)
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

    const hasPolicyErrors = executedQueries.some(query => query.error)
    if (hasPolicyErrors) {
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
    if (usePool) {
      const pool = createPool({ connectionString: connection.url })
      const client = await pool.connect()
      try {
        await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`)
        await client.query('SET default_transaction_read_only = on')

        for (const query of executedQueries) {
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
    } else {
      const client = createClient({ connectionString: connection.url })
      await client.connect()
      try {
        await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`)
        await client.query('SET default_transaction_read_only = on')

        for (const query of executedQueries) {
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
    }

    log(
      'executed queries',
      executedQueries.map(query => ({ id: query.id, rowCount: query.rowCount, durationMs: query.durationMs })),
    )

    const allErrors = executedQueries.every(query => query.error)
    if (allErrors) {
      const response: GymChatResponse = {
        assistantMessage: 'I ran into errors while executing the queries. Please try again later.',
        citations: [],
        queries: executedQueries,
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
      return checklist
    })()

    let explanation = await explainGymResults({
      question,
      queries: executedQueries,
      intentType: intentHints.intentType,
      selectedTemplate,
      secondaryTemplate,
      explainChecklist,
    })
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
        explanation = await explainGymResults({
          question,
          queries: executedQueries,
          intentType: intentHints.intentType,
          selectedTemplate,
          secondaryTemplate,
          explainChecklist,
          forceCitations: true,
        })
        citations = explanation.citations.filter(citation => allowedIds.has(citation.queryId))
        explanation.assistantMessage = formatStructuredAssistantMessage(explanation.assistantMessage, citations)
        markerSet = extractMarkers(explanation.assistantMessage)
        citationMarkersOk = citations.length && citations.every(citation => markerSet.has(citation.marker))
        if (needsCitations()) {
          applyFallbackCitationsIfPossible()
        }
      }
    }
 
    if (canEnforceCitations && needsCitations()) {
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

    const chartSpecs = explanation.chartSpecs?.filter(spec => allowedIds.has(spec.queryId))

    const response: GymChatResponse = {
      assistantMessage: explanation.assistantMessage,
      citations,
      queries: executedQueries,
      chartSpecs,
      followUps: explanation.followUps,
    }
    log('fallback citations applied', fallbackCitationsApplied)
    return respond(response, undefined, {
      ...evalMeta,
      queryCount: executedQueries.length,
      fallbackCitationsApplied,
    })
  } catch (error) {
    if (isLlmRequestError(error)) {
      const isMissingKey = error.message.startsWith('Missing OpenAI API key')
      log('llm error', { status: error.status, retryable: error.retryable, detail: error.detail })
      const response: GymChatResponse = {
        assistantMessage: isMissingKey
          ? 'Missing OpenAI API key. Please set OPENAI_API_KEY to continue.'
          : 'The model is temporarily unavailable. Please try again in a moment.',
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
