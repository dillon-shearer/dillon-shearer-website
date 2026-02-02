'use client'

import { useState } from 'react'
import { MultipleChoiceQuestion as MultipleChoiceQuestionType } from '@/types/certification'

interface MultipleChoiceQuestionProps {
  question: MultipleChoiceQuestionType
  onAnswer: (correct: boolean) => void
  showExplanation: boolean
}

export default function MultipleChoiceQuestion({
  question,
  onAnswer,
  showExplanation,
}: MultipleChoiceQuestionProps) {
  // Randomize option order once on mount
  const [shuffledData] = useState(() => {
    const indices = question.options.map((_, i) => i)
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }

    return {
      options: indices.map(i => question.options[i]),
      correctAnswerIndex: indices.indexOf(question.correctAnswer)
    }
  })

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [hasAnswered, setHasAnswered] = useState(false)

  const handleAnswer = (index: number) => {
    if (hasAnswered) return

    setSelectedAnswer(index)
    setHasAnswered(true)
    const isCorrect = index === shuffledData.correctAnswerIndex
    onAnswer(isCorrect)
  }

  const getOptionClass = (index: number) => {
    const baseClass =
      'w-full text-left p-3 sm:p-4 rounded-xl font-medium transition-all duration-200 border-2'

    if (!hasAnswered) {
      return `${baseClass} border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10`
    }

    if (selectedAnswer === index) {
      const isCorrect = index === shuffledData.correctAnswerIndex
      return isCorrect
        ? `${baseClass} border-green-500 bg-green-500/20 text-green-300`
        : `${baseClass} border-red-500 bg-red-500/20 text-red-300`
    }

    // Show correct answer even if not selected
    if (index === shuffledData.correctAnswerIndex) {
      return `${baseClass} border-green-500/50 bg-green-500/10 text-green-400`
    }

    return `${baseClass} border-white/10 bg-white/5 text-white/40`
  }

  const getOptionIcon = (index: number) => {
    if (!hasAnswered) {
      return (
        <div className="w-6 h-6 rounded-full border-2 border-white/30 flex items-center justify-center flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-transparent" />
        </div>
      )
    }

    if (index === shuffledData.correctAnswerIndex) {
      return (
        <svg
          className="w-6 h-6 text-green-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    }

    if (selectedAnswer === index) {
      return (
        <svg
          className="w-6 h-6 text-red-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    }

    return (
      <div className="w-6 h-6 rounded-full border-2 border-white/20 flex-shrink-0" />
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Question Text */}
      <div className="text-lg sm:text-xl font-medium leading-relaxed">{question.question}</div>

      {/* Options */}
      <div className="space-y-2 sm:space-y-3">
        {shuffledData.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(index)}
            disabled={hasAnswered}
            className={getOptionClass(index)}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              {getOptionIcon(index)}
              <span className="flex-1 text-left text-sm sm:text-base">{option}</span>
            </div>
          </button>
        ))}
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
