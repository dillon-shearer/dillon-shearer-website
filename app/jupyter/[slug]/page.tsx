// app/jupyter/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getAllNotebooks, getNotebookBySlug } from '@/lib/notebooks'
import NotebookViewer from '@/app/components/notebook-viewer'

type Params = {
  params: Promise<{
    slug: string
  }>
}

export async function generateStaticParams() {
  const notebooks = getAllNotebooks()
  return notebooks.map((notebook) => ({
    slug: notebook.slug,
  }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const notebook = getNotebookBySlug(slug)
  
  if (!notebook) {
    return {
      title: 'Notebook Not Found | DWD'
    }
  }

  return {
    title: `${notebook.title} | DWD`,
    description: notebook.description,
    openGraph: {
      title: `${notebook.title} | Data With Dillon`,
      description: notebook.description,
      type: 'article',
    },
  }
}

export default async function NotebookPage({ params }: Params) {
  const { slug } = await params
  const notebook = getNotebookBySlug(slug)

  if (!notebook) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Navigation Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a 
                href="/jupyter" 
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                ← Back to Notebooks
              </a>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="font-medium text-gray-900 dark:text-white truncate">
                {notebook.title}
              </h1>
            </div>
            
            <a
              href={notebook.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View Source
            </a>
          </div>
        </div>
      </div>

      {/* Notebook Content */}
      <NotebookViewer rawUrl={notebook.rawUrl} title={notebook.title} />
    </div>
  )
}