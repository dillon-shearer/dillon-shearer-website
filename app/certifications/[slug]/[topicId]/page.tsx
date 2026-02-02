'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { getTopicById } from '@/lib/certifications'
import QuestionRenderer from '@/app/certifications/components/QuestionRenderer'

export default function QuizPage() {
  const params = useParams()
  const slug = params.slug as string
  const topicId = params.topicId as string

  const data = getTopicById(slug, topicId)

  // Initialize with original order, then randomize on client after mount
  const [randomizedQuestions, setRandomizedQuestions] = useState(() => {
    return data ? [...data.topic.questions] : []
  })

  // Randomize questions once on mount (client-side only)
  useEffect(() => {
    if (!data) return
    const questions = [...data.topic.questions]
    // Fisher-Yates shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]]
    }
    setRandomizedQuestions(questions)
  }, []) // Empty dependency array - only run once on mount

  // Scroll to question when it changes
  useEffect(() => {
    if (questionCardRef.current) {
      questionCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [currentQuestionIndex])

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showExplanation, setShowExplanation] = useState(true)
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const questionCardRef = useRef<HTMLDivElement>(null)

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Topic Not Found</h1>
          <Link
            href={`/certifications/${slug}`}
            className="text-[#54b3d6] hover:underline"
          >
            Return to Certification
          </Link>
        </div>
      </div>
    )
  }

  const { certification, topic } = data

  if (randomizedQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link
            href={`/certifications/${slug}`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {certification.shortName}
          </Link>

          <div className="text-center py-16">
            <h1 className="text-3xl font-bold mb-4">{topic.title}</h1>
            <p className="text-xl text-white/60 mb-8">
              No questions available yet. Check back soon!
            </p>
            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              <p className="text-white/80">
                Questions are being added as study materials are developed.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = randomizedQuestions[currentQuestionIndex]
  const totalQuestions = randomizedQuestions.length
  const answeredCount = Object.keys(answers).length
  const correctCount = Object.values(answers).filter(Boolean).length

  const handleAnswer = (correct: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: correct,
    }))
  }

  const goToNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const goToRandom = () => {
    const randomIndex = Math.floor(Math.random() * totalQuestions)
    setCurrentQuestionIndex(randomIndex)
  }

  const hasAnsweredCurrent = currentQuestion.id in answers

  return (
    <div className="bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/certifications/${slug}`}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {certification.shortName}
          </Link>

          <h1 className="text-3xl font-bold mb-2">{topic.title}</h1>
          <p className="text-white/60">{topic.description}</p>
        </div>

        {/* Session Stats */}
        <div className="mb-8 p-4 sm:p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 sm:gap-6 sm:justify-between sm:items-center">
            <div>
              <p className="text-xs sm:text-sm text-white/60 mb-1">Question</p>
              <p className="text-xl sm:text-2xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {currentQuestionIndex + 1} / {totalQuestions}
              </p>
            </div>

            {answeredCount > 0 && (
              <>
                <div>
                  <p className="text-xs sm:text-sm text-white/60 mb-1">Answered</p>
                  <p className="text-xl sm:text-2xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{answeredCount}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-xs sm:text-sm text-white/60 mb-1">Correct</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {correctCount} ({answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%)
                  </p>
                </div>
              </>
            )}

            {/* Settings */}
            <button
              onClick={() => setShowExplanation((prev) => !prev)}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/20 hover:border-white/40 transition-colors text-sm"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="whitespace-nowrap">Explanations: {showExplanation ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>

        {/* Question Card */}
        <div ref={questionCardRef} className="mb-6 sm:mb-8 p-4 sm:p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent overflow-hidden">
          {/* Question Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
            <div className="flex items-center flex-wrap gap-2">
              <span className="px-3 py-1 text-xs uppercase tracking-widest bg-[#54b3d6]/10 text-[#54b3d6] rounded-full whitespace-nowrap">
                {currentQuestion.type.replace('-', ' ')}
              </span>
              {currentQuestion.difficulty && (
                <span
                  className={`px-3 py-1 text-xs uppercase tracking-widest rounded-full whitespace-nowrap ${
                    currentQuestion.difficulty === 'hard'
                      ? 'bg-red-500/10 text-red-400'
                      : currentQuestion.difficulty === 'medium'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-green-500/10 text-green-400'
                  }`}
                >
                  {currentQuestion.difficulty}
                </span>
              )}
            </div>

            {hasAnsweredCurrent && (
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                  answers[currentQuestion.id]
                    ? 'bg-green-500/20 text-green-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                {answers[currentQuestion.id] ? '✓ Correct' : '✗ Incorrect'}
              </span>
            )}
          </div>

          {/* Question Component - KEY PROP FIXES STATE PERSISTENCE */}
          <QuestionRenderer
            key={currentQuestion.id}
            question={currentQuestion}
            onAnswer={handleAnswer}
            showExplanation={showExplanation}
          />
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <button
            onClick={goToPrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold border border-white/20 hover:border-white/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </button>

          <button
            onClick={goToRandom}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold border border-[#54b3d6]/30 bg-[#54b3d6]/10 hover:bg-[#54b3d6]/20 transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Random
          </button>

          <button
            onClick={goToNext}
            disabled={currentQuestionIndex === totalQuestions - 1}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold border border-white/20 hover:border-white/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Tags */}
        {currentQuestion.tags && currentQuestion.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {currentQuestion.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs bg-white/5 text-white/50 rounded-full border border-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
