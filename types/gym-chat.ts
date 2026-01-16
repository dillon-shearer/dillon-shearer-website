export type GymChatRole = 'user' | 'assistant'

export type GymChatMessage = {
  role: GymChatRole
  content: string
}

export type AnalysisKind =
  | 'muscle_group_balance'
  | 'return_for_effort_volume'
  | 'return_for_effort_progression'
  | 'stalled_lifts'
  | 'lighter_weight_progress'
  | 'exercise_prs'
  | 'best_sets'
  | 'set_breakdown'
  | 'exercise_summary'
  | 'exercise_progression'
  | 'top_weight_sets'
  | 'lowest_volume_day'
  | 'favorite_split_day'
  | 'weekly_volume'
  | 'period_compare'
  | 'top_end_efforts'
  | 'top_end_efforts_compare_12m_3m'
  | 'progressive_overload'
  | 'set_count'
  | 'volume'
  | 'session_count'
  | 'best_1rm_overall'
  | 'inactive_exercises'
  | 'workout_timing'
  | 'other'

export type TargetMuscleConstraint = {
  include: string[]
  exclude?: string[]
  strict?: boolean
}

export type WorkoutPlanAnalysisMeta = {
  targetsMuscles?: TargetMuscleConstraint
  usesHistoricalLifts?: boolean
  goal?: 'strength' | 'hypertrophy' | 'endurance'
}

export type PendingClarification =
  | { kind: 'return_for_effort_metric' }
  | { kind: 'timeframe'; question?: string }
  | { kind: 'exercise_choice'; question: string; options: string[] }
  | { kind: 'terse_input'; input: string; suggestions: string[] }
  | { kind: 'comparison'; question: string }

/**
 * Context from the last query response for multi-turn pronoun resolution.
 * Stores specific data points that can be referenced in follow-ups.
 */
export type LastResponseContext = {
  /** Primary exercise from the last response */
  exercise?: string
  /** All exercises mentioned in the last response */
  exercises?: string[]
  /** Time window used for the last response */
  timeWindow?: string
  /** Specific data points (sets, weights, dates) for pronoun resolution */
  dataPoints?: Array<{
    exercise: string
    weight?: number
    reps?: number
    date?: string
    volume?: number
    e1rm?: number
  }>
  /** Current index in dataPoints for forward/backward navigation */
  currentIndex?: number
  /** The session date if a specific session was referenced */
  sessionDate?: string
  /** The metric type used in the last analysis */
  metric?: 'volume' | 'sets' | 'reps' | '1rm' | 'weight' | 'sessions'
}

export type ContextDimension = 'exercise' | 'timeWindow' | 'metric' | 'sessionDate'

export type ContextValue<T> = {
  value: T
  source: 'explicit' | 'implicit' | 'resolved' | 'sticky' | 'history'
  turnId: string
  timestamp: string
}

export type ContextSlot<T> = {
  active: ContextValue<T>[]
  primary?: ContextValue<T>
  sticky?: ContextValue<T>
  lastExplicit?: ContextValue<T>
}

export type ContextScope = {
  exercises: ContextSlot<string>
  timeWindows: ContextSlot<string>
  metrics: ContextSlot<LastResponseContext['metric']>
  sessionDates: ContextSlot<string>
}

export type AnalysisTopic =
  | 'prs'
  | 'volume'
  | 'progression'
  | 'comparison'
  | 'session_summary'
  | 'planning'
  | 'general'

export type ContextFrame = {
  id: string
  analysisKind: AnalysisKind
  analysisTopic: AnalysisTopic
  scope: {
    exercises: string[]
    timeWindows: string[]
    metrics: LastResponseContext['metric'][]
    sessionDate?: string
  }
  response: {
    dataPoints?: LastResponseContext['dataPoints']
    queryIds?: string[]
  }
  createdAt: string
  sourceTurnId: string
}

export type ComparisonIntent = {
  dimensions: ContextDimension[]
  baseFrameId?: string
  baseScope: Partial<ContextFrame['scope']>
  candidateScope: Partial<ContextFrame['scope']>
  explicit: boolean
  status: 'pending' | 'ready' | 'clarify'
  clarificationQuestion?: string
}

export type SessionTurnSummary = {
  id: string
  role: GymChatRole
  text: string
  analysisKind?: AnalysisKind
  analysisTopic?: AnalysisTopic
  scope?: Partial<ContextFrame['scope']>
  intent?: 'question' | 'followup' | 'clarification'
  timestamp: string
}

export type GymChatConversationState = {
  sessionId?: string
  turnIndex?: number
  scope?: ContextScope
  contextStack?: ContextFrame[]
  pendingComparison?: ComparisonIntent | null
  history?: SessionTurnSummary[]
  memoryBudget?: { maxTurns: number; maxBytes: number }
  lastAnalysis?: {
    kind: AnalysisKind
    canonicalPlanId?: string
    timeframe?: string
    targets?: string[]
  }
  lastPlanMeta?: WorkoutPlanAnalysisMeta
  pendingClarification?: PendingClarification | null
  lastError?: {
    type: 'sql' | 'explanation' | 'policy'
    analysisKind?: AnalysisKind
    canonicalPlanId?: string
  }
  /** Context from the last response for multi-turn pronoun resolution */
  lastResponseContext?: LastResponseContext
  /** Primary exercise from the last successful analysis response */
  lastExercise?: string
  /** Session date from the last response when applicable */
  lastSessionDate?: string
  /** Time window used in the last analysis */
  lastTimeWindow?: string
  /** Metric used in the last analysis */
  lastMetric?: LastResponseContext['metric']
}

export type GymChatRequest = {
  messages: GymChatMessage[]
  client: {
    timezone: string
  }
  conversationState?: GymChatConversationState | null
}

export type GymChatCitation = {
  marker: string
  queryId: string
  rowStart: number
  rowEnd: number
  note?: string
}

export type GymChatChartSpec = {
  type: 'line' | 'bar'
  queryId: string
  x: string
  y: string
  title?: string
}

export type GymChatQuery = {
  id: string
  purpose: string
  sql: string
  params: unknown[]
  rowCount: number
  durationMs: number
  previewRows: Record<string, unknown>[]
  error: string | null
  policy?: {
    appliedLimit: number
    appliedTimeWindow: GymChatTimeWindow | null
  }
}

export type GymChatTimeWindow =
  | 'all_time'
  | `${number} day`
  | `${number} days`
  | `${number} week`
  | `${number} weeks`
  | `${number} month`
  | `${number} months`
  | `${number} year`
  | `${number} years`

export type GymChatResponse = {
  assistantMessage: string
  citations: GymChatCitation[]
  queries: GymChatQuery[]
  chartSpecs?: GymChatChartSpec[]
  followUps?: string[]
  conversationState?: GymChatConversationState | null
  explanationError?: {
    message: string
  }
  refusal?: {
    message: string
    reason?: string
  }
}
