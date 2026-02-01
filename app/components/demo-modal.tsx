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

  const isInProgress = demo.status !== 'live'
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
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-700 bg-[#0c1424] text-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-gray-400 transition-colors hover:bg-black/70 hover:text-white"
          aria-label="Close modal"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="border-b border-gray-700 px-6 pb-4 pt-6">
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-blue-200/80">Demo — {demo.category}</p>
          <h2 id="modal-title" className="mt-1 text-2xl font-semibold text-white">
            {demo.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold">
            <span
              className={`rounded-full px-2.5 py-1 ${
                demo.status === 'live'
                  ? 'bg-green-100/10 text-green-300'
                  : demo.status === 'ongoing'
                    ? 'bg-blue-100/10 text-blue-300'
                    : 'bg-yellow-100/10 text-yellow-200'
              }`}
            >
              {demo.status === 'live' ? '✓ Live' : demo.status === 'ongoing' ? '↻ Ongoing' : '⏳ In Progress'}
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
            <span className="rounded-full bg-gray-100/10 px-2.5 py-1 text-gray-200">
              {demo.buildTime}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-gray-100 sm:text-base">{demo.description}</p>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Key Features</h4>
                <ul className="mt-2 space-y-2 text-sm text-gray-100">
                  {demo.highlights.slice(0, 5).map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" aria-hidden="true" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              {!isInProgress ? (
                <Link
                  href={exploreHref}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:from-blue-700 hover:to-blue-800"
                  onClick={onClose}
                >
                  Explore full demo
                </Link>
              ) : (
                <div className="w-full rounded-xl bg-gray-800 px-4 py-2.5 text-center text-sm font-semibold text-gray-300">
                  Demo coming soon
                </div>
              )}

              {!demo.mobileReady && (
                <p className="text-xs font-medium text-amber-400">
                  Best experienced on desktop devices
                </p>
              )}

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Tech Stack</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {demo.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-100"
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
                    className="flex flex-1 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:border-blue-400 hover:text-blue-200"
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
                    className="flex flex-1 items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:border-green-400 hover:text-green-200"
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
