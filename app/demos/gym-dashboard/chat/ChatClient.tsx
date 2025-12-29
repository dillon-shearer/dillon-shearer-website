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
  GymChatMessage,
  GymChatQuery,
  GymChatResponse,
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
}

type ChatClientProps = {
  embedded?: boolean
  onClose?: () => void
}

const STORAGE_KEY = 'gym-chat-history-v1'

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
      <h1 className={`mb-3 text-lg font-semibold ${headingColor}`} {...props} />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 className={`mb-3 text-base font-semibold ${headingColor}`} {...props} />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 className={`mb-2 text-sm font-semibold uppercase tracking-wide ${headingColor}`} {...props} />
    ),
    p: ({ node, ...props }: any) => (
      <p className={`mb-3 text-sm leading-relaxed ${textColor}`} {...props} />
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
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-xs text-white/80">
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
  value: '90 days' | '12 months' | 'all_time' | null | undefined,
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
    <details className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/80">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-white/70">
        Query details
      </summary>
      <div className="mt-4 space-y-4">
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
              <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/60 p-3 text-[11px] text-white/70">
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
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const searchParams = useSearchParams()
  const hasPrefilled = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as ChatMessage[]
      if (Array.isArray(parsed)) {
        setMessages(parsed)
      }
    } catch (error) {
      console.warn('Unable to load chat history.', error)
    }
  }, [])

  useEffect(() => {
    if (hasPrefilled.current) return
    const prompt = searchParams.get('prompt')
    if (prompt) {
      setInput(prompt)
      hasPrefilled.current = true
    }
  }, [searchParams])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

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
 
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])


  const handleSubmit = useCallback(
    async (overrideInput?: string) => {
      const rawInput = overrideInput ?? inputRef.current
      const trimmed = rawInput.trim()
      if (!trimmed || isLoading) return

      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      }

      const nextMessages = [...messages, userMessage]
      setMessages(nextMessages)
      setInput('')
      setIsLoading(true)

      try {
        const res = await fetch('/api/gym-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages.map(message => ({ role: message.role, content: message.content })),
            client: { timezone: buildTimezone() },
          }),
        })
        const data = (await res.json()) as GymChatResponse

        if (!res.ok) {
          throw new Error(data?.assistantMessage || 'Request failed.')
        }

        const assistantMessage: ChatMessage = {
          id: createMessageId(),
          role: 'assistant',
          content: data.assistantMessage,
          createdAt: new Date().toISOString(),
          queries: data.queries,
          citations: data.citations,
          chartSpecs: data.chartSpecs,
          followUps: data.followUps,
        }
        setMessages(current => [...current, assistantMessage])
      } catch (error) {
        const assistantMessage: ChatMessage = {
          id: createMessageId(),
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
          createdAt: new Date().toISOString(),
        }
        setMessages(current => [...current, assistantMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages],
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  const handleSuggestedQuestion = useCallback(
    (question: string) => {
      if (isLoading) return
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
      return (
        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[720px] rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'border-blue-400/40 bg-blue-500/10 text-white'
                : 'border-white/10 bg-black/40 text-white/90'
            }`}
          >
            <div className="text-sm leading-relaxed [&>*:last-child]:mb-0">
              <MarkdownContent
                content={message.content}
                role={message.role}
                anchorPrefix={anchorPrefix}
                queryIds={queryIds}
              />
            </div>
            {message.role === 'assistant' ? (
              <div className="mt-4 space-y-4">
                {renderCharts(message.chartSpecs, message.queries)}
                <QueryDetails queries={message.queries} anchorPrefix={anchorPrefix} />
                {message.followUps?.length ? (
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                      Follow-up ideas
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.followUps.map(followUp => (
                        <button
                          key={followUp}
                          type="button"
                          onClick={() => handleSuggestedQuestion(followUp)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-white/60 transition hover:border-white/25 hover:text-white/80"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )
    })
  }, [messages, handleSuggestedQuestion])

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
            onClick={() => setMessages([])}
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

      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        {showStart ? (
          <div className="flex h-full items-center justify-center">
            <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-black/50 p-6 text-center shadow-2xl shadow-black/40 backdrop-blur">
              <p className="text-lg font-semibold text-white">Gym Chat</p>
              <p className="mt-1 text-sm text-white/60">Ask anything about training.</p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTED_QUESTIONS.map(question => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => handleSuggestedQuestion(question)}
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/15"
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
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-end gap-2 rounded-full bg-black/40 px-3 py-2">
          <button
            type="button"
            disabled
            aria-label="Add attachment"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/40"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
              <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1z" />
            </svg>
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1 text-sm text-white/90 placeholder:text-white/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
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
