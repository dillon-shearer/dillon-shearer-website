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

  const sharedListClass = `${textColor} mb-2 ml-4 space-y-0.5 text-[13px]`

  return {
    h1: ({ node, ...props }: any) => (
      <h1 className={`mt-3 mb-2 text-base font-semibold ${headingColor}`} {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className={`mt-3 mb-2 text-sm font-semibold ${headingColor}`} {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 className={`mt-2 mb-1.5 text-xs font-semibold uppercase tracking-wide ${headingColor}`} {...props} />
    ),
    p: ({ node, ...props }: any) => (
      <p className={`text-[13px] leading-snug mb-0 ${textColor}`} {...props} />
    ),
    ul: ({ node, ...props }: any) => (
      <ul className={`list-disc ${sharedListClass}`} {...props} />
    ),
    ol: ({ node, ...props }: any) => (
      <ol className={`list-decimal ${sharedListClass}`} {...props} />
    ),
    li: ({ node, ...props }: any) => (
      <li className="pl-0.5" {...props} />
    ),
    strong: ({ node, ...props }: any) => <strong className="font-semibold text-white" {...props} />,
    em: ({ node, ...props }: any) => <em className={`${subtleColor} italic`} {...props} />,
    code: ({ inline, children, ...props }: any) =>
      inline ? (
        <code
          className="rounded-md bg-white/10 border border-white/20 px-1.5 py-0.5 text-[11px] text-white font-mono"
          {...props}
        >
          {children}
        </code>
      ) : (
        <pre className="mb-2 mt-2 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-[11px] text-white/80 font-mono scrollbar-hide">
          <code {...props}>{children}</code>
        </pre>
      ),
    blockquote: ({ node, ...props }: any) => (
      <blockquote
        className={`mb-2 border-l-2 border-[#54b3d6]/30 pl-3 text-[13px] italic ${textColor}`}
        {...props}
      />
    ),
    a: ({ node, children, href = '', ...props }: any) => {
      const isCitation = href.startsWith(`#${anchorPrefix}`)
      if (isCitation) {
        return (
          <a
            href={href}
            className="ml-1 inline-flex rounded-md border border-[#54b3d6]/40 bg-[#54b3d6]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#54b3d6] hover:bg-[#54b3d6]/20 transition-colors"
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
          className="font-semibold text-[#54b3d6] underline decoration-dotted underline-offset-2 hover:text-[#6dc5e8] transition-colors"
          {...props}
        >
          {children}
        </a>
      )
    },
    table: ({ node, className, ...props }: any) => (
      <div className="my-2 max-w-full overflow-x-auto rounded-lg border border-white/10 scrollbar-hide">
        <table
          {...props}
          className={['min-w-full text-[11px] text-white/80', className].filter(Boolean).join(' ')}
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
    return <p className="text-[11px] text-white/40">No rows returned.</p>
  }
  const headers = Object.keys(rows[0])
  return (
    <div className="max-w-full overflow-x-auto rounded-lg border border-white/10 scrollbar-hide">
      <table className="min-w-full text-[11px] text-white/80">
        <thead className="bg-white/[0.03] text-white/60">
          <tr>
            {headers.map(header => (
              <th key={header} className="px-2.5 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`row-${idx}`} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
              {headers.map(header => (
                <td key={`${idx}-${header}`} className="px-2.5 py-1.5 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
          <div key={`chart-${spec.queryId}-${spec.x}-${spec.y}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-white/20 transition-colors">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-white/40">
              {spec.title || 'Chart'}
            </div>
            <div className="h-40 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={180} minHeight={150}>
                {spec.type === 'bar' ? (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="x" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(0,0,0,0.95)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(8px)'
                      }}
                    />
                    <Bar dataKey="y" fill="rgba(84,179,214,0.6)" />
                  </BarChart>
                ) : (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="x" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(0,0,0,0.95)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        backdropFilter: 'blur(8px)'
                      }}
                    />
                    <Line type="monotone" dataKey="y" stroke="rgba(84,179,214,0.9)" strokeWidth={2} dot={false} />
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
    <details className="max-w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/80">
      <summary className="cursor-pointer text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 hover:text-white/60 transition-colors">
        Query details
      </summary>
      <div className="mt-3 max-w-full space-y-2.5 overflow-x-auto scrollbar-hide">
        {queries.map(query => (
          <div key={query.id} id={`${anchorPrefix}${query.id}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 hover:border-white/20 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold text-white">{query.id}</div>
                <div className="text-[10px] text-white/60">{query.purpose}</div>
              </div>
              <div className="text-right text-[10px] text-white/40 font-mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {query.error ? 'Error' : `${query.rowCount} rows`} · {query.durationMs}ms
              </div>
            </div>
            {query.error ? (
              <div className="mt-2 rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1.5 text-[10px] text-red-200">
                {query.error}
              </div>
            ) : null}
            <div className="mt-2 text-[10px] text-white/50 font-mono truncate">Params: {JSON.stringify(query.params)}</div>
            {query.policy ? (
              <div className="mt-1.5 text-[10px] text-white/40 font-mono">
                Policy: limit {query.policy.appliedLimit} rows · window {formatPolicyWindow(query.policy.appliedTimeWindow)}
              </div>
            ) : null}
            <details className="mt-2 text-[10px]">
              <summary className="cursor-pointer text-white/60 hover:text-white/80 transition-colors font-medium">Show SQL</summary>
              <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-white/10 bg-white/[0.02] p-2 text-[10px] text-white/70 font-mono scrollbar-hide">
                {query.sql}
              </pre>
            </details>
            <div className="mt-2">{renderPreviewTable(query.previewRows)}</div>
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
        content: '',
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
      let finalReceived = false
      let effectiveRequestId: string | undefined
      try {
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
    embedded ? 'p-4' : 'rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6',
  ].join(' ')

  const renderedMessages = useMemo(() => {
    return messages.map(message => {
      const anchorPrefix = `query-${message.id}-`
      const queryIds =
        message.role === 'assistant' ? new Set(message.queries?.map(query => query.id) ?? []) : new Set<string>()
      const isStatusMessage =
        message.role === 'assistant' &&
        !message.queries?.length &&
        !message.chartSpecs?.length &&
        !message.followUps?.length &&
        !message.retryPayload &&
        message.content.trim().length === 0
      if (isStatusMessage) return null
      return (
        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[90%] w-fit rounded-xl text-sm ${
              isStatusMessage
                ? 'px-3 py-1.5'
                : 'px-2.5 py-1 leading-snug'
            } ${
              message.role === 'user'
                ? 'bg-[#54b3d6]/20 border border-[#54b3d6]/40 text-white shadow-lg shadow-[#54b3d6]/10'
                : 'bg-white/[0.03] border border-white/10 text-white/90'
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
              <div className="mt-3 space-y-3">
                {renderCharts(message.chartSpecs, message.queries)}
                <QueryDetails queries={message.queries} anchorPrefix={anchorPrefix} />
                {message.retryPayload ? (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-200/80 mb-2">
                      Response interrupted
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-amber-100/70">
                        Retry the last message without losing context.
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleSubmit(message.retryPayload, { retryRequestId: message.retryRequestId })
                        }
                        disabled={isLoading}
                        className="rounded-lg border border-amber-300/50 bg-amber-400/20 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-100 transition-all hover:border-amber-200/70 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-60 active:scale-95 whitespace-nowrap self-start"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : null}
                {message.followUps?.length ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/40 mb-2">
                      Follow-up ideas
                    </div>
                    <div className="flex flex-wrap gap-1.5">
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
                              'rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
                              isUsed
                                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                                : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-[#54b3d6]/30 hover:bg-white/[0.05] hover:text-white/80',
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
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#54b3d6]/10 border border-[#54b3d6]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#54b3d6] animate-pulse" />
            <span className="text-[11px] font-bold text-[#54b3d6] uppercase tracking-wider">Gym Chat</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chat"
              title="Close"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white active:scale-95"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
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
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-all hover:border-white/30 hover:bg-white/[0.05] hover:text-white active:scale-95"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
              <path d="M7 2a1 1 0 0 0-1 1v1H4.5a1 1 0 1 0 0 2h11a1 1 0 1 0 0-2H14V3a1 1 0 0 0-1-1H7zm1 3h4V4H8v1zm-1 4a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1zm4 0a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H12a1 1 0 0 1-1-1zm-2 3a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H10a1 1 0 0 1-1-1z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative mt-3 min-h-0 flex-1 overflow-hidden">
        {/* Scroll to top button - shown when not at top */}
        {!showStart && scrollPosition !== 'top' && (
          <button
            type="button"
            onClick={() => scrollToTop()}
            aria-label="Scroll to top"
            className="absolute left-1/2 top-2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-sm text-white/70 shadow-lg transition-all hover:border-white/20 hover:bg-white/[0.05] hover:text-white active:scale-95"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
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
            className="absolute bottom-2 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-sm text-white/70 shadow-lg transition-all hover:border-white/20 hover:bg-white/[0.05] hover:text-white active:scale-95"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
              <path d="M10 14a1 1 0 0 1-.7-.3l-4-4a1 1 0 1 1 1.4-1.4l3.3 3.3 3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-.7.3z" />
            </svg>
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-x-hidden overflow-y-auto pr-1 scrollbar-hide [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]"
        >
          {showStart ? (
            <div className="flex h-full items-center justify-center p-3">
              <div className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center shadow-xl">
                <div className="mb-2">
                  <div className="inline-flex items-center gap-2 mb-2 px-2.5 py-1 rounded-full bg-[#54b3d6]/10 border border-[#54b3d6]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#54b3d6] animate-pulse" />
                    <span className="text-[10px] font-medium text-[#54b3d6] uppercase tracking-wider">AI Powered</span>
                  </div>
                </div>
                <p className="text-base font-bold text-white mb-1">Gym Chat</p>
                <p className="text-xs text-white/60 mb-4">Ask anything about your training data</p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTED_QUESTIONS.map(question => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleSuggestedQuestion(question)}
                      className="group relative w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left text-xs font-medium text-white/80 transition-all hover:border-[#54b3d6]/30 hover:bg-white/[0.04] hover:text-white active:scale-[0.98] overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#54b3d6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative">{question}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {renderedMessages}
              {isLoading ? (
                <div className="flex justify-start">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-[#54b3d6]" style={{ animationDelay: '0ms' }} />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-[#54b3d6]"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-[#54b3d6]"
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

      <div className="sticky bottom-0 z-10 mt-3 shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 shadow-lg hover:border-white/20 focus-within:border-[#54b3d6]/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your training..."
              rows={1}
              className="max-h-24 w-full resize-none overflow-hidden border-0 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-0"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#54b3d6] text-black transition-all hover:bg-[#6dc5e8] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#54b3d6] shadow-lg shadow-[#54b3d6]/20 active:scale-95"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
              <path d="M4.5 10a1 1 0 0 1 1-1h7.1L10.8 6.2a1 1 0 1 1 1.4-1.4l4.2 4.2a1 1 0 0 1 0 1.4l-4.2 4.2a1 1 0 1 1-1.4-1.4L12.6 11H5.5a1 1 0 0 1-1-1z" />
            </svg>
          </button>
        </div>
        <div className="mt-1.5 text-[10px] text-white/30 text-center">
          Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}
