'use client'

import { useState, useEffect } from 'react'

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      date: string
    }
  }
}

export default function GitHubWidget() {
  const [commits, setCommits] = useState<GitHubCommit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Replace with your actual GitHub username and repo name
  const GITHUB_USERNAME = 'dillon-shearer'
  const REPO_NAME = 'dillon-shearer-website' // Update this to your actual repo name

  useEffect(() => {
    const fetchCommits = async () => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/commits?per_page=10`,
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
  const now = new Date()

  // Calculate time ago
  const diffInSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  let timeAgo: string
  if (diffInMinutes < 1) {
    timeAgo = 'just now'
  } else if (diffInMinutes < 60) {
    timeAgo = `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  } else if (diffInHours < 24) {
    timeAgo = `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  } else if (diffInDays < 7) {
    timeAgo = `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  } else {
    timeAgo = lastUpdated.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  // Count commits from this month
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
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
    <div className="flex justify-center mt-16">
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-w-md w-full">
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
  )
}