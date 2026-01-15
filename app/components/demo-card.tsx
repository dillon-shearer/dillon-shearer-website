'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Demo } from '@/types/demo'

interface DemoCardProps {
  demo: Demo
  onSeeMore: () => void
  index: number
}

export default function DemoCard({ demo, onSeeMore, index }: DemoCardProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const hasMarkedLoaded = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobileViewport(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Centralized function to mark as loaded (prevents double-firing)
  const markAsLoaded = useCallback(() => {
    if (hasMarkedLoaded.current) return
    hasMarkedLoaded.current = true
    // Small delay for React hydration inside iframe
    setTimeout(() => setIframeLoaded(true), 300)
  }, [])

  // Multiple detection strategies for bulletproof loading
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    // Strategy 1: Native load event via addEventListener
    const handleLoad = () => markAsLoaded()
    iframe.addEventListener('load', handleLoad)

    // Strategy 2: Check if already loaded (cached/fast load)
    // The iframe may have loaded before this effect runs
    if (iframe.contentWindow) {
      try {
        // Same-origin check - if we can access it, check readyState
        const doc = iframe.contentDocument || iframe.contentWindow.document
        if (doc && (doc.readyState === 'complete' || doc.readyState === 'interactive')) {
          markAsLoaded()
        }
      } catch {
        // Cross-origin - can't check, rely on load event
      }
    }

    // Strategy 3: Polling fallback - check periodically
    // This catches edge cases where load event doesn't fire
    const pollInterval = setInterval(() => {
      if (hasMarkedLoaded.current) {
        clearInterval(pollInterval)
        return
      }
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc && (doc.readyState === 'complete' || doc.readyState === 'interactive')) {
          markAsLoaded()
          clearInterval(pollInterval)
        }
      } catch {
        // Cross-origin - keep polling until load event fires
      }
    }, 500)

    // Strategy 4: Maximum wait fallback - show content after 5 seconds no matter what
    const maxWaitTimeout = setTimeout(() => {
      if (!hasMarkedLoaded.current) {
        markAsLoaded()
      }
    }, 5000)

    return () => {
      iframe.removeEventListener('load', handleLoad)
      clearInterval(pollInterval)
      clearTimeout(maxWaitTimeout)
    }
  }, [markAsLoaded])

  const mobileOrderClass = demo.mobileReady ? 'order-first md:order-none' : ''
  const exploreHref = demo.slug === 'koreader-remote' ? '/koreader-remote' : `/demos/${demo.slug}`
  const previewBase = demo.demoUrl ?? exploreHref
  const queryJoiner = previewBase.includes('?') ? '&' : '?'
  const previewSrc = `${previewBase}${queryJoiner}embed=1&nosplash=1`
  const mobileBlocked = !demo.mobileReady && isMobileViewport

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-[#0c1424] text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-gray-700 ${mobileOrderClass}`}
    >
      <div className="relative h-[200px] w-full overflow-hidden rounded-t-2xl bg-black sm:h-[240px] md:h-[280px]">
        {/* Loading skeleton - shows until iframe loads */}
        {!iframeLoaded && (
          <div className="absolute inset-0 z-10 flex animate-pulse items-center justify-center bg-gray-800/80">
            <span className="text-sm text-gray-400">Loading preview...</span>
          </div>
        )}

        {/* Live iframe preview - always rendered, lazy loaded */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="origin-top scale-[0.22] transition-transform duration-500 ease-out sm:scale-[0.26] md:scale-[0.3]">
            <iframe
              ref={iframeRef}
              src={previewSrc}
              title={`${demo.title} live preview`}
              tabIndex={-1}
              aria-hidden="true"
              loading={index < 2 ? 'eager' : 'lazy'}
              className="h-[900px] w-[1440px] border-0 shadow-2xl"
              style={{ pointerEvents: 'none' }}
              onLoad={markAsLoaded}
            />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <Link
          href={exploreHref}
          className={`absolute inset-0 z-10 flex items-end justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
            mobileBlocked ? 'pointer-events-none opacity-0' : 'opacity-0 hover:opacity-100 focus-visible:opacity-100'
          }`}
          aria-label={`Open ${demo.title} demo`}
          tabIndex={mobileBlocked ? -1 : 0}
        >
          <span className="mb-3 mr-3 rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white backdrop-blur">
            Open demo
          </span>
        </Link>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-blue-200/80">Demo — {demo.category}</p>
            <h3 className="text-lg font-semibold text-white">
              {demo.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold">
              <span
                className={`rounded-full px-2.5 py-1 ${
                  demo.status === 'live'
                    ? 'bg-green-100/10 text-green-300'
                    : 'bg-yellow-100/10 text-yellow-200'
                }`}
              >
                {demo.status === 'live' ? '✓ Live' : '⏳ In Progress'}
              </span>
              {demo.featured && (
                <span className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 px-2.5 py-1 text-white">
                  ⭐ Featured
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-1 capitalize ${
                  demo.complexity === 'advanced'
                    ? 'bg-red-100/10 text-red-300'
                    : demo.complexity === 'intermediate'
                      ? 'bg-blue-100/10 text-blue-300'
                      : 'bg-gray-100/10 text-gray-200'
                }`}
              >
                {demo.complexity}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onSeeMore}
            className={`inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-gray-100 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              mobileBlocked ? 'opacity-80' : 'hover:border-blue-300 hover:text-blue-200'
            }`}
          >
            See more
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 111.02 1.1l-4.23 3.825a.75.75 0 01-1.02 0L5.25 8.29a.75.75 0 01-.02-1.08z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-4 text-[0.65rem] uppercase tracking-[0.2em] text-gray-400">
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{demo.buildTime}</span>
          </div>
          <div className="flex items-center gap-1 capitalize tracking-normal">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>{demo.category.replace('-', ' ')}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
