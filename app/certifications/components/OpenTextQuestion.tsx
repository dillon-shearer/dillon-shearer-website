'use client'

import { useState } from 'react'
import { OpenTextQuestion as OpenTextQuestionType } from '@/types/certification'

interface OpenTextQuestionProps {
  question: OpenTextQuestionType
  onAnswer: (correct: boolean) => void
  showExplanation: boolean
}

export default function OpenTextQuestion({
  question,
  onAnswer,
  showExplanation,
}: OpenTextQuestionProps) {
  const [userAnswer, setUserAnswer] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handleSubmit = () => {
    if (hasAnswered || !userAnswer.trim()) return

    setHasAnswered(true)

    // Check if answer matches any accepted answer
    const normalizedUserAnswer = question.caseSensitive
      ? userAnswer.trim()
      : userAnswer.trim().toLowerCase()

    const correct = question.acceptedAnswers.some((acceptedAnswer) => {
      const normalizedAccepted = question.caseSensitive
        ? acceptedAnswer
        : acceptedAnswer.toLowerCase()
      return normalizedUserAnswer === normalizedAccepted
    })

    setIsCorrect(correct)
    onAnswer(correct)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !hasAnswered) {
      handleSubmit()
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Question Text */}
      <div className="text-lg sm:text-xl font-medium leading-relaxed">{question.question}</div>

      {/* Text Input */}
      <div>
        <input
          type="text"
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={hasAnswered}
          placeholder="Type your answer..."
          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border-2 bg-white/5 text-white transition-all duration-200 ${
            hasAnswered
              ? isCorrect
                ? 'border-green-500 bg-green-500/10'
                : 'border-red-500 bg-red-500/10'
              : 'border-white/20 focus:border-[#54b3d6] focus:outline-none'
          }`}
        />
        {!hasAnswered && (
          <p className="mt-2 text-xs sm:text-sm text-white/50">
            {question.caseSensitive
              ? 'Case-sensitive - type exactly as expected'
              : 'Not case-sensitive'}
          </p>
        )}
      </div>

      {/* Submit Button */}
      {!hasAnswered && (
        <button
          onClick={handleSubmit}
          disabled={!userAnswer.trim()}
          className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 border-2 border-[#54b3d6] bg-[#54b3d6]/20 hover:bg-[#54b3d6]/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answer
        </button>
      )}

      {/* Result Indicator */}
      {hasAnswered && (
        <div
          className={`p-4 rounded-xl border-2 ${
            isCorrect
              ? 'border-green-500 bg-green-500/10'
              : 'border-red-500 bg-red-500/10'
          }`}
        >
          <div className="flex items-center gap-3">
            {isCorrect ? (
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className={`font-semibold ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          {!isCorrect && (
            <p className="mt-2 text-sm text-white/70">
              Accepted answer(s): {question.acceptedAnswers.join(', ')}
            </p>
          )}
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
