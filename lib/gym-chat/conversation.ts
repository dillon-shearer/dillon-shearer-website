import type {
  GymChatConversationState,
  GymChatMessage,
  LastResponseContext,
  PendingClarification,
  SessionTurnSummary,
} from '@/types/gym-chat'
import { TERSE_INPUT_CLARIFICATION } from './templates'

export type TurnMode = 'clarification_answer' | 'analysis_followup' | 'new_question'

type LastResponseDataPoint = NonNullable<LastResponseContext['dataPoints']>[number]

/** Pronouns and phrases that reference prior context */
const PRONOUN_HINTS = [
  'that set',
  'the set',
  'that one',
  'the one',
  'the previous',
  'before that',
  'the one before',
  'prior set',
  'last one',
  'same exercise',
  'same lift',
  'that exercise',
  'the exercise',
  // Forward references
  'after that',
  'the next',
  'next set',
  'the one after',
  'following set',
]

/** Patterns that indicate a correction or clarification from the user */
const CORRECTION_PATTERNS = [
  /^no[,.]?\s+i\s+(meant|was asking|asked)/i,
  /^actually[,.]?\s+i\s+(meant|want)/i,
  /^i\s+meant\s+/i,
  /^not\s+that[,.]?\s+/i,
  /^what\s+i\s+meant/i,
]

const FOLLOW_UP_HINTS = [
  'drill into',
  'drill in',
  'zoom in',
  'break down',
  'breakdown',
  'details',
  'detail',
  'focus on',
  'double click',
  'that',
  'this',
  'those',
  'these',
  'it',
  'them',
  'same',
  'what about',
  'how about',
  'and what',
  'and how',
  'compare that',
  'compare to',
  'compare against',
  'compare before',
  'show me more',
]

const STANDALONE_PREFIXES = [
  'which',
  'what',
  'how',
  'show',
  'compare',
  'list',
  'give',
  'tell',
  'when',
  'where',
  'why',
  'is',
  'are',
  'can',
  'do',
  'does',
  'did',
]

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

export const RETURN_EFFORT_CHOICE_REGEX = /^(?:option|choice)?\s*([ab])(?:[\s\).,:-]|$)/i

const looksLikeStandaloneQuestion = (normalized: string) =>
  STANDALONE_PREFIXES.some(prefix => normalized.startsWith(prefix))

const hasConversationMemory = (state?: GymChatConversationState | null) =>
  Boolean(
    state?.lastAnalysis ||
      state?.lastPlanMeta ||
      state?.lastResponseContext ||
      state?.lastExercise ||
      state?.lastSessionDate ||
      state?.lastTimeWindow ||
      state?.lastMetric ||
      state?.scope?.exercises?.active?.length ||
      state?.scope?.exercises?.sticky ||
      state?.scope?.timeWindows?.active?.length ||
      state?.scope?.timeWindows?.sticky ||
      state?.scope?.metrics?.active?.length ||
      state?.scope?.metrics?.sticky ||
      state?.contextStack?.length ||
      state?.pendingComparison ||
      state?.history?.length,
  )

const HISTORY_MAX_CHARS = 3500
const HISTORY_RECENT_TURNS = 12
const HISTORY_OLDER_LIMIT = 24
const HISTORY_DETAIL_TEXT_CHARS = 160
const HISTORY_SUMMARY_TEXT_CHARS = 80
const HISTORY_RELEVANT_LIMIT = 6
const HISTORY_RELEVANCE_THRESHOLD = 2
const HISTORY_QUERY_TOKEN_LIMIT = 40

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'can',
  'did',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'show',
  'tell',
  'that',
  'the',
  'their',
  'them',
  'there',
  'this',
  'to',
  'us',
  'was',
  'we',
  'were',
  'what',
  'when',
  'which',
  'who',
  'with',
  'you',
  'your',
])

const SHORT_TOKENS = new Set(['pr', 'prs', 'rm'])

const METRIC_KEYWORDS: Record<LastResponseContext['metric'], string[]> = {
  volume: ['volume', 'total volume'],
  sets: ['set', 'sets'],
  reps: ['rep', 'reps'],
  '1rm': ['1rm', 'one rep', 'one rep max', 'one-rep max'],
  weight: ['weight', 'lbs', 'pounds'],
  sessions: ['session', 'sessions', 'workout', 'workouts'],
}

const TIMEFRAME_EXPLICIT_REGEX =
  /\b(\d+\s*(day|week|month|year)s?|today|yesterday|this\s+(week|month|year)|last\s+(week|month|year|session|sessions|workout|workouts)|past\s+(week|month|year|session|sessions|workout|workouts)|most recent|latest|since\b|all time|lifetime|year to date|ytd)\b/i
const TIMEFRAME_AMBIGUOUS_REGEX = /\b(recent|lately|last|past|previous|current)\b/i

export const isClarificationAnswer = (pending: PendingClarification | null | undefined, message: string) => {
  if (!pending) return false
  const normalized = normalizeWhitespace(message).toLowerCase()
  const wordCount = normalizeWhitespace(message).split(' ').filter(Boolean).length
  const isShort = wordCount <= 6 || message.length <= 40
  if (pending.kind === 'return_for_effort_metric') {
    if (normalized === '?' || RETURN_EFFORT_CHOICE_REGEX.test(normalized)) return true
    if (!isShort) return false
    if (normalized.includes('volume') || normalized.includes('total')) return true
    if (normalized.includes('progress') || normalized.includes('over time')) return true
    return false
  }
  if (pending.kind === 'timeframe') {
    if (!normalized) return false
    if (normalized === '?' || TIMEFRAME_EXPLICIT_REGEX.test(normalized)) return true
    if (TIMEFRAME_AMBIGUOUS_REGEX.test(normalized) || /^\d+$/.test(normalized)) return true
    if (isShort && !looksLikeStandaloneQuestion(normalized)) return true
    return false
  }
  if (pending.kind === 'terse_input') {
    // User is responding to a "what would you like to know about X?" clarification
    // Accept any short response that clarifies intent
    if (!normalized) return false
    if (isShort) return true
    return false
  }
  if (pending.kind === 'exercise_choice') {
    if (!normalized) return false
    if (isShort) return true
    return false
  }
  if (pending.kind === 'comparison') {
    if (!normalized) return false
    if (normalized === '?' || RETURN_EFFORT_CHOICE_REGEX.test(normalized)) return true
    if (normalized === 'yes' || normalized === 'no') return true
    if (isShort && /compare|vs|versus|both|side by side|switch|only/.test(normalized)) return true
    return false
  }
  return false
}

/**
 * Detects if the input is too terse (1-2 words) and needs clarification.
 * Returns the detected exercise name if found, otherwise null.
 */
export const detectTerseInput = (message: string): { isTerse: boolean; potentialExercise: string | null } => {
  const normalized = normalizeWhitespace(message).toLowerCase()
  const words = normalized.split(' ').filter(Boolean)

  // Not terse if more than 2 words or contains question words
  if (words.length > 2) return { isTerse: false, potentialExercise: null }
  if (looksLikeStandaloneQuestion(normalized)) return { isTerse: false, potentialExercise: null }

  // Single word or two-word input that's not a question
  if (words.length <= 2 && !normalized.includes('?')) {
    return { isTerse: true, potentialExercise: message.trim() }
  }

  return { isTerse: false, potentialExercise: null }
}

/**
 * Builds a clarification prompt for terse inputs.
 */
export const buildTerseClarificationPrompt = (input: string): string => {
  const suggestions = TERSE_INPUT_CLARIFICATION.options
  return [
    TERSE_INPUT_CLARIFICATION.title.replace('{exercise}', input),
    '',
    ...suggestions.map((s, i) => `${i + 1}. ${s}`),
  ].join('\n')
}

/**
 * Detects if the message contains pronouns that need resolution from prior context.
 */
export const containsPronounReference = (message: string): boolean => {
  const normalized = normalizeWhitespace(message).toLowerCase()
  return PRONOUN_HINTS.some(hint => normalized.includes(hint))
}

/**
 * Detects if the message is a correction of a previous misunderstanding.
 */
export const isCorrection = (message: string): boolean => {
  const normalized = normalizeWhitespace(message).toLowerCase()
  return CORRECTION_PATTERNS.some(pattern => pattern.test(normalized))
}

/**
 * Attempts to resolve pronoun references using the last response context.
 * Returns the resolved exercise name or null if unable to resolve.
 */
export const resolvePronounReference = (
  message: string,
  context: LastResponseContext | undefined
): {
  resolved: boolean
  exercise?: string
  dataPoint?: LastResponseDataPoint
  ambiguous?: boolean
  options?: string[]
  /** New index to update in context after forward/backward navigation */
  newIndex?: number
} => {
  if (!context) return { resolved: false }

  const normalized = normalizeWhitespace(message).toLowerCase()

  // When dataPoints exist, derive options from them to ensure consistency
  const dataPointExercises = context.dataPoints?.length
    ? [...new Set(context.dataPoints.map(dp => dp.exercise))]
    : undefined
  const options = dataPointExercises ?? (context.exercises?.length ? context.exercises : undefined)
  const isAmbiguous = options ? options.length > 1 : false

  // Check for "the set after that" or "next set" type references
  if (normalized.includes('after that') || normalized.includes('next set') ||
      normalized.includes('the next') || normalized.includes('following set') ||
      normalized.includes('the one after')) {
    if (context.dataPoints && context.dataPoints.length > 0) {
      // Determine current position - default to last item if not set
      const currentIdx = context.currentIndex ?? context.dataPoints.length - 1
      const nextIdx = currentIdx + 1
      if (nextIdx < context.dataPoints.length) {
        // There's a next item - return it
        const dataPoint = context.dataPoints[nextIdx]
        return { resolved: true, exercise: dataPoint.exercise, dataPoint, newIndex: nextIdx }
      }
      // At end of results - clarify limitation
      return {
        resolved: false,
        ambiguous: true,
        options: [`That was the last set in the results (${context.dataPoints.length} total). You can ask about earlier sets or specify by number (e.g., "the 2nd set").`],
      }
    }
    // No data points at all
    return {
      resolved: false,
      ambiguous: true,
      options: ['I don\'t have any sets in the recent results. Try asking for workout data first.'],
    }
  }

  // Check for ordinal references like "the 2nd set", "set #3", "third set", "the first set"
  // Word-based ordinals map
  const wordOrdinals: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  }
  // Match numeric ordinals: "the 2nd set", "set #3"
  const numericOrdinalMatch = normalized.match(/(?:the\s+)?(\d+)(?:st|nd|rd|th)?\s*set|set\s*#?(\d+)/i)
  // Match word ordinals: "the first set", "second set"
  const wordOrdinalMatch = normalized.match(/(?:the\s+)?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s*set/i)

  let ordinal: number | null = null
  if (numericOrdinalMatch) {
    ordinal = parseInt(numericOrdinalMatch[1] || numericOrdinalMatch[2], 10)
  } else if (wordOrdinalMatch) {
    ordinal = wordOrdinals[wordOrdinalMatch[1].toLowerCase()] ?? null
  }

  if (ordinal !== null && context.dataPoints && context.dataPoints.length > 0) {
    if (ordinal > 0 && ordinal <= context.dataPoints.length) {
      const dataPoint = context.dataPoints[ordinal - 1]
      return { resolved: true, exercise: dataPoint.exercise, dataPoint, newIndex: ordinal - 1 }
    }
    return {
      resolved: false,
      ambiguous: true,
      options: [`I only have ${context.dataPoints.length} set(s) in the recent results. Try a number between 1 and ${context.dataPoints.length}.`],
    }
  }

  // Check for "the set before that" or "previous set" type references
  if (normalized.includes('before that') || normalized.includes('previous') || normalized.includes('prior')) {
    if (context.dataPoints && context.dataPoints.length > 1) {
      // Return the second-to-last data point
      const dataPoint = context.dataPoints[context.dataPoints.length - 2]
      return { resolved: true, exercise: dataPoint.exercise, dataPoint }
    }
  }

  // Check for "that set" or "the set" references
  if (normalized.includes('that set') || normalized.includes('the set') || normalized.includes('that one')) {
    if (context.dataPoints && context.dataPoints.length > 0) {
      const dataPoint = context.dataPoints[context.dataPoints.length - 1]
      return { resolved: true, exercise: dataPoint.exercise, dataPoint }
    }
  }

  // Check for "that exercise" or "same exercise" references
  if (normalized.includes('that exercise') || normalized.includes('same exercise') ||
      normalized.includes('same lift') || normalized.includes('that lift')) {
    // Prefer dataPoints-derived exercise for consistency
    if (dataPointExercises?.length === 1) {
      return { resolved: true, exercise: dataPointExercises[0] }
    }
    if (isAmbiguous) {
      return { resolved: false, ambiguous: true, options }
    }
    if (context.exercise) {
      return { resolved: true, exercise: context.exercise }
    }
  }

  // Generic pronoun resolution - prefer dataPoints for consistency
  if ((normalized.includes('that') || normalized.includes('it') || normalized.includes('this'))) {
    // If we have unambiguous dataPoints, use that exercise
    if (dataPointExercises?.length === 1) {
      return { resolved: true, exercise: dataPointExercises[0] }
    }
    if (isAmbiguous) {
      return { resolved: false, ambiguous: true, options }
    }
    if (context.exercise) {
      return { resolved: true, exercise: context.exercise }
    }
  }

  return { resolved: false }
}

const isShortMessage = (message: string) => {
  const words = normalizeWhitespace(message).split(' ').filter(Boolean)
  return words.length <= 14 || message.length <= 120
}

const looksLikeFollowUp = (message: string) => {
  const normalized = normalizeWhitespace(message).toLowerCase()
  if (!normalized) return false
  if (containsPronounReference(message)) return true
  const isFollowUpPhrase = FOLLOW_UP_HINTS.some(hint => normalized.includes(hint))
  if (isFollowUpPhrase) return true
  if (normalized.includes('compare') && (normalized.includes('before') || normalized.includes('prior'))) return true
  if (normalized.startsWith('and ') || normalized.startsWith('also ')) return true
  return false
}

export const classifyTurnMode = (input: {
  message: string
  state?: GymChatConversationState | null
}): TurnMode => {
  const message = normalizeWhitespace(input.message)
  const state = input.state ?? undefined
  if (state?.pendingClarification && isClarificationAnswer(state.pendingClarification, message)) {
    return 'clarification_answer'
  }
  if (hasConversationMemory(state) && isShortMessage(message) && looksLikeFollowUp(message)) {
    return 'analysis_followup'
  }
  const normalized = message.toLowerCase()
  if (hasConversationMemory(state) && isShortMessage(message) && !looksLikeStandaloneQuestion(normalized)) {
    return 'analysis_followup'
  }
  return 'new_question'
}

const normalizeForTokens = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, ' ').replace(/[^a-z0-9\s]/g, ' ')

const extractTokens = (value: string) =>
  normalizeForTokens(value)
    .split(/\s+/)
    .filter(Boolean)
    .filter(token => (token.length >= 3 || /\d/.test(token) || SHORT_TOKENS.has(token)) && !STOP_WORDS.has(token))

const normalizeLabel = (value: string) => normalizeWhitespace(normalizeForTokens(value))

const buildQueryHints = (question: string, state?: GymChatConversationState) => {
  const parts: string[] = [question]
  const scope = state?.scope
  scope?.exercises?.active?.forEach(entry => {
    if (entry.value) parts.push(String(entry.value))
  })
  scope?.timeWindows?.active?.forEach(entry => {
    if (entry.value) parts.push(String(entry.value))
  })
  scope?.metrics?.active?.forEach(entry => {
    if (entry.value) parts.push(String(entry.value))
  })
  if (scope?.sessionDates?.primary?.value) {
    parts.push(scope.sessionDates.primary.value)
  }
  if (state?.lastResponseContext?.exercise) parts.push(state.lastResponseContext.exercise)
  if (state?.lastResponseContext?.timeWindow) parts.push(state.lastResponseContext.timeWindow)
  if (state?.lastResponseContext?.metric) parts.push(state.lastResponseContext.metric)
  return parts.filter(Boolean).join(' ')
}

const buildQueryTokens = (question: string, state?: GymChatConversationState) => {
  const hints = buildQueryHints(question, state)
  const tokens = extractTokens(hints)
  const sliced = tokens.length > HISTORY_QUERY_TOKEN_LIMIT ? tokens.slice(0, HISTORY_QUERY_TOKEN_LIMIT) : tokens
  return new Set(sliced)
}

const buildEntryTokens = (entry: SessionTurnSummary) => {
  const parts: string[] = [entry.text]
  if (entry.analysisKind) parts.push(entry.analysisKind.replace(/_/g, ' '))
  if (entry.analysisTopic) parts.push(entry.analysisTopic)
  if (entry.scope?.exercises?.length) parts.push(entry.scope.exercises.join(' '))
  if (entry.scope?.metrics?.length) parts.push(entry.scope.metrics.join(' '))
  if (entry.scope?.timeWindows?.length) parts.push(entry.scope.timeWindows.join(' '))
  if (entry.scope?.sessionDate) parts.push(entry.scope.sessionDate)
  return new Set(extractTokens(parts.join(' ')))
}

const matchesMetricKeyword = (metric: LastResponseContext['metric'], queryText: string) =>
  METRIC_KEYWORDS[metric].some(keyword => queryText.includes(keyword))

const scoreHistoryEntry = (
  entry: SessionTurnSummary,
  queryText: string,
  queryTokens: Set<string>,
) => {
  const entryTokens = buildEntryTokens(entry)
  let score = 0
  queryTokens.forEach(token => {
    if (entryTokens.has(token)) score += 1
  })
  if (entry.scope?.exercises?.length) {
    entry.scope.exercises.forEach(exercise => {
      const label = normalizeLabel(exercise)
      if (label && queryText.includes(label)) score += 3
    })
  }
  if (entry.scope?.metrics?.length) {
    entry.scope.metrics.forEach(metric => {
      if (matchesMetricKeyword(metric, queryText)) score += 2
    })
  }
  if (entry.scope?.timeWindows?.length) {
    entry.scope.timeWindows.forEach(window => {
      const label = normalizeLabel(window)
      if (label && queryText.includes(label)) score += 2
    })
  }
  if (entry.scope?.sessionDate && queryText.includes(entry.scope.sessionDate)) score += 2
  return score
}

const selectRelevantHistory = (
  history: SessionTurnSummary[],
  queryText: string,
  queryTokens: Set<string>,
) => {
  const scored = history.map((entry, index) => ({
    entry,
    index,
    score: scoreHistoryEntry(entry, queryText, queryTokens),
  }))
  const relevant = scored.filter(item => item.score >= HISTORY_RELEVANCE_THRESHOLD)
  relevant.sort((a, b) => b.score - a.score || b.index - a.index)
  const sliced = relevant.slice(0, HISTORY_RELEVANT_LIMIT)
  sliced.sort((a, b) => a.index - b.index)
  return sliced.map(item => item.entry)
}

const pickFallbackScopeValue = (value?: string | null) => (value ? [value] : [])

const selectFallbackHistory = (history: SessionTurnSummary[], state?: GymChatConversationState) => {
  if (!history.length || !state) return []
  const exerciseTargets = new Set<string>([
    ...pickFallbackScopeValue(state.lastResponseContext?.exercise),
    ...pickFallbackScopeValue(state.scope?.exercises?.primary?.value),
    ...pickFallbackScopeValue(state.lastExercise),
  ])
  const metricTargets = new Set<LastResponseContext['metric']>([
    ...(state.lastResponseContext?.metric ? [state.lastResponseContext.metric] : []),
    ...(state.scope?.metrics?.primary?.value ? [state.scope.metrics.primary.value] : []),
    ...(state.lastMetric ? [state.lastMetric] : []),
  ])
  const windowTargets = new Set<string>([
    ...pickFallbackScopeValue(state.lastResponseContext?.timeWindow),
    ...pickFallbackScopeValue(state.scope?.timeWindows?.primary?.value),
    ...pickFallbackScopeValue(state.lastTimeWindow),
  ])
  const dateTargets = new Set<string>([
    ...pickFallbackScopeValue(state.lastResponseContext?.sessionDate),
    ...pickFallbackScopeValue(state.scope?.sessionDates?.primary?.value),
    ...pickFallbackScopeValue(state.lastSessionDate),
  ])
  const matches = history.filter(entry => {
    const scope = entry.scope
    if (!scope) return false
    if (scope.exercises?.some(exercise => exerciseTargets.has(exercise))) return true
    if (scope.metrics?.some(metric => metricTargets.has(metric))) return true
    if (scope.timeWindows?.some(window => windowTargets.has(window))) return true
    if (scope.sessionDate && dateTargets.has(scope.sessionDate)) return true
    return false
  })
  const picked = matches.length ? matches : history
  return picked.slice(-Math.min(2, picked.length))
}

const truncateText = (value: string, maxChars: number) => {
  if (!value) return value
  if (value.length <= maxChars) return value
  return `${value.slice(0, Math.max(0, maxChars - 3))}...`
}

const formatHistoryMeta = (entry: SessionTurnSummary) => {
  const scopeParts: string[] = []
  if (entry.scope?.exercises?.length) {
    scopeParts.push(`exercises=${entry.scope.exercises.join(', ')}`)
  }
  if (entry.scope?.timeWindows?.length) {
    scopeParts.push(`time_windows=${entry.scope.timeWindows.join(', ')}`)
  }
  if (entry.scope?.metrics?.length) {
    scopeParts.push(`metrics=${entry.scope.metrics.join(', ')}`)
  }
  if (entry.scope?.sessionDate) {
    scopeParts.push(`session_date=${entry.scope.sessionDate}`)
  }
  const metaParts: string[] = []
  if (entry.analysisKind) metaParts.push(`analysis=${entry.analysisKind}`)
  if (entry.analysisTopic) metaParts.push(`topic=${entry.analysisTopic}`)
  if (entry.intent) metaParts.push(`intent=${entry.intent}`)
  if (scopeParts.length) metaParts.push(`scope=${scopeParts.join('; ')}`)
  return metaParts
}

const formatHistoryEntryDetailed = (entry: SessionTurnSummary) => {
  const label = entry.role === 'assistant' ? 'A' : 'U'
  const text = truncateText(normalizeWhitespace(entry.text), HISTORY_DETAIL_TEXT_CHARS)
  const metaParts = formatHistoryMeta(entry)
  const meta = metaParts.length ? ` [${metaParts.join(', ')}]` : ''
  return `${label}: ${text}${meta}`
}

const formatHistoryEntrySummary = (entry: SessionTurnSummary) => {
  const label = entry.role === 'assistant' ? 'A' : 'U'
  const metaParts = formatHistoryMeta(entry)
  if (metaParts.length) {
    return `${label}: ${metaParts.join(', ')}`
  }
  const text = truncateText(normalizeWhitespace(entry.text), HISTORY_SUMMARY_TEXT_CHARS)
  return `${label}: ${text}`
}

const buildHistoryContext = (
  history: SessionTurnSummary[],
  question: string,
  state?: GymChatConversationState,
) => {
  if (!history.length) return null
  const queryText = normalizeWhitespace(question).toLowerCase()
  const queryTokens = buildQueryTokens(question, state)
  const lines: string[] = []
  let used = 0
  const pushLine = (line: string) => {
    const extra = (lines.length ? 1 : 0) + line.length
    if (used + extra > HISTORY_MAX_CHARS) return false
    lines.push(line)
    used += extra
    return true
  }
  const pushSection = (title: string, entryLines: string[]) => {
    if (!entryLines.length) return
    if (!pushLine(title)) return
    entryLines.some(line => !pushLine(`- ${line}`))
  }
  const recent = history.slice(-HISTORY_RECENT_TURNS)
  const older = history.length > HISTORY_RECENT_TURNS ? history.slice(0, -HISTORY_RECENT_TURNS) : []
  let relevantEntries = selectRelevantHistory(older, queryText, queryTokens)
  if (!relevantEntries.length && older.length) {
    relevantEntries = selectFallbackHistory(older, state)
  } else if (relevantEntries.length < HISTORY_RELEVANT_LIMIT && older.length) {
    const fallback = selectFallbackHistory(older, state)
    const relevantIds = new Set(relevantEntries.map(entry => entry.id))
    const combined = [...relevantEntries, ...fallback.filter(entry => !relevantIds.has(entry.id))]
    relevantEntries = combined.slice(0, HISTORY_RELEVANT_LIMIT)
  }
  const relevantIds = new Set(relevantEntries.map(entry => entry.id))
  const olderLines = older
    .filter(entry => !relevantIds.has(entry.id))
    .slice(-HISTORY_OLDER_LIMIT)
    .map(entry => formatHistoryEntrySummary(entry))
  const relevantLines = relevantEntries.map(entry => formatHistoryEntryDetailed(entry))
  const recentLines = recent.map(entry => formatHistoryEntryDetailed(entry))
  pushSection('Relevant earlier turns:', relevantLines)
  pushSection('Recent turns:', recentLines)
  pushSection('Earlier turns summary:', olderLines)
  if (!lines.length) return null
  return `Session history (background context):\n${lines.join('\n')}`
}

export const buildLlmContext = (input: {
  question: string
  state?: GymChatConversationState | null
  mode?: TurnMode
}) => {
  const state = input.state ?? undefined
  const messages: GymChatMessage[] = []
  if (state?.history?.length) {
    const historyContext = buildHistoryContext(state.history, input.question, state)
    if (historyContext) {
      messages.push({
        role: 'assistant' as const,
        content: historyContext,
      })
    }
  }
  if (state?.lastAnalysis && input.mode === 'analysis_followup') {
    const parts = [`analysis=${state.lastAnalysis.kind}`]
    if (state.lastAnalysis.timeframe) {
      parts.push(`timeframe=${state.lastAnalysis.timeframe}`)
    }
    if (state.lastAnalysis.canonicalPlanId) {
      parts.push(`plan=${state.lastAnalysis.canonicalPlanId}`)
    }
    if (state.lastAnalysis.targets?.length) {
      parts.push(`targets=${state.lastAnalysis.targets.join(', ')}`)
    }
    messages.push({
      role: 'assistant' as const,
      content: `Context from prior analysis: ${parts.join(', ')}.`,
    })
  }
  // Add last response context for pronoun resolution
  if (state?.lastResponseContext && input.mode === 'analysis_followup') {
    const ctx = state.lastResponseContext
    const parts: string[] = []
    if (ctx.exercise) {
      parts.push(`exercise=${ctx.exercise}`)
    }
    if (ctx.timeWindow) {
      parts.push(`time_window=${ctx.timeWindow}`)
    }
    if (ctx.sessionDate) {
      parts.push(`session_date=${ctx.sessionDate}`)
    }
    if (ctx.metric) {
      parts.push(`metric=${ctx.metric}`)
    }
    if (ctx.dataPoints?.length) {
      const summary = ctx.dataPoints.slice(-3).map(dp => {
        const bits: string[] = [dp.exercise]
        if (dp.weight) bits.push(`${dp.weight}lb`)
        if (dp.reps) bits.push(`x${dp.reps}`)
        if (dp.date) bits.push(`on ${dp.date}`)
        return bits.join(' ')
      }).join('; ')
      parts.push(`recent_data=[${summary}]`)
    }
    if (parts.length) {
      messages.push({
        role: 'assistant' as const,
        content: `Last response context: ${parts.join(', ')}.`,
      })
    }
  }
  if (state?.scope && input.mode === 'analysis_followup') {
    const scopeParts: string[] = []
    const summarizeSlot = <T,>(label: string, slot: { active?: Array<{ value: T }> }) => {
      const values = (slot.active ?? []).map(entry => entry.value).filter(Boolean)
      if (!values.length) return
      const unique = Array.from(new Set(values.map(value => String(value))))
      if (unique.length) {
        scopeParts.push(`${label}=${unique.join(', ')}`)
      }
    }
    summarizeSlot('exercises', state.scope.exercises)
    summarizeSlot('time_windows', state.scope.timeWindows)
    summarizeSlot('metrics', state.scope.metrics)
    summarizeSlot('session_dates', state.scope.sessionDates)
    if (scopeParts.length) {
      messages.push({
        role: 'assistant' as const,
        content: `Active scope: ${scopeParts.join('; ')}.`,
      })
    }
  }
  if (state?.pendingComparison && input.mode === 'analysis_followup') {
    const intent = state.pendingComparison
    const dimensions = intent.dimensions?.length ? intent.dimensions.join(', ') : 'unspecified'
    messages.push({
      role: 'assistant' as const,
      content: `Comparison intent: dimensions=${dimensions}, explicit=${intent.explicit ? 'yes' : 'no'}.`,
    })
  }
  if (input.mode === 'analysis_followup') {
    const memoryParts: string[] = []
    if (state?.lastExercise && state.lastExercise !== state?.lastResponseContext?.exercise) {
      memoryParts.push(`exercise=${state.lastExercise}`)
    }
    if (state?.lastSessionDate && state.lastSessionDate !== state?.lastResponseContext?.sessionDate) {
      memoryParts.push(`session_date=${state.lastSessionDate}`)
    }
    if (state?.lastTimeWindow && state.lastTimeWindow !== state?.lastResponseContext?.timeWindow) {
      memoryParts.push(`time_window=${state.lastTimeWindow}`)
    }
    if (state?.lastMetric && state.lastMetric !== state?.lastResponseContext?.metric) {
      memoryParts.push(`metric=${state.lastMetric}`)
    }
    if (memoryParts.length) {
      messages.push({
        role: 'assistant' as const,
        content: `Follow-up memory: ${memoryParts.join(', ')}.`,
      })
    }
  }
  if (state?.lastPlanMeta) {
    const parts: string[] = []
    if (state.lastPlanMeta.targetsMuscles?.include?.length) {
      const include = state.lastPlanMeta.targetsMuscles.include.join(', ')
      const strict = state.lastPlanMeta.targetsMuscles.strict ? 'strict' : 'flex'
      parts.push(`targets=${include} (${strict})`)
    }
    if (state.lastPlanMeta.targetsMuscles?.exclude?.length) {
      parts.push(`exclude=${state.lastPlanMeta.targetsMuscles.exclude.join(', ')}`)
    }
    if (state.lastPlanMeta.usesHistoricalLifts) {
      parts.push('uses_historical_lifts=true')
    }
    if (state.lastPlanMeta.goal) {
      parts.push(`goal=${state.lastPlanMeta.goal}`)
    }
    if (parts.length) {
      messages.push({
        role: 'assistant' as const,
        content: `Planning context: ${parts.join(', ')}.`,
      })
    }
  }
  if (state?.lastError) {
    const parts = [`type=${state.lastError.type}`]
    if (state.lastError.analysisKind) {
      parts.push(`analysis=${state.lastError.analysisKind}`)
    }
    if (state.lastError.canonicalPlanId) {
      parts.push(`plan=${state.lastError.canonicalPlanId}`)
    }
    messages.push({
      role: 'assistant' as const,
      content: `Recent issue: ${parts.join(', ')}.`,
    })
  }
  messages.push({ role: 'user' as const, content: input.question })
  return messages
}
