import { NextResponse } from 'next/server'

const DEFAULT_USER = 'dillon-shearer'
const DEFAULT_REPO = 'dillon-shearer-website'
const MAX_COMMITS = 200

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

export async function GET() {
  const username = process.env.GITHUB_USERNAME || DEFAULT_USER
  const repo = process.env.GITHUB_REPO || DEFAULT_REPO
  const token = process.env.GITHUB_TOKEN

  const url = new URL(`https://api.github.com/repos/${username}/${repo}/commits`)
  url.searchParams.set('per_page', '100')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch commits from GitHub' },
      { status: 502 }
    )
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

  return NextResponse.json(
    {
      repo: `${username}/${repo}`,
      fetchedAt: new Date().toISOString(),
      commits,
    },
    {
      headers: {
        'Cache-Control': 's-maxage=900, stale-while-revalidate=3600',
      },
    }
  )
}
