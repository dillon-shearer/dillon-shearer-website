import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ResumeView from '@/app/components/resume-view'
import DownloadButton from './print-button'
import {
  ALL_VARIANTS,
  getResumeData,
  getVariantMeta,
  isValidVariant,
} from '@/lib/resume-data'

interface Props {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return ALL_VARIANTS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (!isValidVariant(slug)) return {}
  const meta = getVariantMeta(slug)
  if (!meta) return {}

  return {
    title: `${meta.displayName} Resume | Dillon Shearer`,
    description: meta.summary,
    openGraph: {
      title: `${meta.displayName} Resume | Data With Dillon`,
      description: meta.summary,
      type: 'website',
    },
  }
}

export default async function ResumePage({ params }: Props) {
  const { slug } = await params
  if (!isValidVariant(slug)) notFound()

  const data = getResumeData(slug)
  if (!data) notFound()

  return (
    <div className="min-h-screen print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto px-6 py-10 print:px-0 print:py-0 print:max-w-none">
        {/* Top bar — hidden in print */}
        <div className="flex items-center justify-between mb-10 print:hidden">
          <Link
            href="/resumes"
            className="link-primary inline-flex items-center gap-2 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            All Resumes
          </Link>
          <DownloadButton slug={slug} />
        </div>

        {/* Resume */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-8 lg:p-12 print:border-0 print:p-0 print:rounded-none print:bg-white">
          <ResumeView {...data} />
        </div>
      </div>
    </div>
  )
}
