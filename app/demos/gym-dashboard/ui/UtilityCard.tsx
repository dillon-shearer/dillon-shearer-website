'use client'

import React from 'react'

type Props = {
  filters: React.ReactNode
  dateNavigation?: React.ReactNode
  downloadButton: React.ReactNode
  insightContext: {
    scope: 'week' | 'month' | 'year' | 'day' | 'custom'
    selectedExercises?: string[]
    dateFrom?: string
    dateTo?: string
  }
}

export default function UtilityCard({
  filters,
  dateNavigation,
  downloadButton,
}: Props) {
  return (
    <div className="bg-white/[0.02] border border-white/12 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        {/* Top row: Time range buttons + Download button on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            {filters}
          </div>
          <div className="sm:flex-shrink-0">
            {downloadButton}
          </div>
        </div>

        {/* Date navigation: centered on all breakpoints */}
        {dateNavigation && (
          <div className="flex justify-center">
            {dateNavigation}
          </div>
        )}
      </div>
    </div>
  )
}
