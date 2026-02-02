'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getCertificationBySlug } from '@/lib/certifications'

export default function CaseStudyPage() {
  const params = useParams()
  const slug = params.slug as string
  const certification = getCertificationBySlug(slug)

  if (!certification?.caseStudy) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Case Study Not Found</h1>
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

  const caseStudy = certification.caseStudy

  return (
    <div className="bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Back Link */}
        <Link
          href={`/certifications/${slug}`}
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to {certification.shortName}
        </Link>

        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#54b3d6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold">Hands-On Case Study</h1>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white/90 mb-3">
            {caseStudy.title}
          </h2>
          <p className="text-base sm:text-xl text-white/70 mb-4">
            {caseStudy.description}
          </p>
          {caseStudy.estimatedTime && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#54b3d6]/10 border border-[#54b3d6]/20 rounded-full text-sm text-[#54b3d6]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Estimated Time: {caseStudy.estimatedTime}
            </div>
          )}
        </div>

        {/* Scenario */}
        <div className="mb-10 p-6 bg-gradient-to-br from-[#54b3d6]/5 to-transparent border border-white/10 rounded-xl">
          <h3 className="text-lg font-semibold text-[#54b3d6] mb-3">Scenario</h3>
          <p className="text-white/80 leading-relaxed">{caseStudy.scenario}</p>
        </div>

        {/* Prerequisites */}
        <div className="mb-10 p-6 bg-white/[0.03] border border-white/10 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Prerequisites</h3>
          <ul className="space-y-3">
            {caseStudy.prerequisites.map((prereq, idx) => (
              <li key={idx} className="flex items-start gap-3 text-white/70">
                <svg className="w-5 h-5 text-[#54b3d6] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{prereq}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Data Files */}
        <div className="mb-8 sm:mb-12 p-4 sm:p-6 bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20 rounded-xl">
          <h3 className="text-base sm:text-lg font-semibold text-green-400 mb-3 sm:mb-4">Download Data Files</h3>
          <p className="text-sm sm:text-base text-white/70 mb-4">
            Download all three data files in one convenient package. Extract the ZIP file and you'll have everything you need to complete the case study.
          </p>
          <a
            href="/api/certifications/pl-300/data-export"
            download="pl300-gym-data.zip"
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm sm:text-base text-green-400 hover:bg-green-500/20 hover:border-green-500/50 transition-all font-semibold w-full sm:w-auto"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="whitespace-nowrap">Download All Data Files (ZIP)</span>
          </a>

          <div className="mt-4 sm:mt-6 space-y-3">
            <h4 className="text-xs sm:text-sm font-semibold text-white/70">Included Files:</h4>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <h5 className="font-semibold text-white text-sm">workout_sets.csv</h5>
                    <p className="text-xs text-white/60 mt-1">Fact table with all workout sets (date, exercise, weight, reps, etc.)</p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <h5 className="font-semibold text-white text-sm">dim_exercises.csv</h5>
                    <p className="text-xs text-white/60 mt-1">Dimension table with exercise names and body part mappings</p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <h5 className="font-semibold text-white text-sm">dim_body_parts.csv</h5>
                    <p className="text-xs text-white/60 mt-1">Dimension table with muscle group reference data</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Steps */}
        <div>
          <h3 className="text-2xl font-bold mb-6">Implementation Steps</h3>
          <div className="space-y-4">
            {caseStudy.steps.map((step) => (
              <details
                key={step.stepNumber}
                className="group bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
              >
                <summary className="cursor-pointer p-4 sm:p-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#54b3d6]/10 border border-[#54b3d6]/20 text-[#54b3d6] font-bold text-base sm:text-lg flex-shrink-0">
                      {step.stepNumber}
                    </div>
                    <h4 className="font-semibold text-base sm:text-lg text-white group-hover:text-[#54b3d6] transition-colors min-w-0 break-words">
                      {step.title}
                    </h4>
                  </div>
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-white/50 transition-transform group-open:rotate-180 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-5 border-t border-white/5">
                  <div className="pt-4 sm:pt-5">
                    <h5 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Instructions</h5>
                    <p className="text-sm sm:text-base text-white/80 leading-relaxed break-words">{step.description}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Expected Outcome</h5>
                    <p className="text-sm sm:text-base text-white/70 leading-relaxed break-words">{step.expectedOutcome}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Validation</h5>
                    <p className="text-sm sm:text-base text-green-400/80 leading-relaxed break-words">{step.validation}</p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 sm:mt-16 p-6 sm:p-8 bg-gradient-to-br from-[#54b3d6]/10 to-transparent border border-[#54b3d6]/20 rounded-2xl text-center">
          <h3 className="text-xl sm:text-2xl font-bold mb-3">Ready to Get Started?</h3>
          <p className="text-sm sm:text-base text-white/70 mb-6 max-w-2xl mx-auto">
            Download the data files, fire up Power BI Desktop, and work through each step. This hands-on experience will reinforce the concepts you've learned and prepare you for the real exam.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <a
              href="/api/certifications/pl-300/data-export"
              download="pl300-gym-data.zip"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-[#54b3d6] text-black font-semibold rounded-lg hover:bg-[#54b3d6]/90 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="whitespace-nowrap">Download Data Files</span>
            </a>
            <Link
              href={`/certifications/${slug}`}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-white/5 border border-white/20 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Back to Practice Questions
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
