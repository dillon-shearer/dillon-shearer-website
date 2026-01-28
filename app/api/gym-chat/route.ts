import { randomUUID } from 'crypto'

import { NextResponse } from 'next/server'
import { createClient, createPool } from '@vercel/postgres'

import { getCatalogContext, loadGymCatalog } from '@/lib/gym-chat/catalog'
import { getCapabilitiesContext } from '@/lib/gym-chat/capabilities'
import { SEMANTIC_HINTS } from '@/lib/gym-chat/semantics'
import {
  MAX_PREVIEW_ROWS,
  QUERY_TIMEOUT_MS,
  validateAndRewriteSql,
} from '@/lib/gym-chat/sql-policy'
import {
  runGymChatConversation,
  isLlmRequestError,
  type OpenAIMessage,
  type OpenAITool,
} from '@/lib/gym-chat/llm'
import type {
  GymChatConversationState,
  GymChatMessage,
  GymChatQuery,
  GymChatResponse,
} from '@/types/gym-chat'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_DURATION_MS = maxDuration * 1000
const MIN_LLM_RETRY_WINDOW_MS = 16000

const EXECUTE_GYM_QUERY_TOOL: OpenAITool = {
  type: 'function',
  function: {
    name: 'execute_gym_query',
    description:
      "Execute one or more read-only SQL queries against the gym workout database. Returns query results with rows of data. Use this whenever you need actual workout data to answer the user's question.",
    parameters: {
      type: 'object',
      properties: {
        queries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique query ID (q1, q2, q3, etc.)',
              },
              purpose: {
                type: 'string',
                description: 'Brief description of what this query measures',
              },
              sql: {
                type: 'string',
                description: 'A SELECT-only SQL query following the SQL rules in the system prompt',
              },
              params: {
                type: 'array',
                items: {},
                description: 'Array of parameterized values matching $1, $2, etc. placeholders in the SQL',
              },
            },
            required: ['id', 'purpose', 'sql', 'params'],
          },
          description:
            'One or more SQL queries to execute. Use multiple queries for comparisons, multi-metric analysis, or when you need different aggregations.',
        },
      },
      required: ['queries'],
    },
  },
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

const formatCellValue = (value: unknown) => {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return Number(value)
  if (value && typeof value === 'object') return JSON.stringify(value)
  return value
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

const buildSystemPrompt = (timezone: string): string => {
  const catalogContext = getCatalogContext()
  const capabilities = getCapabilitiesContext()
  const semanticHints = SEMANTIC_HINTS

  return `You are a gym data analyst chatbot. You help users understand their workout history by querying a read-only PostgreSQL database of gym workout logs.

## Your Capabilities
- Answer questions about the user's workout history, exercise data, PRs, volume, trends, body part balance, and more
- Provide general fitness and strength training advice (no database query needed)
- Generate workout plans grounded in the user's historical data
- Handle multi-turn conversations naturally, remembering context from earlier in the conversation

## Database Schema
${catalogContext}

## Metric Definitions & Data Scope
${capabilities}

## SQL Query Patterns
When you need to query the database, use the execute_gym_query tool. Here are common SQL patterns:
${semanticHints}

## Tool Results Format (Read Carefully)
When you call execute_gym_query, the tool returns JSON:
{ "queries": [ { "id": "q1", "purpose": "...", "rowCount": 123, "rows": [ ... ], "error": null | "..." } ] }

- rows contains at most 20 preview rows; rowCount is the full count.
- Never cite a query with a non-null error.
- If rowCount is 0, say so explicitly and suggest a narrower/wider timeframe or a different exercise name.

## SQL Rules (CRITICAL - follow exactly)
- Only generate SELECT statements. No INSERT, UPDATE, DELETE, DROP, ALTER, CREATE.
- No UNION, VALUES, or recursive CTEs.
- Use actual table and column names from the schema. Never use SELECT *.
- Do not schema-qualify table names (no public.gym_lifts -- use gym_lifts directly).
- All user-provided values MUST be parameterized with $1..$n placeholders and params array.
- Never embed literal filters including LIKE/ILIKE patterns. Use params (e.g., params: ["%bench%"], SQL: exercise ILIKE $1).
- For relative time windows: use CURRENT_DATE - ($1)::interval (never INTERVAL $1).
- Do NOT use FILTER aggregates or explicit window frames (ROWS BETWEEN / RANGE BETWEEN). Use CASE expressions and default window frames instead.
- For body_parts: use UNNEST(body_parts) AS body_part in SELECT and GROUP BY. Filter with EXISTS (SELECT 1 FROM unnest(body_parts) AS bp WHERE bp ILIKE $1).
- Default time windows: set-level queries = last 90 days; trend/weekly/monthly = last 12 months. The system will enforce these if you omit date filters.
- For all-time queries: prepend /*policy:time_window=all_time*/ before the SELECT.
- Prefer a shared sets CTE: WITH sets AS (SELECT exercise, weight, reps, COALESCE(date::date, timestamp::date) AS session_date, COALESCE(timestamp::timestamptz, date::timestamptz) AS performed_at FROM gym_lifts)\n- When you use the sets CTE, ONLY reference the sets alias in outer queries (never gym_lifts.* outside the CTE).\n- Apply date filters in the sets CTE; do not repeat them in the outer query unless you are using sets.session_date.
- Default row limit: 200. Hard limit: 1000. For "top N" questions, use ORDER BY + LIMIT N.
- Query timeout is 2 seconds per query.

## Tool-Use Policy
- Only call execute_gym_query when data is required to answer the question.
- Do NOT call the tool for general fitness advice or out-of-scope questions.
- If you need multiple metrics/comparisons, put them in one tool call (multiple queries).

## Response Format
- Write conversational, natural language responses
- When citing data from queries, use markers like [q1], [q2] inline with the text
- For numeric claims, always cite the query that produced them
- If data is insufficient, say what's missing rather than guessing
- Structure longer responses with: direct answer first, then Key Findings, Training Implications, and Limitations sections
- When listing ranked items, default to top 10 unless user asks for more
- If a query returns 5 rows or fewer, summarize inline (table or bullet list)
- For simple scalar questions, keep responses to 1-2 sentences
- End responses with a "**Follow-up questions:**" section containing 2-4 suggested questions the user could copy and ask you next. Phrase each question as if the USER is asking YOU (e.g., "How has my bench press progressed?" or "What are my top sets for squats?"). NEVER phrase them as the assistant asking the user (no "Do you want...", "Would you like...", "Shall I...", "Can I show you...").
- Only discuss metrics and implications from the provided query data. Do not speculate.

## Output Rules (Strict)
- Do NOT output JSON. Respond in natural language.
- Put citations inline right after the claim (e.g., "... 12 sets [q1]").
- If you ask a clarifying question, still end with a "**Follow-up questions:**" section (2-4 items).

## Conversation Guidelines
- You have full conversation history. Use it to understand pronouns ("that exercise", "the set after that"), follow-ups, and context.
- If the user asks about a specific exercise or date mentioned earlier, reference it naturally.
- If a question is ambiguous, ask for clarification rather than guessing wrong.
- For general fitness questions that don't need data, respond directly without querying.
- For questions clearly unrelated to fitness or gym data, politely redirect.
- When the user asks for comparisons, run multiple queries to compare the periods/exercises.
- If a query returns no data, tell the user and suggest adjusting the timeframe or exercise name.

## Timezone
Use timezone ${timezone} for all date reasoning.

## Important
- Never invent data or numbers. Every numeric claim must come from a query result.
- If you're unsure about the user's intent, ask a clarifying question instead of running a bad query.
- You can run multiple queries in a single tool call to answer complex questions.
- If a query fails, explain the error in plain English and offer to retry with a fix.`
}

const normalizeConversationState = (value: unknown): GymChatConversationState => {
  if (!value || typeof value !== 'object') return {}
  const state = value as GymChatConversationState
  const messages = Array.isArray(state.messages)
    ? state.messages.filter(entry => entry && entry.role && typeof entry.content === 'string')
    : undefined
  const sessionId = typeof state.sessionId === 'string' ? state.sessionId : undefined
  return { sessionId, messages }
}

const buildConversationMessages = (history: GymChatConversationState['messages']): OpenAIMessage[] => {
  if (!history?.length) return []
  return history
    .filter(entry => entry.role === 'user' || entry.role === 'assistant' || entry.role === 'tool')
    .map(entry => ({
      role: entry.role,
      content: entry.content,
      tool_call_id: entry.tool_call_id,
      tool_calls: entry.tool_calls,
    }))
}

const trimConversationMessages = (messages: OpenAIMessage[]) => {
  const withoutSystem = messages.filter(message => message.role !== 'system')
  if (withoutSystem.length <= 50) return withoutSystem
  const head = withoutSystem.slice(0, 2)
  const tail = withoutSystem.slice(-46)
  return [...head, ...tail]
}

const executeToolCall = async (
  queries: Array<{ id: string; purpose: string; sql: string; params: unknown[] }>,
  connection: { url: string; fallback: boolean } | null,
): Promise<GymChatQuery[]> => {
  const executed: GymChatQuery[] = []
  if (!queries.length) return executed

  if (!connection) {
    for (const query of queries) {
      executed.push({
        id: query.id,
        purpose: query.purpose,
        sql: query.sql,
        params: query.params ?? [],
        rowCount: 0,
        durationMs: 0,
        previewRows: [],
        error: 'Missing read-only database connection.',
      })
    }
    return executed
  }

  if (connection.fallback) {
    console.warn('GYM_CHAT_DATABASE_URL_READONLY missing; falling back to default connection in development.')
  }

  const usePool = connection.url.includes('-pooler.')
  const runWithClient = async (client: Queryable) => {
    for (const query of queries) {
      try {
        const policy = validateAndRewriteSql(query.sql, query.params ?? [])
        const result = await executeQuery(client, policy.sql, policy.params)
        executed.push({
          id: query.id,
          purpose: query.purpose,
          sql: policy.sql,
          params: policy.params,
          rowCount: result.rowCount,
          durationMs: result.durationMs,
          previewRows: result.rows.slice(0, MAX_PREVIEW_ROWS),
          error: 'error' in result && result.error ? result.error : null,
          policy: {
            appliedLimit: policy.appliedLimit,
            appliedTimeWindow: policy.appliedTimeWindow,
          },
        })
      } catch (error) {
        executed.push({
          id: query.id,
          purpose: query.purpose,
          sql: query.sql,
          params: query.params ?? [],
          rowCount: 0,
          durationMs: 0,
          previewRows: [],
          error: error instanceof Error ? error.message : 'Query validation failed.',
          policy: undefined,
        })
      }
    }
  }

  if (usePool) {
    const pool = createPool({ connectionString: connection.url })
    const client = await pool.connect()
    try {
      await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`)
      await client.query('SET default_transaction_read_only = on')
      await runWithClient(client)
    } finally {
      client.release()
      await pool.end()
    }
    return executed
  }

  const client = createClient({ connectionString: connection.url })
  await client.connect()
  try {
    await client.query(`SET statement_timeout = ${QUERY_TIMEOUT_MS}`)
    await client.query('SET default_transaction_read_only = on')
    await runWithClient(client)
  } finally {
    await client.end()
  }

  return executed
}

export async function POST(req: Request) {
  const requestIdHeader = req.headers.get('x-request-id')?.trim()
  const requestId =
    requestIdHeader && requestIdHeader.length <= 128 ? requestIdHeader : randomUUID()
  const startedAt = Date.now()
  const wantsStream =
    req.headers.get('accept')?.includes('text/event-stream') || req.headers.get('x-stream') === '1'

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

  const resolveErrorType = (status?: number) => {
    if (!status) return 'unknown'
    if (status === 503) return 'upstream'
    if (status === 504) return 'timeout'
    if (status >= 500) return 'internal'
    if (status >= 400) return 'bad_request'
    return 'unknown'
  }

  const llmRetryBudget = {
    remainingMs: () => Math.max(0, MAX_DURATION_MS - (Date.now() - startedAt)),
    minRetryWindowMs: MIN_LLM_RETRY_WINDOW_MS,
  }

  const respond = (body: GymChatResponse, init?: { status?: number }) => {
    if (wantsStream) {
      const status = init?.status
      if (status && status >= 400) {
        sendError(body.assistantMessage, resolveErrorType(status))
      } else {
        sendFinal(body)
      }
      return null
    }
    const headers = { 'x-request-id': requestId }
    return NextResponse.json(body, { ...(init ?? {}), headers })
  }

  const respondError = (message: string, status = 500) =>
    respond(
      {
        assistantMessage: message,
        citations: [],
        queries: [],
      },
      { status },
    )

  const run = async () => {
    sendStatus('started', 'Starting request...')

    let payload: {
      messages?: GymChatMessage[]
      client?: { timezone?: string }
      conversationState?: GymChatConversationState | null
    }
    try {
      payload = (await req.json()) as {
        messages?: GymChatMessage[]
        client?: { timezone?: string }
        conversationState?: GymChatConversationState | null
      }
    } catch {
      return respondError('Invalid request payload.', 400)
    }

    const clientMessages = normalizeMessages(payload.messages ?? [])
    const question = extractLatestUserQuestion(clientMessages)
    if (!question) {
      return respondError('Missing user question.', 400)
    }

    const timezone = payload.client?.timezone ?? 'UTC'

    sendStatus('catalog', 'Loading workout catalog...')
    await loadGymCatalog().catch(() => undefined)

    const systemPrompt = buildSystemPrompt(timezone)
    const conversationState = normalizeConversationState(payload.conversationState)
    const history = buildConversationMessages(conversationState.messages)
    const openaiMessages: OpenAIMessage[] = [...history, { role: 'user', content: question }]

    const connection = resolveReadonlyConnection()

    try {
      const result = await runGymChatConversation({
        systemPrompt,
        messages: openaiMessages,
        tools: [EXECUTE_GYM_QUERY_TOOL],
        executeQueries: async queries => ({
          queries: await executeToolCall(queries, connection),
        }),
        onStatus: sendStatus,
        options: { budget: llmRetryBudget },
      })

      const updatedState: GymChatConversationState = {
        sessionId: conversationState.sessionId ?? randomUUID(),
        messages: trimConversationMessages(openaiMessages).map(message => ({
          role: message.role === 'system' ? 'assistant' : message.role,
          content: message.content ?? '',
          tool_call_id: message.tool_call_id,
          tool_calls: message.tool_calls,
        })),
      }

      const response: GymChatResponse = {
        assistantMessage: result.assistantMessage,
        citations: result.citations,
        queries: result.queries,
        chartSpecs: result.chartSpecs,
        followUps: result.followUps,
        conversationState: updatedState,
      }

      return respond(response)
    } catch (error) {
      if (isLlmRequestError(error)) {
        return respondError(error.message, error.status ?? 502)
      }
      const message = error instanceof Error ? error.message : 'Request failed.'
      return respondError(message, 500)
    }
  }

  if (!wantsStream) {
    return run()
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller
      if (pendingEvents.length) {
        for (const payload of pendingEvents) {
          controller.enqueue(encoder.encode(payload))
        }
        pendingEvents.length = 0
      }
      if (shouldCloseStream) {
        controller.close()
        streamController = null
        return
      }
      void run().catch(error => {
        const message = error instanceof Error ? error.message : 'Request failed.'
        sendError(message, resolveErrorType(500))
      })
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-request-id': requestId,
    },
  })
}

