'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type {
  GymChatCitation,
  GymChatChartSpec,
  GymChatConversationState,
  GymChatMessage,
  GymChatQuery,
  GymChatResponse,
  GymChatTimeWindow,
} from '@/types/gym-chat'
import type { Components } from 'react-markdown'

type ChatMessage = {
  id: string
  role: GymChatMessage['role']
  content: string
  createdAt: string
  queries?: GymChatQuery[]
  citations?: GymChatCitation[]
  chartSpecs?: GymChatChartSpec[]
  followUps?: string[]
  retryPayload?: string
  retryRequestId?: string
}

type ChatClientProps = {
  embedded?: boolean
  onClose?: () => void
}

const SUGGESTED_QUESTIONS = [
  'What was my weekly training volume over the last 12 months?',
  'How many sessions did I log in the last 8 weeks?',
  'Which exercises had the most total sets in the last 90 days?',
  'Show my top 5 highest-weight sets from the last 90 days.',
]

const createMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const buildTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const CITATION_REGEX = /\[([a-zA-Z0-9_-]+)\](?!\()/g
const STREAM_STATUS_MESSAGES: Record<string, string> = {
  started: 'Starting request...',
  catalog: 'Loading workout catalog...',
  classify: 'Classifying your question...',
  plan: 'Planning queries...',
  repair: 'Fixing query plan...',
  query: 'Running queries...',
  explain: 'Generating response...',
}

const getStreamStatusMessage = (payload: { stage?: string; message?: string }) => {
  if (payload.message) return payload.message
  if (payload.stage && payload.stage in STREAM_STATUS_MESSAGES) {
    return STREAM_STATUS_MESSAGES[payload.stage]
  }
  return 'Working...'
}

const mergeHistory = (
  existing?: GymChatConversationState['history'],
  incoming?: GymChatConversationState['history'],
) => {
  if (!incoming?.length) return existing ?? []
  if (!existing?.length) return incoming
  const next = [...existing]
  const indexById = new Map(existing.map((entry, index) => [entry.id, index]))
  for (const entry of incoming) {
    const existingIndex = indexById.get(entry.id)
    if (existingIndex === undefined) {
      indexById.set(entry.id, next.length)
      next.push(entry)
      continue
    }
    const prior = next[existingIndex]
    next[existingIndex] = {
      ...prior,
      ...entry,
      scope: entry.scope ?? prior.scope,
      analysisKind: entry.analysisKind ?? prior.analysisKind,
      analysisTopic: entry.analysisTopic ?? prior.analysisTopic,
      intent: entry.intent ?? prior.intent,
    }
  }
  return next
}

const mergeConversationState = (
  prev: GymChatConversationState,
  incoming?: GymChatConversationState | null,
) => {
  if (!incoming) return prev
  if (prev.sessionId && incoming.sessionId && prev.sessionId !== incoming.sessionId) {
    return incoming
  }
  const merged: GymChatConversationState = { ...prev, ...incoming }
  const mergedHistory = mergeHistory(prev.history, incoming.history)
  if (mergedHistory.length) {
    merged.history = mergedHistory
  }
  return merged
}

const readEventStream = async (
  response: Response,
  onEvent: (event: { event: string; data: any }) => void,
) => {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Streaming response missing body.')
  }
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let boundaryMatch = buffer.match(/\r?\n\r?\n/)
    while (boundaryMatch) {
      const boundaryIndex = boundaryMatch.index ?? 0
      const boundaryLength = boundaryMatch[0].length
      const chunk = buffer.slice(0, boundaryIndex)
      buffer = buffer.slice(boundaryIndex + boundaryLength)
      if (!chunk.trim()) {
        boundaryMatch = buffer.match(/\r?\n\r?\n/)
        continue
      }
      const lines = chunk.split(/\r?\n/)
      let event = 'message'
      const dataLines: string[] = []
      for (const line of lines) {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim()
          continue
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim())
        }
      }
      if (dataLines.length) {
        const dataText = dataLines.join('\n')
        let data: any
        try {
          data = JSON.parse(dataText)
        } catch {
          data = dataText
        }
        onEvent({ event, data })
      }
      boundaryMatch = buffer.match(/\r?\n\r?\n/)
    }
  }
}

const formatContentWithCitations = (content: string, queryIds: Set<string>, anchorPrefix: string) => {
  if (!queryIds.size) return content
  return content.replace(CITATION_REGEX, (match, marker) => {
    if (!queryIds.has(marker)) return match
    return `[\\[${marker}\\]](#${anchorPrefix}${marker})`
  })
}

const buildMarkdownComponents = (role: GymChatMessage['role'], anchorPrefix: string): Components => {
  const textColor = role === 'user' ? 'text-white' : 'text-white/90'
  const headingColor = role === 'user' ? 'text-white' : 'text-white'
  const subtleColor = role === 'user' ? 'text-white/80' : 'text-white/70'

  const sharedListClass = `${textColor} mb-3 ml-5 space-y-1 text-sm`

  return {
    h1: ({ node, ...props }: any) => (
      <h1 className={`mt-4 mb-3 text-lg font-semibold ${headingColor}`} {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className={`mt-4 mb-3 text-base font-semibold ${headingColor}`} {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 className={`mt-3 mb-2 text-sm font-semibold uppercase tracking-wide ${headingColor}`} {...props} />
    ),
    p: ({ node, ...props }: any) => (
      <p className={`text-sm leading-snug ${textColor}`} {...props} />
    ),
    ul: ({ node, ...props }: any) => (
      <ul className={`list-disc ${sharedListClass}`} {...props} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol className={`list-decimal ${sharedListClass}`} {...props} />
    ),
    li: ({ node, ...props }: any) => (
      <li className="pl-1" {...props} />
    ),
    strong: ({ node, ...props }: any) => <strong className="font-semibold text-white" {...props} />,
    em: ({ node, ...props }: any) => <em className={`${subtleColor} italic`} {...props} />,
    code: ({ inline, children, ...props }: any) =>
      inline ? (
        <code
          className="rounded-lg bg-white/10 px-1.5 py-0.5 text-[0.85em] text-white"
          {...props}
        >
          {children}
        </code>
      ) : (
        <pre className="mb-3 mt-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-3 text-xs text-white/80">
          <code {...props}>{children}</code>
        </pre>
      ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote
        className={`mb-3 border-l-2 border-white/20 pl-4 text-sm italic ${textColor}`}
        {...props}
      />
    ),
    a: ({ node, children, href = '', ...props }: any) => {
      const isCitation = href.startsWith(`#${anchorPrefix}`)
      if (isCitation) {
        return (
          <a
            href={href}
            className="ml-1 inline-flex rounded-full border border-blue-400/40 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-200"
            {...props}
          >
            {children}
          </a>
        )
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-blue-300 underline decoration-dotted underline-offset-4"
          {...props}
        >
          {children}
        </a>
      )
    },
    table: ({ node, className, ...props }: any) => (
      <div className="my-3 max-w-full overflow-x-auto rounded-xl border border-white/10">
        <table
          {...props}
          className={['min-w-full text-xs text-white/80', className].filter(Boolean).join(' ')}
        />
      </div>
    ),
  }
}

const MarkdownContent = ({
  content,
  role,
  anchorPrefix,
  queryIds,
}: {
  content: string
  role: GymChatMessage['role']
  anchorPrefix: string
  queryIds: Set<string>
}) => {
  const formatted = formatContentWithCitations(content, queryIds, anchorPrefix)
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildMarkdownComponents(role, anchorPrefix)}>
      {formatted}
    </ReactMarkdown>
  )
}

const renderPreviewTable = (rows: Record<string, unknown>[]) => {
  if (!rows.length) {
    return <p className="text-xs text-white/50">No rows returned.</p>
  }
  const headers = Object.keys(rows[0])
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-white/10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <table className="min-w-full text-xs text-white/80">
        <thead className="bg-white/5 text-white/70">
          <tr>
            {headers.map(header => (
              <th key={header} className="px-3 py-2 text-left font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`row-${idx}`} className="border-t border-white/5">
              {headers.map(header => (
                <td key={`${idx}-${header}`} className="px-3 py-2">
                  {row[header] == null ? '—' : String(row[header])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const formatPolicyWindow = (
  value: GymChatTimeWindow | null | undefined,
) => {
  if (value === 'all_time') return 'all time'
  if (!value) return 'not applied'
  return value
}

const renderCharts = (chartSpecs: GymChatChartSpec[] | undefined, queries: GymChatQuery[] | undefined) => {
  if (!chartSpecs?.length || !queries?.length) return null

  const queryById = new Map(queries.map(query => [query.id, query]))

  return (
    <div className="space-y-4">
      {chartSpecs.map(spec => {
        const query = queryById.get(spec.queryId)
        if (!query?.previewRows?.length) return null
        const data = query.previewRows
          .map(row => {
            const xVal = row[spec.x]
            const yVal = Number(row[spec.y])
            if (xVal == null || Number.isNaN(yVal)) return null
            return {
              x: xVal,
              y: yVal,
            }
          })
          .filter(Boolean) as Array<{ x: unknown; y: number }>

        if (!data.length) return null

        return (
          <div key={`chart-${spec.queryId}-${spec.x}-${spec.y}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
              {spec.title || 'Chart'}
            </div>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={200}>
                {spec.type === 'bar' ? (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="x" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)' }} />
                    <Bar dataKey="y" fill="rgba(59,130,246,0.6)" />
                  </BarChart>
                ) : (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="x" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)' }} />
                    <Line type="monotone" dataKey="y" stroke="rgba(34,197,94,0.8)" strokeWidth={2} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const QueryDetails = ({ queries, anchorPrefix }: { queries?: GymChatQuery[]; anchorPrefix: string }) => {
  if (!queries?.length) return null

  return (
    <details className="max-w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/80">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-white/70">
        Query details
      </summary>
      <div className="mt-4 max-w-full space-y-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {queries.map(query => (
          <div key={query.id} id={`${anchorPrefix}${query.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-white">{query.id}</div>
                <div className="text-white/60">{query.purpose}</div>
              </div>
              <div className="text-right text-[11px] text-white/50">
                {query.error ? 'Error' : `${query.rowCount} rows`} · {query.durationMs}ms
              </div>
            </div>
            {query.error ? (
              <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                {query.error}
              </div>
            ) : null}
            <div className="mt-3 text-[11px] text-white/60">Params: {JSON.stringify(query.params)}</div>
            {query.policy ? (
              <div className="mt-2 text-[11px] text-white/50">
                Policy: limit {query.policy.appliedLimit} rows · window {formatPolicyWindow(query.policy.appliedTimeWindow)}
              </div>
            ) : null}
            <details className="mt-3 text-[11px]">
              <summary className="cursor-pointer text-white/70">Show SQL</summary>
              <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-black/60 p-3 text-[11px] text-white/70 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {query.sql}
              </pre>
            </details>
            <div className="mt-3">{renderPreviewTable(query.previewRows)}</div>
          </div>
        ))}
      </div>
    </details>
  )
}

export default function ChatClient({ embedded = false, onClose }: ChatClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  const [scrollPosition, setScrollPosition] = useState<'top' | 'middle' | 'bottom'>('bottom')
  const [usedFollowUps, setUsedFollowUps] = useState<Set<string>>(() => new Set())
  const [conversationState, setConversationState] = useState<GymChatConversationState>({})
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const lastAssistantMessageIdRef = useRef<string | null>(null)
  const inputRef = useRef('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const searchParams = useSearchParams()
  const hasPrefilled = useRef(false)

  useEffect(() => {
    if (hasPrefilled.current) return
    const prompt = searchParams.get('prompt')
    if (prompt) {
      setInput(prompt)
      hasPrefilled.current = true
    }
  }, [searchParams])

  useEffect(() => {
    inputRef.current = input
  }, [input])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    const computed = window.getComputedStyle(textarea)
    const lineHeight = Number.parseFloat(computed.lineHeight || '20')
    const paddingTop = Number.parseFloat(computed.paddingTop || '0')
    const paddingBottom = Number.parseFloat(computed.paddingBottom || '0')
    const maxHeight = lineHeight * 4 + paddingTop + paddingBottom
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${nextHeight}px`
  }, [input])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: 0, behavior })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const isNearTop = el.scrollTop < 80
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setScrollPosition(isNearTop ? 'top' : isNearBottom ? 'bottom' : 'middle')
    // Always keep auto-scroll enabled (user wants "always scroll to bottom")
    if (!autoScrollEnabled) {
      setAutoScrollEnabled(true)
    }
  }, [autoScrollEnabled])

  // Update scroll position on mount and when messages change
  useEffect(() => {
    handleScroll()
  }, [messages, handleScroll])

  useEffect(() => {
    const latestAssistant = [...messages].reverse().find(message => message.role === 'assistant')
    if (!latestAssistant) {
      lastAssistantMessageIdRef.current = null
      return
    }
    if (lastAssistantMessageIdRef.current === latestAssistant.id) return
    lastAssistantMessageIdRef.current = latestAssistant.id
    scrollToBottom()
  }, [messages, scrollToBottom])

  const scrollToBottomSoon = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      if (!scrollContainerRef.current) return
      requestAnimationFrame(() => {
        scrollToBottom(behavior)
      })
    },
    [scrollToBottom],
  )

  const handleSubmit = useCallback(
    async (overrideInput?: string, options?: { retryRequestId?: string }) => {
      const rawInput = overrideInput ?? inputRef.current
      const trimmed = rawInput.trim()
      if (!trimmed || isLoading) return

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      }

      const assistantMessageId = createMessageId()
      const assistantPlaceholder: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: 'Working on it...',
        createdAt: new Date().toISOString(),
      }
      const outgoingMessages = [...messages, userMessage]
      const nextMessages = [...outgoingMessages, assistantPlaceholder]
      setMessages(nextMessages)
      setInput('')
      setIsLoading(true)
      setAutoScrollEnabled(true)
      scrollToBottomSoon('auto')

      const updateAssistantMessage = (patch: Partial<ChatMessage>) => {
        setMessages(current =>
          current.map(message => (message.id === assistantMessageId ? { ...message, ...patch } : message)),
        )
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined
      let stillWorkingTimeout: ReturnType<typeof setTimeout> | undefined
      let finalReceived = false
      let statusSeen = false
      let effectiveRequestId: string | undefined
      try {
        stillWorkingTimeout = setTimeout(() => {
          if (!finalReceived && !statusSeen) {
            updateAssistantMessage({ content: 'Still working...' })
          }
        }, 4000)
        const controller = new AbortController()
        const timeoutMs = 60000
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          accept: 'text/event-stream',
          'x-stream': '1',
        }
        if (options?.retryRequestId) {
          headers['x-request-id'] = options.retryRequestId
        }
        const fetchPromise = fetch('/api/gym-chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: outgoingMessages.map(message => ({ role: message.role, content: message.content })),
            client: { timezone: buildTimezone() },
            conversationState,
          }),
          signal: controller.signal,
        })
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort()
            reject(new Error('This is taking longer than usual. Please try again.'))
          }, timeoutMs)
        })
        const res = (await Promise.race([fetchPromise, timeoutPromise])) as Response
        const requestId = res.headers.get('x-request-id') || undefined
        effectiveRequestId = requestId ?? options?.retryRequestId
        if (effectiveRequestId) {
          console.info(`[gym-chat] request id ${effectiveRequestId}`)
        }

        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('text/event-stream')) {
          await readEventStream(res, event => {
            if (event.event === 'status') {
              statusSeen = true
              updateAssistantMessage({
                content: getStreamStatusMessage(event.data ?? {}),
              })
              return
            }
            if (event.event === 'final') {
              finalReceived = true
              const data = event.data as GymChatResponse
              const assistantMessage =
                data && typeof data.assistantMessage === 'string'
                  ? data.assistantMessage
                  : 'Response completed without content.'
              updateAssistantMessage({
                content: assistantMessage,
                queries: data?.queries,
                citations: data?.citations,
                chartSpecs: data?.chartSpecs,
                followUps: data?.followUps,
                retryPayload: undefined,
                retryRequestId: undefined,
              })
              if (data?.conversationState) {
                setConversationState(prev => mergeConversationState(prev, data.conversationState))
              }
              return
            }
            if (event.event === 'error') {
              finalReceived = true
              const message =
                event.data && typeof event.data.message === 'string'
                  ? event.data.message
                  : 'Request failed.'
              updateAssistantMessage({
                content: message,
                retryPayload: trimmed,
                retryRequestId: effectiveRequestId,
              })
            }
          })
          if (!finalReceived) {
            updateAssistantMessage({
              content: 'The response stopped early. Please retry your last message.',
              retryPayload: trimmed,
              retryRequestId: effectiveRequestId,
            })
          }
          return
        }

        const data = (await res.json()) as GymChatResponse

        if (!res.ok) {
          throw new Error(data?.assistantMessage || 'Request failed.')
        }

        finalReceived = true
        setConversationState(prev => mergeConversationState(prev, data.conversationState))
        updateAssistantMessage({
          content: data.assistantMessage,
          queries: data.queries,
          citations: data.citations,
          chartSpecs: data.chartSpecs,
          followUps: data.followUps,
          retryPayload: undefined,
          retryRequestId: undefined,
        })
      } catch (error) {
        updateAssistantMessage({
          content: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
          retryPayload: trimmed,
          retryRequestId: effectiveRequestId ?? options?.retryRequestId,
        })
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
        if (stillWorkingTimeout) clearTimeout(stillWorkingTimeout)
        setIsLoading(false)
      }
    },
    [isLoading, messages, conversationState, scrollToBottomSoon],
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  const handleSuggestedQuestion = useCallback(
    (question: string, sourceId?: string) => {
      if (isLoading) return
      if (sourceId) {
        const followUpKey = `${sourceId}::${question}`
        setUsedFollowUps(current => {
          if (current.has(followUpKey)) return current
          const next = new Set(current)
          next.add(followUpKey)
          return next
        })
      }
      void handleSubmit(question)
    },
    [handleSubmit, isLoading],
  )

  const containerClasses = [
    'flex h-full flex-col text-white',
    embedded ? 'p-4' : 'rounded-3xl border border-white/10 bg-white/5 p-6',
  ].join(' ')

  const renderedMessages = useMemo(() => {
    return messages.map(message => {
      const anchorPrefix = `query-${message.id}-`
      const queryIds =
        message.role === 'assistant' ? new Set(message.queries?.map(query => query.id) ?? []) : new Set<string>()
      // Status messages are short assistant messages without queries/charts (e.g., "Planning SQL", "Running queries...")
      const isStatusMessage = message.role === 'assistant' && !message.queries?.length && !message.chartSpecs?.length && message.content.length < 50
      return (
        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[85%] w-fit rounded-2xl text-sm ${
              isStatusMessage
                ? 'px-3 py-1.5'
                : 'px-3 py-2 leading-relaxed'
            } ${
              message.role === 'user'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-white/90'
            }`}
          >
            {isStatusMessage ? (
              <span>{message.content}</span>
            ) : (
              <div className="[&>*:last-child]:mb-0 [&>*:first-child]:mt-0">
                <MarkdownContent
                  content={message.content}
                  role={message.role}
                  anchorPrefix={anchorPrefix}
                  queryIds={queryIds}
                />
              </div>
            )}
            {message.role === 'assistant' && !isStatusMessage ? (
              <div className="mt-4 space-y-4">
                {renderCharts(message.chartSpecs, message.queries)}
                <QueryDetails queries={message.queries} anchorPrefix={anchorPrefix} />
                {message.retryPayload ? (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-100/70">
                      Response interrupted
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-xs text-amber-100/80">
                        Retry the last message without losing context.
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleSubmit(message.retryPayload, { retryRequestId: message.retryRequestId })
                        }
                        disabled={isLoading}
                        className="rounded-full border border-amber-300/50 bg-amber-400/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : null}
                {message.followUps?.length ? (
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                      Follow-up ideas
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.followUps.map(followUp => {
                        const followUpKey = `${message.id}::${followUp}`
                        const isUsed = usedFollowUps.has(followUpKey)
                        return (
                          <button
                            key={followUp}
                            type="button"
                            onClick={() => handleSuggestedQuestion(followUp, message.id)}
                            disabled={isUsed}
                            aria-disabled={isUsed}
                            className={[
                              'rounded-full border px-3 py-1 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-60',
                              isUsed
                                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100/80'
                                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/25 hover:text-white/80',
                            ].join(' ')}
                          >
                            {followUp}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )
    })
  }, [messages, handleSuggestedQuestion, handleSubmit, isLoading, usedFollowUps])

  const showStart = messages.length === 0

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white/80">Gym Chat</p>
        <div className="flex items-center gap-2">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chat"
              title="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-white/30 hover:text-white"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                <path d="M5.3 4.3a1 1 0 0 1 1.4 0L10 7.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 9l3.3 3.3a1 1 0 1 1-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 1 1-1.4-1.4L8.6 9 5.3 5.7a1 1 0 0 1 0-1.4z" />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setMessages([])
              setConversationState({})
            }}
            aria-label="Clear chat history"
            title="Clear"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 transition hover:border-white/30 hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
              <path d="M7 2a1 1 0 0 0-1 1v1H4.5a1 1 0 1 0 0 2h11a1 1 0 1 0 0-2H14V3a1 1 0 0 0-1-1H7zm1 3h4V4H8v1zm-1 4a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1zm4 0a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H12a1 1 0 0 1-1-1zm-2 3a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H10a1 1 0 0 1-1-1z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden">
        {/* Scroll to top button - shown when not at top */}
        {!showStart && scrollPosition !== 'top' && (
          <button
            type="button"
            onClick={() => scrollToTop()}
            aria-label="Scroll to top"
            className="absolute left-1/2 top-2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-white/5 text-white/70 shadow-lg transition hover:bg-white/10 hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
              <path d="M10 6a1 1 0 0 1 .7.3l4 4a1 1 0 1 1-1.4 1.4L10 8.4l-3.3 3.3a1 1 0 1 1-1.4-1.4l4-4A1 1 0 0 1 10 6z" />
            </svg>
          </button>
        )}

        {/* Scroll to bottom button - shown when not at bottom */}
        {!showStart && scrollPosition !== 'bottom' && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            aria-label="Scroll to bottom"
            className="absolute bottom-2 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-white/5 text-white/70 shadow-lg transition hover:bg-white/10 hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
              <path d="M10 14a1 1 0 0 1-.7-.3l-4-4a1 1 0 1 1 1.4-1.4l3.3 3.3 3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-.7.3z" />
            </svg>
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-x-hidden overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {showStart ? (
            <div className="flex h-full items-center justify-center">
              <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-gray-800 p-6 text-center shadow-2xl shadow-black/40">
                <p className="text-lg font-semibold text-white">Gym Chat</p>
                <p className="mt-1 text-sm text-white/60">Ask anything about training.</p>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SUGGESTED_QUESTIONS.map(question => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleSuggestedQuestion(question)}
                      className="w-full rounded-2xl border border-white/10 bg-gray-700/50 px-4 py-3 text-left text-sm font-semibold text-white/90 transition hover:border-white/30 hover:bg-gray-700"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {renderedMessages}
              {isLoading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" style={{ animationDelay: '0ms' }} />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-4 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent pb-0 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-2xl bg-gray-700/50 px-3 py-2 shadow-lg">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="max-h-32 w-full resize-none overflow-hidden border-0 bg-transparent text-sm text-white/90 placeholder:text-white/50 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
              <path d="M4.5 10a1 1 0 0 1 1-1h7.1L10.8 6.2a1 1 0 1 1 1.4-1.4l4.2 4.2a1 1 0 0 1 0 1.4l-4.2 4.2a1 1 0 1 1-1.4-1.4L12.6 11H5.5a1 1 0 0 1-1-1z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

