'use client'

import { Question } from '@/types/certification'
import TrueFalseQuestion from './TrueFalseQuestion'
import MultipleChoiceQuestion from './MultipleChoiceQuestion'
import MultipleSelectQuestion from './MultipleSelectQuestion'
import OpenTextQuestion from './OpenTextQuestion'
import FillInBlankQuestion from './FillInBlankQuestion'
import MatchingQuestion from './MatchingQuestion'
import DragAndDropQuestion from './DragAndDropQuestion'

interface QuestionRendererProps {
  question: Question
  onAnswer: (correct: boolean) => void
  showExplanation: boolean
}

export default function QuestionRenderer({
  question,
  onAnswer,
  showExplanation,
}: QuestionRendererProps) {
  switch (question.type) {
    case 'true-false':
      return (
        <TrueFalseQuestion
          question={question}
          onAnswer={onAnswer}
          showExplanation={showExplanation}
        />
      )

    case 'multiple-choice':
      return (
        <MultipleChoiceQuestion
          question={question}
          onAnswer={onAnswer}
          showExplanation={showExplanation}
        />
      )

    case 'multiple-select':
      return (
        <MultipleSelectQuestion
          question={question}
          onAnswer={onAnswer}
          showExplanation={showExplanation}
        />
      )

    case 'open-text':
      return (
        <OpenTextQuestion
          question={question}
          onAnswer={onAnswer}
          showExplanation={showExplanation}
        />
      )

    case 'fill-in-blank':
      return (
        <FillInBlankQuestion
          question={question}
          onAnswer={onAnswer}
          showExplanation={showExplanation}
        />
      )

    case 'matching':
      return (
        <MatchingQuestion
          question={question}
          onAnswer={onAnswer}
          showExplanation={showExplanation}
        />
      )

    case 'drag-and-drop':
      return (
        <DragAndDropQuestion
          question={question}
          onAnswer={onAnswer}
          showExplanation={showExplanation}
        />
      )

    default:
      return (
        <div className="p-8 rounded-xl border border-red-500/20 bg-red-500/10 text-center">
          <p className="text-red-300">Unknown question type</p>
        </div>
      )
  }
}
