import type { GymChatConversationState, GymChatMessage, LastResponseContext, PendingClarification } from '@/types/gym-chat'
import { TERSE_INPUT_CLARIFICATION } from './templates'

export type TurnMode = 'clarification_answer' | 'analysis_followup' | 'new_question'

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
  dataPoint?: LastResponseContext['dataPoints'][0]
  ambiguous?: boolean
  options?: string[]
} => {
  if (!context) return { resolved: false }

  const normalized = normalizeWhitespace(message).toLowerCase()
  const options = context.exercises && context.exercises.length ? context.exercises : undefined
  const isAmbiguous = options ? options.length > 1 : false

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
    if (isAmbiguous) {
      return { resolved: false, ambiguous: true, options }
    }
    if (context.exercise) {
      return { resolved: true, exercise: context.exercise }
    }
  }

  // Generic pronoun resolution - use primary exercise from context
  if ((normalized.includes('that') || normalized.includes('it') || normalized.includes('this'))) {
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
  if ((state?.lastAnalysis || state?.lastPlanMeta) && isShortMessage(message) && looksLikeFollowUp(message)) {
    return 'analysis_followup'
  }
  const normalized = message.toLowerCase()
  if ((state?.lastAnalysis || state?.lastPlanMeta) && isShortMessage(message) && !looksLikeStandaloneQuestion(normalized)) {
    return 'analysis_followup'
  }
  return 'new_question'
}

export const buildLlmContext = (input: {
  question: string
  state?: GymChatConversationState | null
  mode?: TurnMode
}) => {
  const state = input.state ?? undefined
  const messages: GymChatMessage[] = []
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
