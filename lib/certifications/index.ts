import { Certification } from '@/types/certification'
import { pl300 } from './pl-300'

// Import all certifications here
const certifications: Certification[] = [
  pl300,
  // Add new certifications here
]

// Calculate total questions for each certification
certifications.forEach((cert) => {
  cert.totalQuestions = cert.topics.reduce(
    (sum, topic) => sum + topic.questions.length,
    0
  )
})

export function getAllCertifications(): Certification[] {
  return certifications
}

export function getCertificationBySlug(slug: string): Certification | undefined {
  return certifications.find((cert) => cert.slug === slug)
}

export function getTopicById(
  certificationSlug: string,
  topicId: string
): { certification: Certification; topic: any } | undefined {
  const cert = getCertificationBySlug(certificationSlug)
  if (!cert) return undefined

  const topic = cert.topics.find((t) => t.id === topicId)
  if (!topic) return undefined

  return { certification: cert, topic }
}
