'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Demo } from '@/types/demo'

interface DemoModalProps {
  demo: Demo
  onClose: () => void
}

export default function DemoModal({ demo, onClose }: DemoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  const isAccessible = demo.status === 'live' || demo.status === 'ongoing'
  const exploreHref = demo.demoUrl ?? (demo.slug === 'koreader-remote' ? '/koreader-remote' : `/demos/${demo.slug}`)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Close when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/20 bg-black/95 backdrop-blur-sm text-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/5 border border-white/10 p-2 text-white/40 transition-all hover:bg-white/10 hover:border-white/20 hover:text-white"
          aria-label="Close modal"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="border-b border-white/10 px-6 pb-4 pt-6">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/50">Demo — {demo.category}</p>
          <h2 id="modal-title" className="mt-1 text-2xl font-semibold text-white">
            {demo.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold">
            <span
              className={`rounded-full px-2.5 py-1 ${
                demo.status === 'live'
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : demo.status === 'ongoing'
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
              }`}
            >
              {demo.status === 'live' ? '✓ Live' : demo.status === 'ongoing' ? '↻ Ongoing' : '⏳ In Progress'}
            </span>
            {demo.featured && (
              <span className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 px-2.5 py-1 text-white border border-yellow-500/50">
                ⭐ Featured
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 capitalize ${
                demo.complexity === 'advanced'
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : demo.complexity === 'intermediate'
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'bg-white/10 text-white/70 border border-white/20'
              }`}
            >
              {demo.complexity}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-white/70 border border-white/20">
              {demo.buildTime}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-white/80 sm:text-base">{demo.description}</p>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">Key Features</h4>
                <ul className="mt-2 space-y-2 text-sm text-white/80">
                  {demo.highlights.slice(0, 5).map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#54b3d6]" aria-hidden="true" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              {isAccessible ? (
                <Link
                  href={exploreHref}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:from-blue-700 hover:to-blue-800"
                  onClick={onClose}
                >
                  Explore full demo
                </Link>
              ) : (
                <div className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white/50">
                  Demo coming soon
                </div>
              )}

              {!demo.mobileReady && (
                <p className="text-xs font-medium text-amber-400">
                  Best experienced on desktop devices
                </p>
              )}

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-white/40">Tech Stack</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {demo.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-1 text-xs font-medium text-white/70"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {demo.githubUrl && (
                  <a
                    href={demo.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:border-[#54b3d6]/50 hover:text-[#54b3d6] hover:bg-[#54b3d6]/5"
                    title="View source code"
                  >
                    Source
                  </a>
                )}
                {demo.liveUrl && (
                  <a
                    href={demo.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:border-green-400/50 hover:text-green-400 hover:bg-green-400/5"
                    title="Open live demo"
                  >
                    Live site
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
