'use client'

import React from 'react'

type Props = {
  filters: React.ReactNode
  downloadButton: React.ReactNode
  lastModified: string
  // context used for the insights call - the page will pass current scope & filters
  insightContext: {
    scope: 'week' | 'month' | 'year' | 'custom'
    selectedExercises?: string[]
    dateFrom?: string
    dateTo?: string
  }
}

export default function UtilityCard({
  filters,
  downloadButton,
  lastModified,
  insightContext
}: Props) {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <div className="bg-surface-1 dark:bg-surface-1-dark border border-gray-800/10 dark:border-gray-700/30 rounded-xl shadow-sm p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-3">
        {/* Left zone - filters (keeps original controls) */}
        <div className="flex-1 min-w-[120px] flex items-center justify-start">
          {filters}
        </div>

        {/* Right zone - download + last modified */}
        <div className="flex-1 min-w-[160px] flex flex-col sm:flex-row items-center justify-end gap-3">
          <div className="order-2 sm:order-1">{downloadButton}</div>
          <div className="text-xs text-gray-500 order-1 sm:order-2 text-right">
            Last modified: <span className="font-medium text-gray-700 dark:text-gray-300">{lastModified}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
