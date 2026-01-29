import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import ResumePDF from '@/app/components/resume-pdf'
import { getResumeData, isValidVariant } from '@/lib/resume-data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!isValidVariant(slug)) {
    return NextResponse.json(
      { error: 'Invalid resume variant' },
      { status: 404 }
    )
  }

  const data = getResumeData(slug)
  if (!data) {
    return NextResponse.json(
      { error: 'Resume data not found' },
      { status: 404 }
    )
  }

  try {
    const pdfBuffer = await renderToBuffer(
      ResumePDF({
        contact: data.contact,
        meta: data.meta,
        experiences: data.experiences,
        education: data.education,
        certifications: data.certifications,
        skillsSpotlight: data.skillsSpotlight,
        projects: data.projects,
      })
    )

    const filename = `Dillon_Shearer_Resume_${data.meta.displayName.replace(/\s+/g, '_')}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
