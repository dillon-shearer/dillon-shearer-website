'use client'

import { useCallback, useEffect, useState } from 'react'
import Typewriter from '@/app/components/Typewriter'

const SPLASH_STORAGE_KEY = 'dwdSplashSeen'
const SPLASH_COOKIE = `${SPLASH_STORAGE_KEY}=true`
const SPLASH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const typewriterLines = [
  '>>> import data_with_dillon as dwd',
  '',
  ">>> print('enjoy the builds - see you inside')",
  '',
  ">>> print('dillon shearer')",
]

function setSplashPersistence() {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SPLASH_STORAGE_KEY, 'true')
      document.cookie = `${SPLASH_COOKIE}; path=/; max-age=${SPLASH_COOKIE_MAX_AGE}`
    }
  } catch (err) {
    console.warn('Unable to persist splash dismissal', err)
  }
}

function hasSplashPersistence() {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false
    const cookieSeen = document.cookie.includes(SPLASH_STORAGE_KEY)
    const sessionSeen = window.sessionStorage.getItem(SPLASH_STORAGE_KEY) === 'true'
    const params = new URLSearchParams(window.location.search)
    const bypassParam = params.get('nosplash') === '1'
    return cookieSeen || sessionSeen || bypassParam
  } catch {
    return false
  }
}

export default function SplashOverlay() {
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (hasSplashPersistence()) {
      return
    }
    setVisible(true)
  }, [])

  const dismiss = useCallback(() => {
    setSplashPersistence()
    setVisible(false)
  }, [])

  useEffect(() => {
    if (!visible || !ready) return
    const timeout = window.setTimeout(dismiss, 15000)
    return () => window.clearTimeout(timeout)
  }, [visible, ready, dismiss])

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/90 text-white flex items-center justify-center px-6 py-8 z-50">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/70 shadow-2xl relative">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 text-xs uppercase tracking-wide text-white/70 hover:text-white"
        >
          Skip intro
        </button>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500/80" />
          <span className="inline-block w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="inline-block w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-sm text-white/70 font-mono">python</span>
        </div>
        <div className="px-6 py-8">
          <Typewriter
            lines={typewriterLines}
            cps={35}
            onDone={() => setReady(true)}
          />
          {ready && (
            <div className="mt-6 animate-fadeIn">
              <pre className="whitespace-pre-wrap font-mono text-emerald-400 mb-4">{'>>> '}proceed?</pre>
              <button
                type="button"
                onClick={dismiss}
                className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-white font-mono hover:bg-white/10 transition-all duration-200"
              >
                enter
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
