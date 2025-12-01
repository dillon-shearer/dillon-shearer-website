import { NextResponse } from 'next/server'
import { Agent as UndiciAgent, fetch as undiciFetch } from 'undici'
import { buildKoreaderUrl, normalizeEndpoint, type KoreaderActionId } from '@/lib/koreader/client'

type KoreaderProxyCommand = {
  kind: 'command'
  endpoint: string
  actionId: KoreaderActionId
}

type KoreaderProxyWarm = {
  kind: 'warm'
  endpoint: string
}

type KoreaderProxyRequest = KoreaderProxyCommand | KoreaderProxyWarm

const REQUEST_TIMEOUT_MS = 5000
const KEEP_ALIVE_TIMEOUT_MS = 60_000

const agentCache = new Map<string, UndiciAgent>()

function getDispatcher(url: URL) {
  const key = `${url.protocol}//${url.host}`
  const existing = agentCache.get(key)
  if (existing) return existing

  const agent = new UndiciAgent({
    keepAliveTimeout: KEEP_ALIVE_TIMEOUT_MS,
    keepAliveMaxTimeout: KEEP_ALIVE_TIMEOUT_MS,
  })
  agentCache.set(key, agent)
  return agent
}

function resolveTargetUrl(payload: KoreaderProxyRequest): URL {
  const normalizedEndpoint = normalizeEndpoint(payload.endpoint)
  if (!normalizedEndpoint) {
    throw new Error('Kindle endpoint not provided')
  }

  if (payload.kind === 'command') {
    return new URL(buildKoreaderUrl(normalizedEndpoint, payload.actionId))
  }
  return new URL(normalizedEndpoint)
}

export async function POST(request: Request) {
  let payload: KoreaderProxyRequest

  try {
    payload = (await request.json()) as KoreaderProxyRequest
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid KOReader proxy payload.' }, { status: 400 })
  }

  if (!payload?.endpoint || !payload.kind) {
    return NextResponse.json(
      { ok: false, error: 'KOReader endpoint and kind are required.' },
      { status: 400 }
    )
  }

  let targetUrl: URL
  try {
    targetUrl = resolveTargetUrl(payload)
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Invalid KOReader endpoint.' },
      { status: 400 }
    )
  }

  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    return NextResponse.json({ ok: false, error: 'Only HTTP(S) endpoints are supported.' }, { status: 400 })
  }

  const dispatcher = getDispatcher(targetUrl)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const upstreamResponse = await undiciFetch(targetUrl, {
      method: 'GET',
      headers: {
        Connection: 'keep-alive',
      },
      dispatcher,
      signal: controller.signal,
    })
    const raw = await upstreamResponse.arrayBuffer().catch(() => undefined)
    if (!upstreamResponse.ok) {
      const detail = raw ? Buffer.from(raw).toString('utf8').trim() : ''
      return NextResponse.json(
        {
          ok: false,
          error: detail || `KOReader responded with status ${upstreamResponse.status}.`,
        },
        { status: upstreamResponse.status },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { ok: false, error: 'KOReader request timed out before responding.' },
        { status: 504 },
      )
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown KOReader proxy error.',
      },
      { status: 502 },
    )
  } finally {
    clearTimeout(timeout)
  }
}
