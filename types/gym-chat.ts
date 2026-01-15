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
  | 'top_weight_sets'
  | 'lowest_volume_day'
  | 'favorite_split_day'
  | 'weekly_volume'
  | 'top_end_efforts'
  | 'top_end_efforts_compare_12m_3m'
  | 'progressive_overload'
  | 'set_count'
  | 'volume'
  | 'session_count'
  | 'other'

export type TargetMuscleConstraint = {
  include: string[]
  exclude?: string[]
  strict?: boolean
}

export type WorkoutPlanAnalysisMeta = {
  targetsMuscles?: TargetMuscleConstraint
  usesHistoricalLifts?: boolean
}

export type PendingClarification = { kind: 'return_for_effort_metric' | 'timeframe' }

export type GymChatConversationState = {
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
