import type { GymChatConversationState, GymChatMessage, PendingClarification } from '@/types/gym-chat'

export type TurnMode = 'clarification_answer' | 'analysis_followup' | 'new_question'

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
  return false
}

const isShortMessage = (message: string) => {
  const words = normalizeWhitespace(message).split(' ').filter(Boolean)
  return words.length <= 14 || message.length <= 120
}

const looksLikeFollowUp = (message: string) => {
  const normalized = normalizeWhitespace(message).toLowerCase()
  if (!normalized) return false
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
