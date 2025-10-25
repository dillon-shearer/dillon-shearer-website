// app/demos/gym-dashboard/ui/UtilityCard.tsx
'use client'

import React from 'react'

type Props = {
  filters: React.ReactNode
  downloadButton: React.ReactNode
  lastModified: string
  insightContext: {
    scope: 'week' | 'month' | 'year' | 'day' | 'custom'
    selectedExercises?: string[]
    dateFrom?: string
    dateTo?: string
  }
}

export default function UtilityCard({
  filters,
  downloadButton,
  lastModified,
}: Props) {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div
        className="bg-surface-1 dark:bg-surface-1-dark border border-gray-800/10 dark:border-gray-700/30 rounded-xl shadow-sm p-3 sm:p-4
                   flex items-center gap-3"
        style={{ minHeight: 64 }} // keeps a constant bar height across modes
      >
        {/* Left: filters */}
        <div className="flex-1 min-w-[220px] flex items-center">{filters}</div>

        {/* Right: download + last modified */}
        <div className="flex-1 min-w-[260px] flex items-center justify-end gap-3">
          <div>{downloadButton}</div>
          <div className="text-xs text-gray-500 text-right whitespace-nowrap">
            Last modified:{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {lastModified}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
