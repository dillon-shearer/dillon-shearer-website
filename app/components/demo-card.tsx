'use client'

import Link from 'next/link'
import { Demo } from '@/types/demo'

interface DemoCardProps {
  demo: Demo
  isExpanded: boolean
  onToggle: () => void
}

export default function DemoCard({ demo, isExpanded, onToggle }: DemoCardProps) {
  const isInProgress = demo.status !== 'live'
  const mobileOrderClass = demo.mobileReady ? 'order-first md:order-none' : ''
  const exploreHref = demo.slug === 'koreader-remote' ? '/koreader-remote' : `/demos/${demo.slug}`
  const previewBase = demo.demoUrl ?? exploreHref
  const previewSrc = previewBase.includes('?') ? `${previewBase}&embed=1` : `${previewBase}?embed=1`
  const detailsId = `${demo.slug}-details`
  const frameScaleClasses = isExpanded
    ? 'scale-[0.48] sm:scale-[0.54] md:scale-[0.6]'
    : 'scale-[0.22] sm:scale-[0.26] md:scale-[0.3]'
  const frameHeightClasses = isExpanded
    ? 'h-[420px] sm:h-[480px] md:h-[560px]'
    : 'h-[200px] sm:h-[240px] md:h-[280px]'

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-[#0c1424] text-white shadow-lg transition-all duration-300 dark:border-gray-700 ${mobileOrderClass} ${
        isExpanded ? 'ring-2 ring-blue-500/40' : 'hover:-translate-y-1 hover:shadow-2xl'
      }`}
      data-expanded={isExpanded}
    >
      <div className={`relative w-full overflow-hidden rounded-t-2xl bg-black transition-[height] duration-500 ${frameHeightClasses}`}>
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className={`origin-top transition-transform duration-500 ease-out ${frameScaleClasses}`}>
            <iframe
              src={previewSrc}
              title={`${demo.title} live preview`}
              tabIndex={-1}
              loading="lazy"
              aria-hidden="true"
              className="h-[900px] w-[1440px] border-0 shadow-2xl"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <Link
          href={exploreHref}
          className="absolute inset-0 z-10 flex items-end justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Open ${demo.title} demo`}
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
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-gray-100 transition-colors duration-200 hover:border-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {isExpanded ? 'Close' : 'See more'}
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
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

      {isExpanded && (
        <div
          id={detailsId}
          className="px-4 pb-6 text-sm text-gray-200"
        >
          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-8">
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-gray-100 sm:text-base">{demo.description}</p>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Key Features</h4>
                <ul className="mt-2 space-y-2 text-sm text-gray-100">
                  {demo.highlights.slice(0, 5).map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2">
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
      )}
    </article>
  )
}
