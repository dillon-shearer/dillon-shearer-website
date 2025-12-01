'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  KOREADER_ACTIONS,
  sendKoreaderCommand,
  warmKoreaderEndpoint,
  type KoreaderActionId,
} from '@/lib/koreader/client'
import { useKoreaderEndpoint } from './hooks/use-koreader-endpoint'

const INTRO_STORAGE_KEY = 'dwd:koreader:intro:v1'

type StatusState = {
  tone: 'idle' | 'success' | 'error'
  headline: string
  detail?: string
  timestamp?: string
  actionLabel?: string
  url?: string
}

const INITIAL_STATUS: StatusState = {
  tone: 'idle',
  headline: 'Waiting for a command',
  detail: 'Tap Next or Previous (or swipe) to control KOReader.',
}

export function KoreaderRemotePanel() {
  const { endpoint, hasEndpoint, inputValue, setInputValue, saveEndpoint, savedAt, isReady } =
    useKoreaderEndpoint()
  const [status, setStatus] = useState<StatusState>(INITIAL_STATUS)
  const [activeAction, setActiveAction] = useState<KoreaderActionId | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const queueRef = useRef<KoreaderActionId[]>([])
  const processingRef = useRef(false)

  const [initialCheckComplete, setInitialCheckComplete] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasSeen = window.localStorage.getItem(INTRO_STORAGE_KEY) === 'seen'
    setIsPanelOpen(!hasSeen || !endpoint)
    setInitialCheckComplete(true)
  }, [endpoint])

  useEffect(() => {
    if (!endpoint) return
    setStatus({
      tone: 'idle',
      headline: 'Warming connection…',
      detail: 'Pinging KOReader so commands send instantly.',
    })
    warmKoreaderEndpoint(endpoint)
    const timer = setInterval(() => warmKoreaderEndpoint(endpoint), 5000)
    return () => clearInterval(timer)
  }, [endpoint])

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
      setStatus({
        tone: 'idle',
        headline: `Sending ${action.label}`,
        detail: 'Command is being dispatched to KOReader.',
        timestamp,
        actionLabel: action.label,
      })
      const result = await sendKoreaderCommand(endpoint, actionId)
      setActiveAction(null)

      if (result.ok) {
        setStatus({
          tone: 'success',
          headline: `${action.label} sent`,
          detail: 'If you are on the same LAN, the Kindle should react immediately.',
          timestamp,
          actionLabel: action.label,
          url: result.url,
        })
      } else {
        setStatus({
          tone: 'error',
          headline: `Unable to send ${action.label}`,
          detail: result.error,
          timestamp,
          actionLabel: action.label,
          url: result.url,
        })
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
    processingRef.current = false
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

  function closePanel() {
    setIsPanelOpen(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(INTRO_STORAGE_KEY, 'seen')
    }
  }

  function openPanelFromButton(force = false) {
    if (!hasEndpoint || force) {
      setIsPanelOpen(true)
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
            <button type="button" onClick={openPanelFromButton} className="flex-1">
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
          <StatusBar status={status} />
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

function StatusBar({ status }: { status: StatusState }) {
  const toneClasses: Record<StatusState['tone'], string> = {
    idle: 'text-zinc-300 border-zinc-800',
    success: 'text-emerald-200 border-emerald-500/40 bg-emerald-500/10',
    error: 'text-rose-200 border-rose-500/40 bg-rose-500/10',
  }
  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${toneClasses[status.tone]}`}>
      <p className="font-semibold">{status.headline}</p>
      {status.detail ? <p className="text-xs opacity-80">{status.detail}</p> : null}
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
        <p className="text-sm text-zinc-300">
          1. Enable KOReader&apos;s HTTP remote server.<br />
          2. Note the IP &amp; port shown on the Kindle.<br />
          3. Enter it once below. We store it in this browser.<br />
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
