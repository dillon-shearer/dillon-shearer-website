'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  KOREADER_ACTIONS,
  prefetchKoreaderConnection,
  sendKoreaderCommand,
  warmKoreaderEndpoint,
  type KoreaderActionId,
} from '@/lib/koreader/client'
import { useKoreaderEndpoint } from './hooks/use-koreader-endpoint'
import { useScreenWakeLock } from './hooks/use-screen-wake-lock'

const INTRO_STORAGE_KEY = 'dwd:koreader:intro:v1'

type StatusState = {
  tone: 'idle' | 'success' | 'error'
  headline: string
  detail?: string
  timestamp?: string
  actionLabel?: string
  url?: string
}

const CTA_STATUS: StatusState = {
  tone: 'idle',
  headline: 'Click here to connect to KOReader',
}

const INITIAL_STATUS: StatusState = CTA_STATUS

export function KoreaderRemotePanel() {
  const { endpoint, hasEndpoint, inputValue, setInputValue, saveEndpoint, savedAt, isReady } =
    useKoreaderEndpoint()
  const [status, setStatus] = useState<StatusState>(INITIAL_STATUS)
  const [activeAction, setActiveAction] = useState<KoreaderActionId | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [hasUserInitiatedConnection, setHasUserInitiatedConnection] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const queueRef = useRef<KoreaderActionId[]>([])
  const processingRef = useRef(false)
  const activeActionRef = useRef<KoreaderActionId | null>(null)
  const connectionStatusRef = useRef<StatusState | null>(null)
  const connectionControllerRef = useRef<{
    handleFailure: (error: string) => void
    markConnected: (source: 'ping' | 'command') => void
    restart: () => void
  } | null>(null)
  const isConnectedRef = useRef(false)
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [initialCheckComplete, setInitialCheckComplete] = useState(false)
  useScreenWakeLock(true)

  function applyConnectionStatus(nextStatus: StatusState) {
    connectionStatusRef.current = nextStatus
    if (!processingRef.current && activeActionRef.current === null) {
      setStatus(nextStatus)
    }
  }

  function restoreConnectionStatus() {
    if (
      !isConnectedRef.current &&
      connectionStatusRef.current &&
      !processingRef.current &&
      activeActionRef.current === null
    ) {
      setStatus(connectionStatusRef.current)
    }
  }

  function markConnectedOptimistically() {
    const message: StatusState = {
      tone: 'success',
      headline: 'KOReader server detected',
    }
    connectionStatusRef.current = message
    if (!isConnectedRef.current) {
      isConnectedRef.current = true
      setIsConnected(true)
      if (!processingRef.current && activeActionRef.current === null) {
        setStatus(message)
      }
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasSeen = window.localStorage.getItem(INTRO_STORAGE_KEY) === 'seen'
    setIsPanelOpen(!hasSeen || !endpoint)
    setInitialCheckComplete(true)
  }, [endpoint, hasUserInitiatedConnection])

  useEffect(
    () => () => {
      if (prefetchTimerRef.current) {
        clearTimeout(prefetchTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (!endpoint) {
      connectionStatusRef.current = CTA_STATUS
      connectionControllerRef.current = null
      isConnectedRef.current = false
      if (!hasUserInitiatedConnection) {
        setStatus(CTA_STATUS)
      } else {
        setStatus({
          tone: 'error',
          headline: 'No endpoint configured',
          detail: 'Open Setup to add your Kindle IP & port.',
        })
      }
      return
    }

    if (!hasUserInitiatedConnection) {
      connectionStatusRef.current = CTA_STATUS
      connectionControllerRef.current = null
      isConnectedRef.current = false
      setStatus({
        tone: 'idle',
        headline: 'Click here to connect to KOReader',
      })
      return
    }

    let cancelled = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    let restartTimer: ReturnType<typeof setTimeout> | null = null
    let searchToken = 0
    const FALLBACK_DELAY_MS = 3000
    const QUICK_ATTEMPTS = 3
    const QUICK_DELAY_MS = 250

    const clearFallbackTimer = () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
        fallbackTimer = null
      }
    }

    const clearRestart = () => {
      if (restartTimer) {
        clearTimeout(restartTimer)
        restartTimer = null
      }
    }

    const nextToken = () => {
      searchToken += 1
      return searchToken
    }

    function markConnected(source: 'ping' | 'command') {
      if (cancelled) return
      clearFallbackTimer()
      clearRestart()
      nextToken()
      if (!isConnectedRef.current) {
        isConnectedRef.current = true
        setIsConnected(true)
        const message: StatusState = {
          tone: 'success',
          headline: 'KOReader server detected',
        }
        connectionStatusRef.current = message
        if (!processingRef.current && activeActionRef.current === null) {
          setStatus(message)
        }
      }
    }

    async function runQuickProbes(token: number): Promise<boolean> {
      for (let attempt = 0; attempt < QUICK_ATTEMPTS; attempt += 1) {
        try {
          const result = await warmKoreaderEndpoint(endpoint)
          if (cancelled || token !== searchToken) return false
          if (result.ok) {
            markConnected('ping')
            return true
          }
        } catch (error) {
          if (cancelled || token !== searchToken) return false
        }
        await new Promise((resolve) => setTimeout(resolve, QUICK_DELAY_MS))
      }
      return false
    }

    const pingEndpoint = async (token: number) => {
      const result = await warmKoreaderEndpoint(endpoint)
      if (cancelled || token !== searchToken) return
      if (result.ok) {
        markConnected('ping')
      } else {
        handleFailure(result.error)
      }
    }

    function startFallbackProbe(token: number) {
      applyConnectionStatus({
        tone: 'idle',
        headline: 'Searching for KOReader server…',
      })
      clearFallbackTimer()
      fallbackTimer = setTimeout(() => {
        if (!cancelled && !isConnectedRef.current && token === searchToken) {
          void pingEndpoint(token)
        }
      }, FALLBACK_DELAY_MS)
    }

    function startSearchCycle(delayMs = 0) {
      const launch = () => {
        const token = nextToken()
        isConnectedRef.current = false
        setIsConnected(false)
        void runQuickProbes(token).then((success) => {
          if (cancelled || token !== searchToken || isConnectedRef.current) return
          if (!success) {
            startFallbackProbe(token)
          }
        })
      }

      if (delayMs > 0) {
        clearRestart()
        restartTimer = setTimeout(() => {
          if (!cancelled) {
            launch()
          }
        }, delayMs)
      } else {
        launch()
      }
    }

    function handleFailure(errorMessage: string) {
      if (cancelled) return
      const wasConnected = isConnectedRef.current
      isConnectedRef.current = false
      setIsConnected(false)
      applyConnectionStatus({
        tone: 'error',
        headline: wasConnected ? 'Connection lost. Tap to reconnect.' : 'Server not found. Tap to retry.',
      })
      startSearchCycle(500)
    }

    startSearchCycle()
    connectionControllerRef.current = {
      handleFailure,
      markConnected: (source) => markConnected(source),
      restart: () => startSearchCycle(),
    }

    return () => {
      cancelled = true
      clearFallbackTimer()
      clearRestart()
      nextToken()
      connectionControllerRef.current = null
      if (prefetchTimerRef.current) {
        clearTimeout(prefetchTimerRef.current)
        prefetchTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, hasUserInitiatedConnection])

  useEffect(() => {
    function handleSwipe(event: Event) {
      const custom = event as CustomEvent<{ action: KoreaderActionId }>
      if (!custom.detail?.action) return
      void handleSend(custom.detail.action)
    }
    document.addEventListener('koreader-swipe', handleSwipe as EventListener)
    return () => document.removeEventListener('koreader-swipe', handleSwipe as EventListener)
  }, [handleSend])

  const formattedSavedAt = useMemo(() => {
    if (!savedAt) return null
    const date = new Date(savedAt)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }, [savedAt])

  async function processQueue() {
    if (processingRef.current) return
    processingRef.current = true
    while (queueRef.current.length > 0) {
      const actionId = queueRef.current.shift()!
      if (!hasEndpoint) {
        setStatus({
          tone: 'error',
          headline: 'No endpoint configured',
          detail: 'Open Setup to add your Kindle IP & port.',
        })
        continue
      }
      const action = KOREADER_ACTIONS[actionId]
      const timestamp = new Date().toISOString()
      setActiveAction(actionId)
      activeActionRef.current = actionId
      setStatus({
        tone: 'idle',
        headline: `Sending ${action.label}`,
        timestamp,
        actionLabel: action.label,
      })
      const result = await sendKoreaderCommand(endpoint, actionId)
      setActiveAction(null)
      activeActionRef.current = null

      if (result.ok) {
        if (connectionControllerRef.current) {
          connectionControllerRef.current.markConnected('command')
        } else {
          markConnectedOptimistically()
        }
        setStatus({
          tone: 'success',
          headline: `${action.label} sent`,
          timestamp,
          actionLabel: action.label,
          url: result.url,
        })
        schedulePrefetchHint(actionId)
      } else {
        setStatus({
          tone: 'error',
          headline: `Unable to send ${action.label}`,
          detail: result.error,
          timestamp,
          actionLabel: action.label,
          url: result.url,
        })
        connectionControllerRef.current?.handleFailure(result.error)
        queueRef.current = []
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
    processingRef.current = false
    restoreConnectionStatus()
  }

  async function handleSend(actionId: KoreaderActionId) {
    queueRef.current.push(actionId)
    processQueue()
  }

  function handleSave() {
    setIsSaving(true)
    const result = saveEndpoint()
    setTimeout(() => setIsSaving(false), 200)

    if (result.ok) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(INTRO_STORAGE_KEY, 'seen')
      }
      setIsPanelOpen(false)
    } else {
      console.error(result.error)
    }
  }

  function schedulePrefetchHint(latestAction: KoreaderActionId) {
    if (!endpoint) return
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current)
    }
    const delay = latestAction === 'next' ? 125 : 175
    prefetchTimerRef.current = setTimeout(() => {
      prefetchTimerRef.current = null
      void prefetchKoreaderConnection(endpoint)
    }, delay)
  }

  function closePanel() {
    setIsPanelOpen(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(INTRO_STORAGE_KEY, 'seen')
    }
  }

  function openPanelFromButton() {
    setIsPanelOpen(true)
  }

  function handleStatusClick() {
    if (!hasUserInitiatedConnection) {
      setHasUserInitiatedConnection(true)
      if (!hasEndpoint) {
        setStatus({
          tone: 'error',
          headline: 'No endpoint configured',
          detail: 'Open Setup to add your Kindle IP & port.',
        })
        setIsPanelOpen(true)
        return
      }
      setStatus({
        tone: 'idle',
        headline: 'Checking KOReader server…',
      })
      return
    }

    if (!isConnected) {
      setStatus({
        tone: 'idle',
        headline: 'Reconnecting to KOReader…',
      })
      connectionControllerRef.current?.restart()
    }
  }

  if (!initialCheckComplete) {
    return (
      <div className="flex h-full w-full items-center justify-center text-zinc-500">
        Loading…
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-center gap-8 px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div className="flex gap-4">
            <Link href="/" className="flex-1">
              <RemoteButtonNav label="← Home" helper="Back to site" />
            </Link>
            <button
              type="button"
              onClick={() => openPanelFromButton()}
              className="relative z-10 flex-1 pointer-events-auto"
            >
              <RemoteButtonNav label="Setup" helper="Instructions" />
            </button>
          </div>

          <div className="mt-2 flex w-full gap-3">
            <button
              type="button"
              onClick={() => handleSend('prev')}
              disabled={!hasEndpoint || activeAction !== null}
              className={`flex h-[60vh] w-1/5 flex-col items-center justify-center rounded-[36px] border px-2 py-4 text-zinc-50 transition ${
                activeAction === 'prev'
                  ? 'border-sky-400/80 bg-sky-500/15 shadow-[inset_0_0_30px_rgba(56,189,248,0.35)]'
                  : 'border-zinc-800/70 bg-zinc-900/80 hover:border-zinc-600 hover:bg-zinc-900'
              } disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900/30 disabled:text-zinc-500`}
              style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
            >
              <span className="text-2xl font-semibold tracking-wide">Previous</span>
            </button>
            <button
              type="button"
              onClick={() => handleSend('next')}
              disabled={!hasEndpoint || activeAction !== null}
              className={`flex h-[60vh] w-4/5 flex-col items-center justify-center rounded-[36px] border px-12 py-7 text-zinc-50 transition ${
                activeAction === 'next'
                  ? 'border-sky-400/80 bg-sky-500/15 shadow-[inset_0_0_30px_rgba(56,189,248,0.35)]'
                  : 'border-zinc-800/70 bg-zinc-900/80 hover:border-zinc-600 hover:bg-zinc-900'
              } disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900/30 disabled:text-zinc-500`}
            >
              <span className="text-3xl font-semibold tracking-wide">Next</span>
              <span className="mt-5 text-sm uppercase tracking-[0.4em] text-zinc-500">
                Advance to the next page
              </span>
            </button>
          </div>
          <StatusBar
            status={status}
            interactive={!isConnected}
            onClick={handleStatusClick}
          />
        </div>
      </div>

      {isPanelOpen ? (
        <SetupPanel
          inputValue={inputValue}
          setInputValue={setInputValue}
          formattedSavedAt={formattedSavedAt}
          isReady={isReady}
          isSaving={isSaving}
          onSave={handleSave}
          onClose={closePanel}
        />
      ) : null}
    </>
  )
}

function RemoteButtonNav({ label, helper }: { label: string; helper: string }) {
  return (
    <div className="flex h-16 flex-1 flex-col items-center justify-center rounded-[28px] border border-zinc-800/70 bg-zinc-900/80 text-zinc-50">
      <span className="text-base font-semibold tracking-wide">{label}</span>
      <span className="mt-1 text-xs uppercase tracking-[0.3em] text-zinc-500">{helper}</span>
    </div>
  )
}

function StatusBar({
  status,
  interactive = false,
  onClick,
}: {
  status: StatusState
  interactive?: boolean
  onClick?: () => void
}) {
  const toneClasses: Record<StatusState['tone'], string> = {
    idle: 'text-zinc-300 border-zinc-800',
    success: 'text-emerald-200 border-emerald-500/40 bg-emerald-500/10',
    error: 'text-rose-200 border-rose-500/40 bg-rose-500/10',
  }
  const message = status.detail ? `${status.headline} — ${status.detail}` : status.headline
  const interactiveProps = interactive
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick?.()
          }
        },
      }
    : {}
  return (
    <div
      className={`mt-4 rounded-2xl border px-4 py-3 text-sm transition ${
        toneClasses[status.tone]
      } ${
        interactive
          ? 'cursor-pointer hover:border-sky-500 hover:bg-zinc-900/50 active:bg-zinc-900/70 active:scale-[0.995] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500'
          : ''
      }`}
      {...interactiveProps}
    >
      <p className="font-semibold text-center">{message}</p>
    </div>
  )
}

type SetupPanelProps = {
  inputValue: string
  setInputValue: (value: string) => void
  formattedSavedAt: string | null
  isReady: boolean
  isSaving: boolean
  onSave: () => void
  onClose: () => void
}

function SetupPanel({
  inputValue,
  setInputValue,
  formattedSavedAt,
  isReady,
  isSaving,
  onSave,
  onClose,
}: SetupPanelProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/90 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-black p-6 text-zinc-50 shadow-2xl">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Setup &amp; Endpoint</h2>
          <p className="text-sm text-zinc-300 space-y-2">
            <span>
              1. Turn on the KOReader HTTP inspector, then toggle it on (default port is 8080 but it&apos;s listed there).<br />
              <span className="text-xs text-zinc-500">Menu path: fourth settings menu from the top-left (person + gear) → More tools → KOReader HTTP inspector.</span><br />
              <span className="text-xs text-zinc-500">Tip: enable “Auto start HTTP server” so it boots automatically next time.</span>
            </span><br />
            <span>
              2. Grab the Kindle IP: open Network info and copy the IP value.<br />
              <span className="text-xs text-zinc-500">Menu path: third settings menu from the top-left (gear icon) → Network → Network info.</span>
            </span><br />
            3. Enter the IP:Port below once; we store it only in this browser.<br />
            4. If your phone or tablet sleeps too quickly, bump the system screen-timeout so the remote stays visible.
          </p>
          <label className="block text-sm font-medium text-zinc-200">
            Kindle IP &amp; Port
            <input
              type="text"
              placeholder="192.168.1.67:8080"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              disabled={!isReady}
              className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none"
            />
          </label>
          <p className="text-xs text-zinc-500">
            {formattedSavedAt
              ? `Saved for this browser at ${formattedSavedAt}.`
              : 'Stored locally; no server ever sees it.'}
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || !isReady}
            className="flex-1 rounded-2xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {isSaving ? 'Saving…' : 'Save endpoint'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
