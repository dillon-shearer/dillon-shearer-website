'use client'

import { useEffect, useRef, useState } from 'react'
import NoSleep from 'nosleep.js'

type WakeLockType = 'screen'

type WakeLockSentinel = EventTarget & {
  released: boolean
  release(): Promise<void>
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request(type: WakeLockType): Promise<WakeLockSentinel>
  }
}

export type WakeLockState = {
  isSupported: boolean
  isActive: boolean
  usingFallback: boolean
  requiresUserInteraction: boolean
  error?: string
}

const INITIAL_STATE: WakeLockState = {
  isSupported: false,
  isActive: false,
  usingFallback: false,
  requiresUserInteraction: false,
}

/**
 * Keeps the screen awake while the remote is visible. Prefers the Screen Wake Lock API,
 * then falls back to the NoSleep.js technique (requires a user gesture to enable).
 */
export function useScreenWakeLock(shouldEnable: boolean): WakeLockState {
  const [state, setState] = useState<WakeLockState>(INITIAL_STATE)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const noSleepRef = useRef<NoSleep | null>(null)
  const fallbackActiveRef = useRef(false)
  const pointerListenerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    let cancelled = false
    const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorWithWakeLock) : undefined
    const supportsScreenWakeLock = Boolean(nav?.wakeLock)
    const fallbackAvailable = typeof window !== 'undefined'

    setState((prev) => ({
      ...prev,
      isSupported: supportsScreenWakeLock || fallbackAvailable,
      error: undefined,
    }))

    const handleRelease = () => {
      sentinelRef.current = null
      setState((prev) => ({
        ...prev,
        isActive: fallbackActiveRef.current,
        usingFallback: fallbackActiveRef.current,
      }))

      if (document.visibilityState === 'visible') {
        void requestScreenLock()
      }
    }

    const releaseResources = async () => {
      if (sentinelRef.current) {
        try {
          sentinelRef.current.removeEventListener('release', handleRelease)
          await sentinelRef.current.release()
        } catch (error) {
          console.warn('Failed to release wake lock', error)
        }
        sentinelRef.current = null
      }

      if (fallbackActiveRef.current && noSleepRef.current) {
        try {
          noSleepRef.current.disable()
        } catch (error) {
          console.warn('Failed to disable wake-lock fallback', error)
        }
        fallbackActiveRef.current = false
      }

      setState((prev) => ({
        ...prev,
        isActive: false,
        usingFallback: false,
        requiresUserInteraction: false,
      }))
    }

    const cleanupFallbackListener = () => {
      if (pointerListenerRef.current) {
        document.removeEventListener('pointerdown', pointerListenerRef.current)
        pointerListenerRef.current = null
      }
    }

    const requestFallback = async () => {
      if (!fallbackAvailable || fallbackActiveRef.current) return
      if (!noSleepRef.current) {
        noSleepRef.current = new NoSleep()
      }
      try {
        await noSleepRef.current.enable()
        fallbackActiveRef.current = true
        setState((prev) => ({
          ...prev,
          isActive: true,
          usingFallback: true,
          requiresUserInteraction: false,
          error: undefined,
        }))
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to enable wake-lock fallback.'
        setState((prev) => ({
          ...prev,
          error: message,
        }))
      }
    }

    const enableFallbackListener = () => {
      if (pointerListenerRef.current || !fallbackAvailable) return
      const handlePointer = () => {
        pointerListenerRef.current = null
        void requestFallback()
      }
      pointerListenerRef.current = handlePointer
      document.addEventListener('pointerdown', handlePointer, { once: true })
      setState((prev) => ({
        ...prev,
        requiresUserInteraction: true,
      }))
    }

    const requestScreenLock = async () => {
      if (!supportsScreenWakeLock || !shouldEnable) {
        if (!supportsScreenWakeLock) {
          enableFallbackListener()
        }
        return
      }

      if (sentinelRef.current) return
      try {
        const sentinel = await nav!.wakeLock!.request('screen')
        if (cancelled) {
          await sentinel.release()
          return
        }
        sentinelRef.current = sentinel
        sentinel.addEventListener('release', handleRelease)
        cleanupFallbackListener()
        setState((prev) => ({
          ...prev,
          isActive: true,
          usingFallback: false,
          requiresUserInteraction: false,
          error: undefined,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Wake-lock request failed.'
        console.warn('Screen wake-lock request failed', error)
        setState((prev) => ({
          ...prev,
          error: message,
        }))
        enableFallbackListener()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestScreenLock()
      }
    }

    if (!shouldEnable) {
      void releaseResources()
      return
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    void requestScreenLock()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cleanupFallbackListener()
      void releaseResources()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldEnable])

  return state
}
