import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { POST } from '../app/api/gym-chat/route'

type EvalQuestion = {
  intentType?: string
  question: string
  expectedTemplate: string
  mustInclude: string[]
  mustNotInclude: string[]
}

type EvalResult = {
  intentType?: string
  question: string
  expectedTemplate: string
  classificationIntent: string | null
  selectedTemplate: string | null
  secondaryTemplate: string | null
  queryCount: number | null
  fallbackCitationsApplied: boolean | null
  finalMessageLength: number
  mustIncludeMissing: string[]
  mustNotIncludeHits: string[]
  refusal: unknown
  error: string | null
}

const DATASET_PATH = path.join(process.cwd(), 'eval', 'gym-chat-questions.json')
const RESULTS_DIR = path.join(process.cwd(), 'eval', 'results')

const parseBooleanHeader = (value: string | null) => {
  if (!value) return null
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

const parseNumberHeader = (value: string | null) => {
  if (!value) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const runEval = async () => {
  const raw = await readFile(DATASET_PATH, 'utf-8')
  const dataset = JSON.parse(raw) as EvalQuestion[]
  await mkdir(RESULTS_DIR, { recursive: true })

  const results: EvalResult[] = []

  for (const entry of dataset) {
    const payload = {
      messages: [{ role: 'user', content: entry.question }],
      client: { timezone: 'UTC' },
    }
    const request = new Request('http://localhost/api/gym-chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-gym-chat-eval': '1',
      },
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    const data = await response.json()
    const assistantMessage = typeof data?.assistantMessage === 'string' ? data.assistantMessage : ''
    const lowered = assistantMessage.toLowerCase()
    const mustIncludeMissing = entry.mustInclude.filter(term => !lowered.includes(term.toLowerCase()))
    const mustNotIncludeHits = entry.mustNotInclude.filter(term => lowered.includes(term.toLowerCase()))

    results.push({
      intentType: entry.intentType,
      question: entry.question,
      expectedTemplate: entry.expectedTemplate,
      classificationIntent: response.headers.get('x-gym-chat-intent'),
      selectedTemplate: response.headers.get('x-gym-chat-template'),
      secondaryTemplate: response.headers.get('x-gym-chat-secondary-template'),
      queryCount:
        parseNumberHeader(response.headers.get('x-gym-chat-query-count')) ??
        (Array.isArray(data?.queries) ? data.queries.length : null),
      fallbackCitationsApplied: parseBooleanHeader(response.headers.get('x-gym-chat-fallback-citations')),
      finalMessageLength: assistantMessage.length,
      mustIncludeMissing,
      mustNotIncludeHits,
      refusal: data?.refusal ?? null,
      error: typeof data?.error === 'string' ? data.error : null,
    })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputPath = path.join(RESULTS_DIR, `${timestamp}.json`)
  await writeFile(outputPath, JSON.stringify({ generatedAt: timestamp, results }, null, 2), 'utf-8')
  console.log(`Wrote eval results to ${outputPath}`)
}

runEval().catch(error => {
  console.error('Eval run failed', error)
  process.exit(1)
})
