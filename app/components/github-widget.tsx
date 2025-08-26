'use client'

import { useState, useEffect } from 'react'

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      email: string
      date: string
    }
    committer: {
      name: string
      email: string
      date: string
    }
  }
  author: {
    login: string
    avatar_url: string
  } | null
  html_url: string
}

export default function GitHubWidget() {
  const [commits, setCommits] = useState<GitHubCommit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [allCommits, setAllCommits] = useState<GitHubCommit[]>([])

  // Replace with your actual GitHub username and repo name
  const GITHUB_USERNAME = 'dillon-shearer'
  const REPO_NAME = 'dillon-shearer-website' // Update this to your actual repo name

  useEffect(() => {
    const fetchCommits = async () => {
      try {
        // Fetch more commits initially to get accurate monthly count
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits?per_page=100`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch commits')
        }

        const data = await response.json()
        setCommits(data)
      } catch (err) {
        console.error('Error fetching GitHub commits:', err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchCommits()
  }, [])

  const fetchAllCommits = async () => {
    setModalLoading(true)
    try {
      // Fetch up to 1000 commits for complete history
      let allCommitsData: GitHubCommit[] = []
      let page = 1
      const perPage = 100

      while (allCommitsData.length < 1000) {
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits?per_page=${perPage}&page=${page}`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch all commits')
        }

        const data = await response.json()
        
        if (data.length === 0) break // No more commits
        
        allCommitsData = [...allCommitsData, ...data]
        page++
      }

      setAllCommits(allCommitsData.slice(0, 1000)) // Limit to 1000 commits
    } catch (err) {
      console.error('Error fetching all commits:', err)
    } finally {
      setModalLoading(false)
    }
  }

  const handleCardClick = () => {
    setShowModal(true)
    if (allCommits.length === 0) {
      fetchAllCommits()
    }
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
      <div className="flex justify-center mt-16">
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-w-md w-full">
          <div className="animate-pulse text-center">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2 mx-auto"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-64 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || commits.length === 0) {
    return null // Hide widget if there's an error
  }

  const latestCommit = commits[0]
  const lastUpdated = new Date(latestCommit.commit.author.date)
  const timeAgo = formatTimeAgo(latestCommit.commit.author.date)

  // Count commits from this month (exact count)
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const commitsThisMonth = commits.filter(commit => {
    const commitDate = new Date(commit.commit.author.date)
    return commitDate.getMonth() === currentMonth && commitDate.getFullYear() === currentYear
  }).length

  // Clean up commit message (remove any prefixes, limit length)
  const commitMessage = latestCommit.commit.message
    .split('\n')[0] // Take first line only
    .substring(0, 60) // Limit length
    .trim()

  return (
    <>
      <div className="flex justify-center mt-16">
        <div 
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-w-md w-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          onClick={handleCardClick}
        >
          <div className="text-sm text-center">
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              Site Development
            </h3>
            <div className="text-gray-600 dark:text-gray-400 space-y-1">
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
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Commit History</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading commits...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {allCommits.map((commit, index) => (
                    <div key={commit.sha} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {commit.author && (
                              <img 
                                src={commit.author.avatar_url} 
                                alt={commit.author.login}
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {commit.author?.login || commit.commit.author.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(commit.commit.author.date)}
                            </span>
                          </div>
                          <p className="text-gray-800 dark:text-gray-200 mb-2 break-words">
                            {commit.commit.message.split('\n')[0]}
                          </p>
                          {commit.commit.message.split('\n').length > 1 && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                              {commit.commit.message.split('\n').slice(1).join('\n').trim()}
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
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                <span>Repository: {GITHUB_USERNAME}/{REPO_NAME}</span>
                <a 
                  href={`https://github.com/${GITHUB_USERNAME}/${REPO_NAME}`}
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