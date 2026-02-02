'use client'

import { useState } from 'react'
import { TrueFalseQuestion as TrueFalseQuestionType } from '@/types/certification'

interface TrueFalseQuestionProps {
  question: TrueFalseQuestionType
  onAnswer: (correct: boolean) => void
  showExplanation: boolean
}

export default function TrueFalseQuestion({
  question,
  onAnswer,
  showExplanation,
}: TrueFalseQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)

  const handleAnswer = (answer: boolean) => {
    if (hasAnswered) return

    setSelectedAnswer(answer)
    setHasAnswered(true)
    const isCorrect = answer === question.correctAnswer
    onAnswer(isCorrect)
  }

  const getButtonClass = (value: boolean) => {
    const baseClass =
      'flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 border-2'

    if (!hasAnswered) {
      return `${baseClass} border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10`
    }

    if (selectedAnswer === value) {
      const isCorrect = value === question.correctAnswer
      return isCorrect
        ? `${baseClass} border-green-500 bg-green-500/20 text-green-300`
        : `${baseClass} border-red-500 bg-red-500/20 text-red-300`
    }

    // Show correct answer even if not selected
    if (value === question.correctAnswer) {
      return `${baseClass} border-green-500/50 bg-green-500/10 text-green-400`
    }

    return `${baseClass} border-white/10 bg-white/5 text-white/40`
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Question Text */}
      <div className="text-lg sm:text-xl font-medium leading-relaxed">{question.question}</div>

      {/* Answer Buttons */}
      <div className="flex gap-3 sm:gap-4">
        <button
          onClick={() => handleAnswer(true)}
          disabled={hasAnswered}
          className={getButtonClass(true)}
        >
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>True</span>
          </div>
        </button>

        <button
          onClick={() => handleAnswer(false)}
          disabled={hasAnswered}
          className={getButtonClass(false)}
        >
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>False</span>
          </div>
        </button>
      </div>

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
