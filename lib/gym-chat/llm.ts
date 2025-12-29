import { z } from 'zod'

import { getCatalogContext, loadGymCatalog } from './catalog'
import { getCapabilitiesContext } from './capabilities'
import { SEMANTIC_HINTS } from './semantics'
import { TEMPLATES } from './templates'

import type { GymChatTemplateName } from './templates'

import type { GymChatMessage, GymChatQuery, GymChatCitation, GymChatChartSpec } from '@/types/gym-chat'

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const CAPABILITIES_CONTEXT = getCapabilitiesContext()

const CLASSIFY_SCHEMA = z.object({
  domain: z.enum(['gym_data', 'fitness_general', 'other']),
  confidence: z.number().min(0).max(1),
  clarifyingQuestion: z.string().optional(),
  intentType: z.enum(['descriptive', 'trend', 'comparison', 'diagnostic', 'planning']).optional(),
  primaryGrain: z.preprocess(
    value => (value == null || value === '' ? undefined : value),
    z.string().optional(),
  ).optional(),
  targets: z.array(z.string()).optional(),
})

const PLAN_SCHEMA = z.object({
  refusal: z
    .object({
      message: z.string(),
      reason: z.string().optional(),
    })
    .optional(),
  queries: z
    .array(
      z.object({
        id: z.string(),
        purpose: z.string(),
        sql: z.string(),
        params: z.array(z.any()),
      }),
    )
    .optional()
    .default([]),
  template: z.string().optional(),
  secondaryTemplate: z.string().optional(),
})

const CITATION_SCHEMA = z.object({
  marker: z.string().optional(),
  queryId: z.string().optional(),
  rowStart: z.number().int().optional(),
  rowEnd: z.number().int().optional(),
  note: z.string().optional(),
})

const CHART_SCHEMA = z.object({
  type: z.enum(['line', 'bar']),
  queryId: z.string(),
  x: z.string(),
  y: z.string(),
  title: z.string().optional(),
})

const ASSISTANT_MESSAGE_SCHEMA = z.preprocess(value => {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const sections: string[] = []
    const record = value as Record<string, unknown>
    const directAnswer = record.answer ?? record.directAnswer ?? record.tldr ?? record.tlDr ?? record.summary
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
    const pushSection = (title: string, content: unknown) => {
      if (content == null) return
      if (Array.isArray(content) && content.length === 0) return
      if (typeof content === 'string' && !content.trim()) return
      const body = Array.isArray(content)
        ? content.map(item => (typeof item === 'string' ? `- ${item}` : `- ${JSON.stringify(item)}`)).join('\n')
        : typeof content === 'string'
          ? content
          : JSON.stringify(content, null, 2)
      sections.push(`**${title}**\n${body}`.trim())
    }
    pushSection('Key findings', record.keyFindings)
    pushSection('Training implications', record.trainingImplications)
    pushSection('Limitations', record.limitations)
    if (!sections.length) {
      return JSON.stringify(value)
    }
    return sections.join('\n\n')
  }
  if (value == null) return ''
  return String(value)
}, z.string())

const EXPLAIN_SCHEMA = z.object({
  assistantMessage: ASSISTANT_MESSAGE_SCHEMA,
  citations: z.preprocess(
    value => {
      if (value == null) return []
      const normalized = (() => {
        if (Array.isArray(value)) return value
        if (typeof value === 'object') return [value]
        return []
      })()
      return normalized.filter(item => item && typeof item === 'object')
    },
    z.array(CITATION_SCHEMA).transform(items =>
      items
        .filter(item => item.marker && item.queryId && item.rowStart !== undefined && item.rowEnd !== undefined)
        .map(item => ({
          marker: item.marker as string,
          queryId: item.queryId as string,
          rowStart: item.rowStart as number,
          rowEnd: item.rowEnd as number,
          note: item.note,
        })),
    ),
  ),
  chartSpecs: z.preprocess(
    value => {
      if (Array.isArray(value)) return value
      return []
    },
    z.array(CHART_SCHEMA),
  ).optional(),
  followUps: z.preprocess(
    value => {
      if (value == null) return undefined
      if (Array.isArray(value)) return value
      if (typeof value === 'string' && value.trim()) return [value.trim()]
      return undefined
    },
    z.array(z.string()).optional(),
  ),
})

const FITNESS_GENERAL_SCHEMA = z.object({
  assistantMessage: ASSISTANT_MESSAGE_SCHEMA,
  followUps: z.preprocess(
    value => {
      if (value == null) return undefined
      if (Array.isArray(value)) return value
      if (typeof value === 'string' && value.trim()) return [value.trim()]
      return undefined
    },
    z.array(z.string()).optional(),
  ),
})

const resolveApiKey = () => process.env.OPENAI_API_KEY || process.env.GYM_CHAT_OPENAI_API_KEY || ''
const resolveApiBase = () => process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'
const resolveModel = () => process.env.GYM_CHAT_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'

export type LlmRequestError = Error & {
  isLlmError: true
  status?: number
  detail?: string
  retryable?: boolean
}

export const isLlmRequestError = (error: unknown): error is LlmRequestError =>
  Boolean(error && typeof error === 'object' && 'isLlmError' in error)

const buildLlmError = (
  message: string,
  info: { status?: number; detail?: string; retryable?: boolean },
): LlmRequestError => {
  const error = new Error(message) as LlmRequestError
  error.isLlmError = true
  error.status = info.status
  error.detail = info.detail
  error.retryable = info.retryable
  return error
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])
const MAX_LLM_ATTEMPTS = 3

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const extractJson = (content: string) => {
  const trimmed = content.trim()
  if (trimmed.startsWith('```')) {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) {
      return fenced[1].trim()
    }
  }
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }
  return trimmed
}

const callOpenAIJson = async <T>(
  schema: z.ZodType<T>,
  messages: OpenAIMessage[],
  temperature: number,
) => {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw buildLlmError('Missing OpenAI API key.', { status: 401, retryable: false })
  }
  const payload = JSON.stringify({
    model: resolveModel(),
    temperature,
    response_format: { type: 'json_object' },
    messages,
  })

  for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt += 1) {
    let response: Response
    try {
      response = await fetch(`${resolveApiBase()}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: payload,
      })
    } catch (error) {
      if (attempt < MAX_LLM_ATTEMPTS) {
        await sleep(200 * attempt)
        continue
      }
      const detail = error instanceof Error ? error.message : 'Network error'
      throw buildLlmError(`LLM request failed: ${detail}`, { retryable: true, detail })
    }

    if (!response.ok) {
      const detail = await response.text()
      const retryable = RETRYABLE_STATUS.has(response.status)
      if (retryable && attempt < MAX_LLM_ATTEMPTS) {
        await sleep(200 * attempt)
        continue
      }
      throw buildLlmError(`LLM request failed: ${detail}`, {
        status: response.status,
        detail,
        retryable,
      })
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content ?? ''
    const json = extractJson(content)
    try {
      const parsed = JSON.parse(json)
      return schema.parse(parsed)
    } catch (error) {
      throw buildLlmError('LLM response invalid.', {
        status: response.status,
        detail: error instanceof Error ? error.message : 'Invalid response format',
        retryable: false,
      })
    }
  }

  throw buildLlmError('LLM request failed.', { retryable: true })
}

export const classifyQuestion = async (messages: GymChatMessage[]) => {
  await loadGymCatalog().catch(() => undefined)
  const catalogContext = getCatalogContext()
  const recent = messages.slice(-6)
  const transcript = recent.map(message => `${message.role.toUpperCase()}: ${message.content}`).join('\n')
  const system: OpenAIMessage = {
    role: 'system',
    content:
      'You classify whether a user question is about the read-only gym analytics warehouse (tables prefixed gym_). ' +
      'Classify general fitness, programming, or goal-setting questions that do not require log analysis as fitness_general. ' +
      'Classify as gym_data when the user references their history, progress, recent sessions, specific lift stats, time windows, or asks for analysis of their logged workouts. ' +
      'If the user mixes recommendations with log-based analysis, choose gym_data. ' +
      `${catalogContext}\n\n${CAPABILITIES_CONTEXT}\n` +
      'Return JSON with: { "domain": "gym_data" | "fitness_general" | "other", "confidence": number, "clarifyingQuestion"?: string, "intentType"?: string, "primaryGrain"?: string, "targets"?: string[] }. ' +
      'intentType options: descriptive, trend, comparison, diagnostic, planning. ' +
      'primaryGrain options: set, session, week, month, all_time. ' +
      'targets is an array of nouns in the question (e.g., exercise, body_part, day_tag, equipment). ' +
      'If the question is ambiguous, set confidence < 0.8 and provide a clarifyingQuestion. ' +
      'Use the conversation context to interpret short follow-up questions. ' +
      'If it is clearly not about fitness or gym data, set domain to "other" with high confidence.',
  }
  const user: OpenAIMessage = {
    role: 'user',
    content: `Conversation context:\n${transcript}\n\nClassify the latest user question.`,
  }
  return callOpenAIJson(CLASSIFY_SCHEMA, [system, user], 0)
}

export const planGymSql = async (
  messages: GymChatMessage[],
  timezone: string,
  intentHints?: {
    intentType?: string
    primaryGrain?: string
    targets?: string[]
    template?: GymChatTemplateName
    secondaryTemplate?: GymChatTemplateName
  },
) => {
  await loadGymCatalog().catch(() => undefined)
  const catalogContext = getCatalogContext()
  const intentContextParts: string[] = []
  if (intentHints?.intentType) {
    intentContextParts.push(`intent_type=${intentHints.intentType}`)
  }
  if (intentHints?.primaryGrain) {
    intentContextParts.push(`primary_grain=${intentHints.primaryGrain}`)
  }
  if (intentHints?.targets?.length) {
    intentContextParts.push(`targets=${intentHints.targets.join(', ')}`)
  }
  if (intentHints?.template) {
    intentContextParts.push(`template=${intentHints.template}`)
  }
  if (intentHints?.secondaryTemplate) {
    intentContextParts.push(`secondary_template=${intentHints.secondaryTemplate}`)
  }
  const intentContext = intentContextParts.length
    ? `Intent hints:\n- ${intentContextParts.join('\n- ')}\n\n`
    : ''

  const templateContextParts: string[] = []
  const primaryTemplate = intentHints?.template ? TEMPLATES[intentHints.template] : undefined
  if (primaryTemplate) {
    templateContextParts.push(`Primary template: ${primaryTemplate.name} - ${primaryTemplate.description}`)
    templateContextParts.push(
      `Primary query blueprints:\n${primaryTemplate.queryBlueprints
        .map(blueprint => `- ${blueprint.role}: ${blueprint.mustMeasure}`)
        .join('\n')}`,
    )
  }
  const secondaryTemplate = intentHints?.secondaryTemplate ? TEMPLATES[intentHints.secondaryTemplate] : undefined
  if (secondaryTemplate) {
    templateContextParts.push(`Secondary template: ${secondaryTemplate.name} - ${secondaryTemplate.description}`)
    templateContextParts.push(
      `Secondary query blueprints:\n${secondaryTemplate.queryBlueprints
        .map(blueprint => `- ${blueprint.role}: ${blueprint.mustMeasure}`)
        .join('\n')}`,
    )
  }
  const templateContext = templateContextParts.length ? `Template hints:\n${templateContextParts.join('\n')}\n\n` : ''

  const system: OpenAIMessage = {
    role: 'system',
    content:
      'You are a SQL planner for a read-only gym analytics database. ' +
      'Follow all rules exactly and output JSON only.\n\n' +
      `${catalogContext}\n\n${CAPABILITIES_CONTEXT}\n\n` +
      `${intentContext}${templateContext}` +
      `Semantic hints:\n${SEMANTIC_HINTS}\n\n` +
      `Template options: ${Object.keys(TEMPLATES).join(', ')}.\n` +
      'Rules:\n' +
      '- Only generate SELECT statements (no UNION, no VALUES, no recursive CTEs).\n' +
      '- Use actual table and column names from the schema. Do not use SELECT *.\n' +
      '- All user-provided values must be parameterized with $1..$n placeholders and params array.\n' +
      '- Never embed literal filters (including LIKE/ILIKE patterns) for user terms. Build them via params (e.g., params: ["%shoulder%"], SQL: column ILIKE $1).\n' +
      "- For relative time windows, use CURRENT_DATE - ($1)::interval (never write INTERVAL $1).\n" +
      '- For body_parts analysis, use UNNEST(body_parts) AS body_part in the SELECT list and group by body_part (avoid set-returning functions in FROM). When filtering body_parts arrays, never call functions like ANY(body_parts); instead use EXISTS (SELECT 1 FROM unnest(body_parts) AS bp WHERE bp ILIKE $1) or body_parts @> ARRAY[$1::text].\n' +
      '- Default time windows: raw/set-level queries = last 90 days; trend/weekly/monthly = last 12 months.\n' +
      '- If the user explicitly asks for all-time or lifetime data, prepend the SQL with /*policy:time_window=all_time*/.\n' +
      '- Encourage multi-query plans when the question involves comparisons, diagnostics, or planning future adjustments.\n' +
      '- For fatigue / momentum / drop-off style questions, always add queries that compare early vs late sets within the same sessions (e.g., bucket set_number into thirds, compute deltas between first and last sets, track per-session cumulative volume) and pair them with weekly/monthly workload summaries so the explainer can call out where momentum fades.\n' +
      '- When the user references a specific exercise (e.g., incline press) and a future attempt or target, always include (a) a recent-window query filtered to that exercise (last 7 days/last block) and (b) a broader anchor query (e.g., last 12 months or all-time) capturing top sets, estimated 1RM, and recent bests.\n' +
      '- If a requested recent window is likely to be sparse, add a fallback query with a larger window instead of returning zero data; this ensures the explainer can still cite historical anchors while calling out the gap.\n' +
      '- Planning intent: summarize historical patterns (volume, frequency, balance) and surface gaps that inform future focus; extract concrete anchors such as latest top set weight, average working weight, and recent PRs so downstream reasoning can recommend next targets.\n' +
      '- Planning intent must still stay grounded in historical data, but you should surface the metrics that a coach would use to pick the next load (recent best set, last week average, rate of increase).\n' +
      '- If the user mixes requests for recommendations or future focus with data analysis, analyze the available data and note any gaps rather than refusing.\n' +
      `- Use timezone ${timezone} for date reasoning.\n` +
      '- If a template is a strong fit, set template and optional secondaryTemplate using the provided template options.\n' +
      'Only refuse when the question is clearly unrelated to the gym data.\n\n' +
      'Return JSON:\n' +
      '{ "queries": [{ "id": "q1", "purpose": "...", "sql": "SELECT ...", "params": [] }], "template"?: "...", "secondaryTemplate"?: "..." }\n' +
      'or { "refusal": { "message": "...", "reason": "..." } }',
  }

  const recentMessages = messages.slice(-12)
  const convo: OpenAIMessage[] = recentMessages.map(message => ({
    role: message.role,
    content: message.content,
  }))

  return callOpenAIJson(PLAN_SCHEMA, [system, ...convo], 0)
}

type ExplainInput = {
  question: string
  queries: GymChatQuery[]
  intentType?: string
  selectedTemplate?: GymChatTemplateName
  secondaryTemplate?: GymChatTemplateName
  explainChecklist?: string[]
  forceCitations?: boolean
}

export const explainGymResults = async (input: ExplainInput) => {
  const isDiagnosticMode = input.intentType === 'diagnostic' || input.selectedTemplate === 'momentum_dropoff'
  const planningGuidance =
    input.intentType === 'planning'
      ? 'Intent type = planning: propose concrete next targets grounded in historical anchors. Provide conservative vs aggressive options when possible, and cite the anchors used (recent top set, average working weight, recent PRs).'
      : ''

  const diagnosticGuidance = isDiagnosticMode
    ? 'Diagnostic mode: compare early vs late sets within-session when possible (use set_number buckets or similar proxies), quantify the drop-off (percent and/or absolute change) with citations, and if no drop-off is found, state that explicitly along with the proxy used.'
    : ''

  const checklistGuidance =
    input.explainChecklist && input.explainChecklist.length
      ? `Explain checklist (cover every bullet explicitly):\n- ${input.explainChecklist.join('\n- ')}`
      : ''
  const extraGuidance = [planningGuidance, diagnosticGuidance, checklistGuidance].filter(Boolean).join('\n')

  const system: OpenAIMessage = {
    role: 'system',
    content:
      'You are a careful gym data analyst. Use only the provided query results. ' +
      'Do not invent numbers. Any numeric claim must include citations like [q1]. ' +
      'If data is insufficient, explicitly state what is missing. ' +
      'When listing ranked items, default to the top 10 unless the user specifically requests more; mention that additional entries are available in the query details. ' +
      'When a query returns 5 rows or fewer, summarize them inline (e.g., a short table or bullet list) so the user does not need to open the query details. ' +
      `${CAPABILITIES_CONTEXT}\n` +
'Structure assistantMessage as plain conversational text. First paragraph must directly answer the question. Then use sections with headings in this order: Key findings, Training implications, Limitations. Do not output assistantMessage as JSON – use natural sentences and bullet lists instead. ' +
'Limit each section (especially Limitations) to observations that materially impact the specific topic asked. Never mention unrelated data gaps (e.g., body-part volume when the user asked about weekday frequency). If there is no meaningful limitation, explicitly say so instead of inventing one. ' +
'Only discuss metrics and implications that come directly from the provided queries; do not speculate about other measurements or recommend unrelated analyses unless the user explicitly asked for them. ' +
'If a relevant query returns zero rows, say so explicitly and invite the user to adjust their request or timeframe—never fill Key findings or Training implications with generic exercise advice. ' +
"When the user asks for a future workout/session/day, insert a 'Proposed session' subsection (before Training implications) that lists 4-6 exercises with sets/reps/load targets derived from the highest-volume or most recent rows in the queries, and cite each recommendation (e.g., '3x8 incline press at last week's top set 205 lb [q1]'). If data is sparse, build the proposal from the widest available window and note the gap under Limitations." +
'When intentType is planning, explicitly translate historical anchors into suggested next targets (e.g., +2.5-5 lb or the next available plate jump) and cite the anchors used. ' +
'Return JSON with assistantMessage (string), citations, optional chartSpecs, and optional followUps (array of natural-language questions the user could ask next). ' +
'Each followUp should be grounded in the available data (e.g., compare time periods, drill into a specific exercise, examine body parts). ' +
'Citations must map to query ids and row ranges.' +
(extraGuidance ? `\n${extraGuidance}` : '') +
(input.forceCitations
  ? '\nBe strict: if you include digits, include citations and ensure citations are non-empty.'
  : ''),
  }

  const user: OpenAIMessage = {
    role: 'user',
    content: JSON.stringify(
      {
        question: input.question,
        intentType: input.intentType ?? null,
        selectedTemplate: input.selectedTemplate ?? null,
        secondaryTemplate: input.secondaryTemplate ?? null,
        explainChecklist: input.explainChecklist ?? [],
        queries: input.queries.map(query => ({
          id: query.id,
          purpose: query.purpose,
          rowCount: query.rowCount,
          previewRows: query.previewRows.map((row, index) => ({ row: index, ...row })),
          error: query.error,
        })),
      },
      null,
      2,
    ),
  }

  return callOpenAIJson(EXPLAIN_SCHEMA, [system, user], 0.2) as Promise<{
    assistantMessage: string
    citations: GymChatCitation[]
    chartSpecs?: GymChatChartSpec[]
    followUps?: string[]
  }>
}

export const explainFitnessGeneral = async (messages: GymChatMessage[]) => {
  const recent = messages.slice(-8)
  const transcript = recent.map(message => `${message.role.toUpperCase()}: ${message.content}`).join('\n')
  const system: OpenAIMessage = {
    role: 'system',
    content:
      'You are a helpful strength coach providing general fitness guidance without using any logged data. ' +
      'Do not claim to have reviewed logs. Clearly separate general guidance from log-backed statements. ' +
      'Structure assistantMessage as plain text: first paragraph answers the question, then add a "General guidance" section with bullets, ' +
      'then a "Log-backed notes" section that explicitly states no workout history was reviewed and invites the user to ask for data-backed analysis if desired. ' +
      'You may include general numbers (sets/week, rep ranges, etc.) without citations, but avoid personalized claims about the user. ' +
      'Return JSON with assistantMessage and optional followUps (array of clarifying questions).',
  }
  const user: OpenAIMessage = {
    role: 'user',
    content: `Conversation context:\n${transcript}\n\nRespond to the latest user question.`,
  }

  return callOpenAIJson(FITNESS_GENERAL_SCHEMA, [system, user], 0.4) as Promise<{
    assistantMessage: string
    followUps?: string[]
  }>
}
