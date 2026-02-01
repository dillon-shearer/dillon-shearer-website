// types/certification.ts

export type QuestionType =
  | 'true-false'
  | 'multiple-choice'
  | 'multiple-select'
  | 'open-text'
  | 'drag-and-drop'
  | 'matching'
  | 'fill-in-blank'

export interface BaseQuestion {
  id: string
  type: QuestionType
  question: string
  explanation?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  tags?: string[]
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false'
  correctAnswer: boolean
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice'
  options: string[]
  correctAnswer: number // index of correct option
}

export interface MultipleSelectQuestion extends BaseQuestion {
  type: 'multiple-select'
  options: string[]
  correctAnswers: number[] // indices of correct options
}

export interface OpenTextQuestion extends BaseQuestion {
  type: 'open-text'
  acceptedAnswers: string[] // keywords or exact matches
  caseSensitive?: boolean
}

export interface DragAndDropQuestion extends BaseQuestion {
  type: 'drag-and-drop'
  items: string[]
  dropZones: {
    id: string
    label: string
    acceptedItems: string[] // item indices or ids
  }[]
  correctMapping: Record<string, string> // itemId -> dropZoneId
}

export interface MatchingQuestion extends BaseQuestion {
  type: 'matching'
  leftItems: { id: string; text: string }[]
  rightItems: { id: string; text: string }[]
  correctMatches: Record<string, string> // leftId -> rightId
}

export interface FillInBlankQuestion extends BaseQuestion {
  type: 'fill-in-blank'
  template: string // e.g., "Power BI uses ____ to transform data"
  blanks: {
    id: string
    acceptedAnswers: string[]
    caseSensitive?: boolean
  }[]
}

export type Question =
  | TrueFalseQuestion
  | MultipleChoiceQuestion
  | MultipleSelectQuestion
  | OpenTextQuestion
  | DragAndDropQuestion
  | MatchingQuestion
  | FillInBlankQuestion

export interface Topic {
  id: string
  title: string
  description: string
  questions: Question[]
  estimatedTime?: string // e.g., "15 minutes"
}

export interface CaseStudyStep {
  stepNumber: number
  title: string
  description: string // High-level instructions
  expectedOutcome: string // What should happen after completing this step
  validation: string // How to verify it was done correctly
  keyTopics?: string[] // Optional: key concepts covered
}

export interface CaseStudy {
  title: string
  description: string
  scenario: string // Business context
  prerequisites: string[]
  dataFiles?: {
    name: string
    description: string
    downloadUrl?: string
  }[]
  steps: CaseStudyStep[]
  estimatedTime?: string
}

export interface Certification {
  slug: string
  name: string
  shortName: string // e.g., "PL-300"
  description: string
  provider: string // e.g., "Microsoft"
  topics: Topic[]
  caseStudy?: CaseStudy // Optional hands-on case study
  totalQuestions: number
  passingScore?: number // percentage
  officialUrl?: string
  icon?: string
}

// Progress tracking interfaces
export interface QuestionProgress {
  questionId: string
  completed: boolean
  correct: boolean | null
  attempts: number
  lastAttempted?: string // ISO date
}

export interface TopicProgress {
  topicId: string
  questionsCompleted: number
  questionsCorrect: number
  totalQuestions: number
  lastActivity?: string // ISO date
}

export interface CertificationProgress {
  certificationSlug: string
  topics: Record<string, TopicProgress>
  overallProgress: {
    totalQuestions: number
    questionsCompleted: number
    questionsCorrect: number
    percentComplete: number
    percentCorrect: number
  }
  lastUpdated: string // ISO date
}

// Answer types for submissions
export type QuestionAnswer =
  | { type: 'true-false'; answer: boolean }
  | { type: 'multiple-choice'; answer: number }
  | { type: 'multiple-select'; answers: number[] }
  | { type: 'open-text'; answer: string }
  | { type: 'drag-and-drop'; mapping: Record<string, string> }
  | { type: 'matching'; matches: Record<string, string> }
  | { type: 'fill-in-blank'; answers: Record<string, string> }
