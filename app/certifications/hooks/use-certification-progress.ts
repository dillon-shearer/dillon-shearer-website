'use client'

import { useEffect, useState } from 'react'
import { CertificationProgress, TopicProgress } from '@/types/certification'
import { getCertificationBySlug } from '@/lib/certifications'

const STORAGE_KEY_PREFIX = 'cert-progress-'

export function useCertificationProgress(certificationSlug: string) {
  const [progress, setProgress] = useState<CertificationProgress | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load progress from localStorage
  useEffect(() => {
    const loadProgress = () => {
      try {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${certificationSlug}`)
        if (stored) {
          setProgress(JSON.parse(stored))
        } else {
          // Initialize empty progress
          const cert = getCertificationBySlug(certificationSlug)
          if (cert) {
            const initialProgress: CertificationProgress = {
              certificationSlug,
              topics: {},
              overallProgress: {
                totalQuestions: cert.totalQuestions,
                questionsCompleted: 0,
                questionsCorrect: 0,
                percentComplete: 0,
                percentCorrect: 0,
              },
              lastUpdated: new Date().toISOString(),
            }
            setProgress(initialProgress)
          }
        }
      } catch (error) {
        console.error('Error loading certification progress:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    loadProgress()
  }, [certificationSlug])

  // Save progress to localStorage
  const saveProgress = (newProgress: CertificationProgress) => {
    try {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${certificationSlug}`,
        JSON.stringify(newProgress)
      )
      setProgress(newProgress)
    } catch (error) {
      console.error('Error saving certification progress:', error)
    }
  }

  // Get progress for a specific topic
  const getTopicProgress = (topicId: string): TopicProgress | null => {
    return progress?.topics[topicId] || null
  }

  // Update progress for a specific question
  const updateQuestionProgress = (
    topicId: string,
    questionId: string,
    correct: boolean
  ) => {
    if (!progress) return

    const cert = getCertificationBySlug(certificationSlug)
    if (!cert) return

    const topic = cert.topics.find((t) => t.id === topicId)
    if (!topic) return

    // Get or create topic progress
    const topicProgress = progress.topics[topicId] || {
      topicId,
      questionsCompleted: 0,
      questionsCorrect: 0,
      totalQuestions: topic.questions.length,
      lastActivity: new Date().toISOString(),
    }

    // Check if question was already completed
    const wasCompleted = topicProgress.questionsCompleted > 0

    // Update topic progress
    const updatedTopicProgress: TopicProgress = {
      ...topicProgress,
      questionsCompleted: Math.min(
        topicProgress.questionsCompleted + (wasCompleted ? 0 : 1),
        topic.questions.length
      ),
      questionsCorrect: topicProgress.questionsCorrect + (correct ? 1 : 0),
      lastActivity: new Date().toISOString(),
    }

    // Update overall progress
    const newTopics = {
      ...progress.topics,
      [topicId]: updatedTopicProgress,
    }

    const totalCompleted = Object.values(newTopics).reduce(
      (sum, tp) => sum + tp.questionsCompleted,
      0
    )
    const totalCorrect = Object.values(newTopics).reduce(
      (sum, tp) => sum + tp.questionsCorrect,
      0
    )

    const newProgress: CertificationProgress = {
      ...progress,
      topics: newTopics,
      overallProgress: {
        totalQuestions: cert.totalQuestions,
        questionsCompleted: totalCompleted,
        questionsCorrect: totalCorrect,
        percentComplete: cert.totalQuestions > 0
          ? (totalCompleted / cert.totalQuestions) * 100
          : 0,
        percentCorrect: totalCompleted > 0
          ? (totalCorrect / totalCompleted) * 100
          : 0,
      },
      lastUpdated: new Date().toISOString(),
    }

    saveProgress(newProgress)
  }

  // Reset all progress
  const resetProgress = () => {
    const cert = getCertificationBySlug(certificationSlug)
    if (!cert) return

    const freshProgress: CertificationProgress = {
      certificationSlug,
      topics: {},
      overallProgress: {
        totalQuestions: cert.totalQuestions,
        questionsCompleted: 0,
        questionsCorrect: 0,
        percentComplete: 0,
        percentCorrect: 0,
      },
      lastUpdated: new Date().toISOString(),
    }

    saveProgress(freshProgress)
  }

  // Reset specific topic
  const resetTopic = (topicId: string) => {
    if (!progress) return

    const newTopics = { ...progress.topics }
    delete newTopics[topicId]

    const cert = getCertificationBySlug(certificationSlug)
    if (!cert) return

    const totalCompleted = Object.values(newTopics).reduce(
      (sum, tp) => sum + tp.questionsCompleted,
      0
    )
    const totalCorrect = Object.values(newTopics).reduce(
      (sum, tp) => sum + tp.questionsCorrect,
      0
    )

    const newProgress: CertificationProgress = {
      ...progress,
      topics: newTopics,
      overallProgress: {
        totalQuestions: cert.totalQuestions,
        questionsCompleted: totalCompleted,
        questionsCorrect: totalCorrect,
        percentComplete: cert.totalQuestions > 0
          ? (totalCompleted / cert.totalQuestions) * 100
          : 0,
        percentCorrect: totalCompleted > 0
          ? (totalCorrect / totalCompleted) * 100
          : 0,
      },
      lastUpdated: new Date().toISOString(),
    }

    saveProgress(newProgress)
  }

  return {
    progress,
    isLoaded,
    overallProgress: progress?.overallProgress || null,
    getTopicProgress,
    updateQuestionProgress,
    resetProgress,
    resetTopic,
  }
}
