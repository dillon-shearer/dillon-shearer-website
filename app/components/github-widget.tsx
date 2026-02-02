'use client'

import { useEffect, useState } from 'react'

interface RepoCommit {
  sha: string
  message: string
  authorName: string
  authorLogin: string | null
  avatarUrl: string | null
  committedAt: string
  htmlUrl: string
}

interface ActivityResponse {
  commits: RepoCommit[]
  repo: string
  fetchedAt: string
  stale?: boolean
}

export default function GitHubWidget() {
  const [commits, setCommits] = useState<RepoCommit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [repoName, setRepoName] = useState('dillon-shearer/dillon-shearer-website')
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadActivity() {
      try {
        const response = await fetch('/api/github-activity', { signal: controller.signal })
        if (!response.ok) throw new Error('Request failed')
        const data = (await response.json()) as ActivityResponse
        setCommits(data.commits)
        setRepoName(data.repo)
        setIsStale(Boolean(data.stale))
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error fetching GitHub activity:', err)
          setError(true)
        }
      } finally {
        setLoading(false)
      }
    }

    loadActivity()
    return () => controller.abort()
  }, [])

  const handleCardClick = () => {
    if (!commits.length) return
    setShowModal(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex justify-center">
        <div className="card-base max-w-md w-full p-6">
          <div className="animate-pulse text-center">
            <div className="h-4 rounded w-32 mb-2 mx-auto" style={{ backgroundColor: 'var(--bg-subtle)' }}></div>
            <div className="h-3 rounded w-64 mx-auto" style={{ backgroundColor: 'var(--bg-subtle)' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && (error || commits.length === 0)) {
    return (
      <div className="flex justify-center">
        <div className="card-base max-w-md w-full p-6 text-center">
          <h3 className="font-semibold mb-2 text-white">GitHub Activity Unavailable</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            GitHub is rate-limiting or unreachable right now. Please try again in a few minutes.
          </p>
        </div>
      </div>
    )
  }

  const latestCommit = commits[0]
  const timeAgo = formatTimeAgo(latestCommit.committedAt)

  // Count commits from this month (exact count)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const commitsThisMonth = commits.filter(commit => {
    const commitDate = new Date(commit.committedAt)
    return commitDate.getMonth() === currentMonth && commitDate.getFullYear() === currentYear
  }).length

  const commitMessage = latestCommit.message
    .split('\n')[0] // Take first line only
    .substring(0, 60) // Limit length
    .trim()

  return (
    <>
      <div className="flex justify-center">
        <div
          className="card-base card-hover max-w-md w-full p-6 cursor-pointer"
          onClick={handleCardClick}
        >
          <div className="text-sm text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="font-semibold text-white">
                Site Development
              </h3>
              {isStale && (
                <span className="badge-base badge-secondary text-[10px]">
                  cached
                </span>
              )}
            </div>
            <div className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <div>
                Last updated: {timeAgo} • {commitsThisMonth} commit{commitsThisMonth === 1 ? '' : 's'} this month
              </div>
              <div>
                Latest: "{commitMessage}"
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Commit History Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl border max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)'
          }}>
            {/* Header */}
            <div className="sticky top-0 border-b px-6 py-4 flex justify-between items-center" style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-primary)'
            }}>
              <h2 className="text-2xl font-bold text-white">Commit History</h2>
              <button
                onClick={() => setShowModal(false)}
                className="transition-colors hover:text-[--brand-cyan]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {commits.map(commit => (
                  <div key={commit.sha} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {commit.avatarUrl && (
                            <img 
                              src={commit.avatarUrl} 
                              alt={commit.authorLogin ?? commit.authorName}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {commit.authorLogin || commit.authorName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(commit.committedAt)}
                          </span>
                        </div>
                        <p className="text-gray-800 dark:text-gray-200 mb-2 break-words">
                          {commit.message.split('\n')[0]}
                        </p>
                        {commit.message.split('\n').length > 1 && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                            {commit.message.split('\n').slice(1).join('\n').trim()}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-mono">{commit.sha.substring(0, 7)}</span>
                          <a 
                            href={commit.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            View on GitHub →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                <span>Repository: {repoName}</span>
                <a 
                  href={`https://github.com/${repoName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  View Repository →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
