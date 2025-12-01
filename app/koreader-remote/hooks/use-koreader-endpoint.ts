'use client'

import { useCallback, useEffect, useState } from 'react'
import { KOREADER_STORAGE_KEY } from '@/lib/koreader/client'

type SaveResult =
  | {
      ok: true
      value: string
    }
  | {
      ok: false
      error: string
    }

export function useKoreaderEndpoint() {
  const [endpoint, setEndpoint] = useState<string>('')
  const [inputValue, setInputValue] = useState<string>('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const hasEndpoint = Boolean(endpoint.trim())

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = window.localStorage.getItem(KOREADER_STORAGE_KEY)
    if (stored) {
      setEndpoint(stored)
      setInputValue(stored)
    }

    setIsReady(true)
  }, [])

  const saveEndpoint = useCallback((): SaveResult => {
    if (typeof window === 'undefined') {
      return {
        ok: false,
        error: 'Window is not available.',
      }
    }

    const trimmed = inputValue.trim()
    if (!trimmed) {
      return {
        ok: false,
        error: 'Enter the Kindle IP and port before saving.',
      }
    }

    try {
      window.localStorage.setItem(KOREADER_STORAGE_KEY, trimmed)
      setEndpoint(trimmed)
      setSavedAt(new Date().toISOString())

      return {
        ok: true,
        value: trimmed,
      }
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save endpoint. Confirm localStorage is available.',
      }
    }
  }, [inputValue])

  return {
    endpoint,
    hasEndpoint,
    inputValue,
    setInputValue,
    saveEndpoint,
    savedAt,
    isReady,
  }
}
