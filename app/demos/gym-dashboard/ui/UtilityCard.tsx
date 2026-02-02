'use client'

import React from 'react'

type Props = {
  filters: React.ReactNode
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
  downloadButton,
}: Props) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        {/* Filters - takes up most space */}
        <div className="flex-1 min-w-0">
          {filters}
        </div>

        {/* Download button - aligned to right on desktop, full width on mobile */}
        <div className="lg:flex-shrink-0">
          {downloadButton}
        </div>
      </div>
    </div>
  )
}
