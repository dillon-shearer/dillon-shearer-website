'use client'

import { useState } from 'react'
import { MultipleSelectQuestion as MultipleSelectQuestionType } from '@/types/certification'

interface MultipleSelectQuestionProps {
  question: MultipleSelectQuestionType
  onAnswer: (correct: boolean) => void
  showExplanation: boolean
}

export default function MultipleSelectQuestion({
  question,
  onAnswer,
  showExplanation,
}: MultipleSelectQuestionProps) {
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
      correctAnswerIndices: question.correctAnswers.map(correctIdx =>
        indices.indexOf(correctIdx)
      )
    }
  })

  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [hasAnswered, setHasAnswered] = useState(false)

  const toggleAnswer = (index: number) => {
    if (hasAnswered) return

    setSelectedAnswers((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  const handleSubmit = () => {
    if (hasAnswered || selectedAnswers.length === 0) return

    setHasAnswered(true)

    // Check if answer is correct (must match all correct answers)
    const sortedSelected = [...selectedAnswers].sort()
    const sortedCorrect = [...shuffledData.correctAnswerIndices].sort()
    const isCorrect =
      sortedSelected.length === sortedCorrect.length &&
      sortedSelected.every((val, idx) => val === sortedCorrect[idx])

    onAnswer(isCorrect)
  }

  const getOptionClass = (index: number) => {
    const baseClass =
      'w-full text-left p-4 rounded-xl font-medium transition-all duration-200 border-2'

    const isSelected = selectedAnswers.includes(index)
    const isCorrect = shuffledData.correctAnswerIndices.includes(index)

    if (!hasAnswered) {
      return isSelected
        ? `${baseClass} border-[#54b3d6] bg-[#54b3d6]/10`
        : `${baseClass} border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10`
    }

    // After answering
    if (isSelected && isCorrect) {
      return `${baseClass} border-green-500 bg-green-500/20 text-green-300`
    }

    if (isSelected && !isCorrect) {
      return `${baseClass} border-red-500 bg-red-500/20 text-red-300`
    }

    if (!isSelected && isCorrect) {
      return `${baseClass} border-green-500/50 bg-green-500/10 text-green-400`
    }

    return `${baseClass} border-white/10 bg-white/5 text-white/40`
  }

  const getOptionIcon = (index: number) => {
    const isSelected = selectedAnswers.includes(index)
    const isCorrect = shuffledData.correctAnswerIndices.includes(index)

    if (!hasAnswered) {
      return (
        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'border-[#54b3d6] bg-[#54b3d6]' : 'border-white/30'
        }`}>
          {isSelected && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )
    }

    // After answering - show correct/incorrect
    if (isCorrect) {
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

    if (isSelected) {
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
      <div className="w-6 h-6 rounded border-2 border-white/20 flex-shrink-0" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Question Text */}
      <div>
        <div className="text-xl font-medium leading-relaxed mb-2">{question.question}</div>
        <p className="text-sm text-white/60">Select all that apply</p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {shuffledData.options.map((option, index) => (
          <button
            key={index}
            onClick={() => toggleAnswer(index)}
            disabled={hasAnswered}
            className={getOptionClass(index)}
          >
            <div className="flex items-center gap-4">
              {getOptionIcon(index)}
              <span className="flex-1">{option}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Submit Button */}
      {!hasAnswered && (
        <button
          onClick={handleSubmit}
          disabled={selectedAnswers.length === 0}
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
