import { NextResponse } from 'next/server'

const DEFAULT_USER = 'dillon-shearer'
const DEFAULT_REPO = 'dillon-shearer-website'
const MAX_COMMITS = 200
const USER_AGENT = 'dillon-shearer-website'
const CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes

export const revalidate = 0
export const dynamic = 'force-dynamic'

type CommitShape = {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string }
    committer?: { date?: string }
  }
  author?: { login?: string; avatar_url?: string }
  html_url: string
}

type ActivityPayload = {
  repo: string
  fetchedAt: string
  commits: {
    sha: string
    message: string
    authorName: string
    authorLogin: string | null
    avatarUrl: string | null
    committedAt: string
    htmlUrl: string
  }[]
}

type CachedActivity = {
  data: ActivityPayload
  timestamp: number
}

let cachedActivity: CachedActivity | null = null
let inFlightRequest: Promise<ActivityPayload> | null = null

async function fetchFromGitHub(username: string, repo: string, token?: string) {
  const url = new URL(`https://api.github.com/repos/${username}/${repo}/commits`)
  url.searchParams.set('per_page', '100')

  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': USER_AGENT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`GitHub request failed (${response.status}): ${message}`)
  }

  const rawCommits = (await response.json()) as CommitShape[]
  const commits = rawCommits.slice(0, MAX_COMMITS).map(commit => ({
    sha: commit.sha,
    message: commit.commit.message,
    authorName: commit.commit.author?.name ?? 'Unknown',
    authorLogin: commit.author?.login ?? null,
    avatarUrl: commit.author?.avatar_url ?? null,
    committedAt: commit.commit.author?.date ?? commit.commit.committer?.date ?? '',
    htmlUrl: commit.html_url,
  }))

  return {
    repo: `${username}/${repo}`,
    fetchedAt: new Date().toISOString(),
    commits,
  }
}

async function getActivity(username: string, repo: string, token?: string) {
  const now = Date.now()
  if (cachedActivity && now - cachedActivity.timestamp < CACHE_TTL_MS) {
    return { data: cachedActivity.data, stale: false as const }
  }

  if (!inFlightRequest) {
    inFlightRequest = fetchFromGitHub(username, repo, token)
      .then(data => {
        cachedActivity = { data, timestamp: Date.now() }
        return data
      })
      .finally(() => {
        inFlightRequest = null
      })
  }

  try {
    const freshData = await inFlightRequest
    return { data: freshData, stale: false as const }
  } catch (error) {
    if (cachedActivity) {
      return { data: cachedActivity.data, stale: true as const }
    }
    throw error
  }
}

export async function GET() {
  const username = process.env.GITHUB_USERNAME || DEFAULT_USER
  const repo = process.env.GITHUB_REPO || DEFAULT_REPO
  const token = process.env.GITHUB_TOKEN

  try {
    const { data, stale } = await getActivity(username, repo, token)

    return NextResponse.json(
      { ...data, stale },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching GitHub activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commits from GitHub' },
      { status: 502 }
    )
  }
}
