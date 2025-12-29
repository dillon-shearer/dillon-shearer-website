export type GymChatRole = 'user' | 'assistant'

export type GymChatMessage = {
  role: GymChatRole
  content: string
}

export type GymChatRequest = {
  messages: GymChatMessage[]
  client: {
    timezone: string
  }
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
    appliedTimeWindow: '90 days' | '12 months' | 'all_time' | null
  }
}

export type GymChatResponse = {
  assistantMessage: string
  citations: GymChatCitation[]
  queries: GymChatQuery[]
  chartSpecs?: GymChatChartSpec[]
  followUps?: string[]
  refusal?: {
    message: string
    reason?: string
  }
}
