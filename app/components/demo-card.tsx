import Link from 'next/link'
import { Demo } from '@/types/demo'

interface DemoCardProps {
  demo: Demo
}

export default function DemoCard({ demo }: DemoCardProps) {
  const isInProgress = demo.status !== 'live'

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative p-4 sm:p-6 md:p-8">
        <div className="flex items-start justify-between mb-4 md:mb-6">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 leading-tight">
              {demo.title}
            </h3>
            <div className="flex items-center gap-2 sm:gap-3 mt-2 sm:mt-3 flex-wrap">
              <span className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-full ${
                demo.status === 'live' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {demo.status === 'live' ? '✓ Live' : '⏳ In Progress'}
              </span>
              {demo.featured && (
                <span className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                  ⭐ Featured
                </span>
              )}
              <span className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold rounded-full ${
                demo.complexity === 'advanced' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                demo.complexity === 'intermediate' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {demo.complexity}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg leading-relaxed mb-4 sm:mb-6">
          {demo.description}
        </p>

        <div className="mb-4 sm:mb-6">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide">
            Tech Stack
          </h4>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {demo.techStack.map((tech) => (
              <span
                key={tech}
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800 dark:hover:to-blue-700 transition-all duration-200"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 uppercase tracking-wide">
            Key Features
          </h4>
          <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
            {demo.highlights.slice(0, 4).map((highlight, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 text-sm text-gray-500 dark:text-gray-400 mb-6 sm:mb-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-xs sm:text-sm">{demo.buildTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="font-medium text-xs sm:text-sm capitalize">{demo.category.replace('-', ' ')}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {isInProgress ? (
            <div className="flex-1 bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-400 text-center py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold text-sm sm:text-base">
              Demo coming soon
            </div>
          ) : (
            <>
              <Link
                href={`/demos/${demo.slug}`}
                className="hidden md:flex flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-center py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold transition-all duration-200"
              >
                Explore demo
              </Link>
              <div className="md:hidden flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-center py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold">
                Best viewed on desktop
              </div>
            </>
          )}

          <div className="flex gap-2 justify-center sm:justify-start">
            {demo.githubUrl && (
              <a
                href={demo.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-2.5 sm:p-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group/btn"
                title="View source code"
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 dark:text-gray-400 group-hover/btn:text-blue-600 dark:group-hover/btn:text-blue-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            )}
            {demo.liveUrl && (
              <a
                href={demo.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center p-2.5 sm:p-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group/btn"
                title="Open live demo"
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 dark:text-gray-400 group-hover/btn:text-green-600 dark:group-hover/btn:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
