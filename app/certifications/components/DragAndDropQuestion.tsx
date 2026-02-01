'use client'

import { useState } from 'react'
import { DragAndDropQuestion as DragAndDropQuestionType } from '@/types/certification'

interface DragAndDropQuestionProps {
  question: DragAndDropQuestionType
  onAnswer: (correct: boolean) => void
  showExplanation: boolean
}

export default function DragAndDropQuestion({
  question,
  onAnswer,
  showExplanation,
}: DragAndDropQuestionProps) {
  // Randomize items and drop zones once on mount
  const [shuffledData] = useState(() => {
    // Shuffle items
    const itemIndices = question.items.map((_, i) => i)
    for (let i = itemIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [itemIndices[i], itemIndices[j]] = [itemIndices[j], itemIndices[i]]
    }

    // Shuffle drop zones
    const zoneIndices = question.dropZones.map((_, i) => i)
    for (let i = zoneIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [zoneIndices[i], zoneIndices[j]] = [zoneIndices[j], zoneIndices[i]]
    }

    return {
      items: itemIndices.map(i => ({ text: question.items[i], originalIndex: i.toString() })),
      dropZones: zoneIndices.map(i => question.dropZones[i])
    }
  })

  const [itemPlacements, setItemPlacements] = useState<Record<string, string>>({})
  const [hasAnswered, setHasAnswered] = useState(false)
  const [itemResults, setItemResults] = useState<Record<string, boolean>>({})

  const handlePlacement = (shuffledIndex: number, dropZoneId: string) => {
    if (hasAnswered) return
    const itemId = shuffledIndex.toString()
    setItemPlacements({ ...itemPlacements, [itemId]: dropZoneId })
  }

  const handleSubmit = () => {
    if (hasAnswered) return

    // Check if all items are placed
    const allPlaced = shuffledData.items.every((_, index) => itemPlacements[index.toString()])
    if (!allPlaced) return

    setHasAnswered(true)

    // Validate placements
    const results: Record<string, boolean> = {}
    shuffledData.items.forEach((item, shuffledIndex) => {
      const shuffledId = shuffledIndex.toString()
      const originalId = item.originalIndex
      const userPlacement = itemPlacements[shuffledId]
      const correctPlacement = question.correctMapping[originalId]
      results[shuffledId] = userPlacement === correctPlacement
    })

    setItemResults(results)

    // Overall correct only if all items are correctly placed
    const allCorrect = Object.values(results).every((r) => r)
    onAnswer(allCorrect)
  }

  const allPlaced = shuffledData.items.every((_, index) => itemPlacements[index.toString()])

  return (
    <div className="space-y-6">
      {/* Question Text */}
      <div className="text-xl font-medium leading-relaxed mb-2">{question.question}</div>
      <p className="text-sm text-white/60 mb-4">Assign each item to the correct category</p>

      {/* Drop Zones Reference */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/5">
        <p className="text-sm font-semibold text-white/70 mb-2">Categories:</p>
        <div className="flex flex-wrap gap-2">
          {shuffledData.dropZones.map((zone) => (
            <span
              key={zone.id}
              className="px-3 py-1 text-sm bg-[#54b3d6]/20 text-[#54b3d6] rounded-lg border border-[#54b3d6]/30"
            >
              {zone.label}
            </span>
          ))}
        </div>
      </div>

      {/* Items to Place */}
      <div className="space-y-3">
        {shuffledData.items.map((item, shuffledIndex) => {
          const shuffledId = shuffledIndex.toString()
          const isIncorrect = hasAnswered && !itemResults[shuffledId]
          const isCorrect = hasAnswered && itemResults[shuffledId]
          const selectedZoneId = itemPlacements[shuffledId]

          return (
            <div
              key={shuffledIndex}
              className={`p-4 rounded-xl border-2 transition-all ${
                hasAnswered
                  ? isCorrect
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-red-500 bg-red-500/10'
                  : 'border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Item Text */}
                <div className="flex-1">
                  <div className="font-medium text-white mb-1">{item.text}</div>
                  {hasAnswered && !isCorrect && (
                    <div className="text-sm text-white/70 mt-2 pt-2 border-t border-white/10">
                      Correct category:{' '}
                      <span className="text-white font-medium">
                        {question.dropZones.find((z) => z.id === question.correctMapping[item.originalIndex])?.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <svg className="w-6 h-6 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>

                {/* Dropdown for Zone Selection */}
                <div className="flex items-center gap-3">
                  <select
                    value={selectedZoneId || ''}
                    onChange={(e) => handlePlacement(shuffledIndex, e.target.value)}
                    disabled={hasAnswered}
                    className={`px-4 py-2 rounded-lg border-2 bg-white/5 text-white transition-all min-w-[200px] ${
                      hasAnswered
                        ? 'cursor-not-allowed opacity-75'
                        : 'border-white/30 hover:border-white/50 focus:border-[#54b3d6] focus:outline-none cursor-pointer'
                    }`}
                  >
                    <option value="" className="bg-gray-900">Select category...</option>
                    {shuffledData.dropZones.map((zone) => (
                      <option key={zone.id} value={zone.id} className="bg-gray-900">
                        {zone.label}
                      </option>
                    ))}
                  </select>

                  {/* Status Icon */}
                  {hasAnswered && (
                    <div className="flex-shrink-0">
                      {isCorrect ? (
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit Button */}
      {!hasAnswered && (
        <button
          onClick={handleSubmit}
          disabled={!allPlaced}
          className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 border-2 border-[#54b3d6] bg-[#54b3d6]/20 hover:bg-[#54b3d6]/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      )}

      {/* Explanation */}
      {hasAnswered && showExplanation && question.explanation && (
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/10">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-semibold text-blue-300 mb-1">Explanation</p>
              <p className="text-white/80">{question.explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
