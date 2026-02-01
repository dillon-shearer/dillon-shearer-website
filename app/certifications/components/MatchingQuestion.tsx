'use client'

import { useState } from 'react'
import { MatchingQuestion as MatchingQuestionType } from '@/types/certification'

interface MatchingQuestionProps {
  question: MatchingQuestionType
  onAnswer: (correct: boolean) => void
  showExplanation: boolean
}

export default function MatchingQuestion({
  question,
  onAnswer,
  showExplanation,
}: MatchingQuestionProps) {
  // Randomize both left and right items once on mount
  const [shuffledData] = useState(() => {
    // Shuffle left items
    const leftIndices = question.leftItems.map((_, i) => i)
    for (let i = leftIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [leftIndices[i], leftIndices[j]] = [leftIndices[j], leftIndices[i]]
    }

    // Shuffle right items
    const rightIndices = question.rightItems.map((_, i) => i)
    for (let i = rightIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rightIndices[i], rightIndices[j]] = [rightIndices[j], rightIndices[i]]
    }

    return {
      leftItems: leftIndices.map(i => question.leftItems[i]),
      rightItems: rightIndices.map(i => question.rightItems[i])
    }
  })

  const [matches, setMatches] = useState<Record<string, string>>({})
  const [hasAnswered, setHasAnswered] = useState(false)
  const [matchResults, setMatchResults] = useState<Record<string, boolean>>({})

  const handleMatch = (leftId: string, rightId: string) => {
    if (hasAnswered) return
    setMatches({ ...matches, [leftId]: rightId })
  }

  const handleSubmit = () => {
    if (hasAnswered) return

    // Check if all left items are matched
    const allMatched = shuffledData.leftItems.every((item) => matches[item.id])
    if (!allMatched) return

    setHasAnswered(true)

    // Validate matches
    const results: Record<string, boolean> = {}
    shuffledData.leftItems.forEach((leftItem) => {
      const userMatch = matches[leftItem.id]
      const correctMatch = question.correctMatches[leftItem.id]
      results[leftItem.id] = userMatch === correctMatch
    })

    setMatchResults(results)

    // Overall correct only if all matches are correct
    const allCorrect = Object.values(results).every((r) => r)
    onAnswer(allCorrect)
  }

  const allMatched = shuffledData.leftItems.every((item) => matches[item.id])

  return (
    <div className="space-y-6">
      {/* Question Text */}
      <div className="text-xl font-medium leading-relaxed mb-2">{question.question}</div>
      <p className="text-sm text-white/60 mb-4">Match each item on the left with its correct pair on the right</p>

      {/* Matching Interface */}
      <div className="space-y-3">
        {shuffledData.leftItems.map((leftItem) => {
          const isIncorrect = hasAnswered && !matchResults[leftItem.id]
          const isCorrect = hasAnswered && matchResults[leftItem.id]
          const selectedRightId = matches[leftItem.id]

          return (
            <div
              key={leftItem.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                hasAnswered
                  ? isCorrect
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-red-500 bg-red-500/10'
                  : 'border-white/20 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Left Item */}
                <div className="flex-1 font-medium text-white">{leftItem.text}</div>

                {/* Arrow */}
                <svg className="w-6 h-6 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>

                {/* Dropdown for Right Item */}
                <select
                  value={selectedRightId || ''}
                  onChange={(e) => handleMatch(leftItem.id, e.target.value)}
                  disabled={hasAnswered}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 bg-white/5 text-white transition-all ${
                    hasAnswered
                      ? 'cursor-not-allowed opacity-75'
                      : 'border-white/30 hover:border-white/50 focus:border-[#54b3d6] focus:outline-none cursor-pointer'
                  }`}
                >
                  <option value="" className="bg-gray-900">Select a match...</option>
                  {shuffledData.rightItems.map((rightItem) => (
                    <option key={rightItem.id} value={rightItem.id} className="bg-gray-900">
                      {rightItem.text}
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

              {/* Show correct answer if incorrect */}
              {hasAnswered && !isCorrect && (
                <div className="mt-2 pt-2 border-t border-white/10 text-sm text-white/70">
                  Correct match:{' '}
                  <span className="text-white font-medium">
                    {question.rightItems.find((r) => r.id === question.correctMatches[leftItem.id])?.text}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit Button */}
      {!hasAnswered && (
        <button
          onClick={handleSubmit}
          disabled={!allMatched}
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
