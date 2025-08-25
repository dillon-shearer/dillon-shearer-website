// app/components/notebook-viewer.tsx
'use client'

import { NotebookData, NotebookCell, type NotebookOutput as NotebookOutputType } from '@/types/notebook'
import { useEffect, useState } from 'react'

interface NotebookViewerProps {
  rawUrl: string
  title: string
}

export default function NotebookViewer({ rawUrl, title }: NotebookViewerProps) {
  const [notebook, setNotebook] = useState<NotebookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotebook = async () => {
      try {
        const response = await fetch(rawUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch notebook')
        }
        const data = await response.json()
        setNotebook(data)
      } catch (err) {
        setError('Failed to load notebook')
        console.error('Error fetching notebook:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotebook()
  }, [rawUrl])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded p-4">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !notebook) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Failed to Load Notebook</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {error || 'Unable to load the notebook content.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
        {notebook.metadata?.kernelspec && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
              {notebook.metadata.kernelspec.display_name}
            </span>
          </div>
        )}
      </div>

      {/* Notebook Cells */}
      <div className="space-y-4">
        {notebook.cells.map((cell, index) => (
          <NotebookCellComponent key={index} cell={cell} index={index} />
        ))}
      </div>
    </div>
  )
}

function NotebookCellComponent({ cell, index }: { cell: NotebookCell; index: number }) {
  const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source

  if (cell.cell_type === 'markdown') {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div 
            className="prose prose-gray dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
          />
        </div>
      </div>
    )
  }

  if (cell.cell_type === 'code') {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Input */}
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              In [{cell.execution_count || ' '}]:
            </span>
          </div>
        </div>
        <div className="p-4">
          <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-sm overflow-x-auto">
            <code className="language-python">{source}</code>
          </pre>
        </div>

        {/* Outputs */}
        {cell.outputs && cell.outputs.length > 0 && (
          <>
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                Out[{cell.execution_count || ' '}]:
              </span>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              {cell.outputs.map((output, outputIndex) => (
                <NotebookOutput key={outputIndex} output={output} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}

function NotebookOutput({ output }: { output: NotebookOutputType }) {
  // Handle different output types
  if (output.output_type === 'stream') {
    const text = Array.isArray(output.text) ? output.text.join('') : output.text || ''
    return (
      <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
        {text}
      </pre>
    )
  }

  if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
    const data = output.data

    if (!data) return null

    // Handle images
    if (data['image/png']) {
      return (
        <div className="flex justify-center p-4">
          <img 
            src={`data:image/png;base64,${data['image/png']}`}
            alt="Notebook output"
            className="max-w-full h-auto rounded shadow-sm"
          />
        </div>
      )
    }

    if (data['image/jpeg']) {
      return (
        <div className="flex justify-center p-4">
          <img 
            src={`data:image/jpeg;base64,${data['image/jpeg']}`}
            alt="Notebook output"
            className="max-w-full h-auto rounded shadow-sm"
          />
        </div>
      )
    }

    // Handle HTML (like pandas DataFrames)
    if (data['text/html']) {
      const html = Array.isArray(data['text/html']) ? data['text/html'].join('') : data['text/html']
      return (
        <div 
          className="overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )
    }

    // Handle plain text
    if (data['text/plain']) {
      const text = Array.isArray(data['text/plain']) ? data['text/plain'].join('') : data['text/plain']
      return (
        <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {text}
        </pre>
      )
    }
  }

  // Handle errors
  if (output.output_type === 'error') {
    const traceback = output.traceback ? output.traceback.join('\n') : 'An error occurred'
    return (
      <pre className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm whitespace-pre-wrap text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800">
        {traceback}
      </pre>
    )
  }

  return null
}

// Simple markdown renderer - you could use a library like marked or react-markdown for more features
function renderMarkdown(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>')

  return html
}