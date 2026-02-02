'use client'

import { useState } from 'react'
import { FillInBlankQuestion as FillInBlankQuestionType } from '@/types/certification'

interface FillInBlankQuestionProps {
  question: FillInBlankQuestionType
  onAnswer: (correct: boolean) => void
  showExplanation: boolean
}

export default function FillInBlankQuestion({
  question,
  onAnswer,
  showExplanation,
}: FillInBlankQuestionProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [hasAnswered, setHasAnswered] = useState(false)
  const [blankResults, setBlankResults] = useState<Record<string, boolean>>({})

  // Split template by underscores (blanks are represented as ___)
  const parts = question.template.split(/(_+)/)
  const blanks = question.blanks

  const handleSubmit = () => {
    if (hasAnswered) return

    // Check if all blanks are filled
    const allFilled = blanks.every((blank) => answers[blank.id]?.trim())
    if (!allFilled) return

    setHasAnswered(true)

    // Validate each blank
    const results: Record<string, boolean> = {}
    blanks.forEach((blank) => {
      const userAnswer = answers[blank.id]?.trim() || ''
      const normalizedUserAnswer = blank.caseSensitive
        ? userAnswer
        : userAnswer.toLowerCase()

      results[blank.id] = blank.acceptedAnswers.some((acceptedAnswer) => {
        const normalizedAccepted = blank.caseSensitive
          ? acceptedAnswer
          : acceptedAnswer.toLowerCase()
        return normalizedUserAnswer === normalizedAccepted
      })
    })

    setBlankResults(results)

    // Overall correct only if all blanks are correct
    const allCorrect = Object.values(results).every((r) => r)
    onAnswer(allCorrect)
  }

  const allFilled = blanks.every((blank) => answers[blank.id]?.trim())

  return (
    <div className="space-y-6">
      {/* Question Text with Blanks */}
      <div className="text-lg sm:text-xl font-medium leading-relaxed">
        <div className="flex flex-wrap items-center gap-2">
          {parts.map((part, index) => {
            // Check if this part is a blank (multiple underscores)
            if (part.match(/^_+$/)) {
              const blankIndex = Math.floor(index / 2)
              const blank = blanks[blankIndex]
              if (!blank) return null

              const isIncorrect = hasAnswered && !blankResults[blank.id]
              const isCorrect = hasAnswered && blankResults[blank.id]

              return (
                <input
                  key={`blank-${blank.id}`}
                  type="text"
                  value={answers[blank.id] || ''}
                  onChange={(e) =>
                    setAnswers({ ...answers, [blank.id]: e.target.value })
                  }
                  disabled={hasAnswered}
                  placeholder="___"
                  className={`inline-block px-2 sm:px-3 py-1 text-sm sm:text-base rounded border-2 bg-white/5 text-white w-full sm:w-auto sm:min-w-[120px] transition-all ${
                    hasAnswered
                      ? isCorrect
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-red-500 bg-red-500/10'
                      : 'border-white/30 focus:border-[#54b3d6] focus:outline-none'
                  }`}
                />
              )
            }
            return <span key={`text-${index}`} className="text-sm sm:text-base">{part}</span>
          })}
        </div>
      </div>

      {/* Submit Button */}
      {!hasAnswered && (
        <button
          onClick={handleSubmit}
          disabled={!allFilled}
          className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 border-2 border-[#54b3d6] bg-[#54b3d6]/20 hover:bg-[#54b3d6]/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      )}

      {/* Results */}
      {hasAnswered && (
        <div className="space-y-2">
          {blanks.map((blank) => {
            const isCorrect = blankResults[blank.id]
            return (
              <div
                key={blank.id}
                className={`p-3 rounded-lg border ${
                  isCorrect
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-red-500/30 bg-red-500/10'
                }`}
              >
                <div className="flex items-center gap-2 text-sm">
                  {isCorrect ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className="text-white/70">
                    Your answer: <span className="text-white font-medium">{answers[blank.id]}</span>
                  </span>
                  {!isCorrect && (
                    <span className="text-white/50 ml-auto">
                      Accepted: {blank.acceptedAnswers.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
