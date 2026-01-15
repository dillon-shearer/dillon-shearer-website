import { strict as assert } from 'node:assert'

import { POST } from '../app/api/gym-chat/route'

const runTopEndCompareEval = async () => {
  const request = new Request('http://localhost/api/gym-chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-gym-chat-eval': '1',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'Compare top-end efforts over the last 12 months vs the last 3 months?',
        },
      ],
      client: { timezone: 'UTC' },
      conversationState: {},
    }),
  })

  const response = await POST(request)
  const data = await response.json()
  const queries = Array.isArray(data?.queries) ? data.queries : []
  const params = queries.flatMap((query: { params?: unknown[] }) => query.params ?? [])
  const has12 = params.some(value => String(value).toLowerCase().includes('12 months'))
  const has3 = params.some(value => String(value).toLowerCase().includes('3 months'))

  assert.ok(has12, 'Expected at least one 12 months query.')
  assert.ok(has3, 'Expected at least one 3 months query.')
  assert.equal(data?.conversationState?.lastAnalysis?.kind, 'top_end_efforts_compare_12m_3m')

  console.log('Gym Chat top-end comparison eval passed.')
}

runTopEndCompareEval().catch(error => {
  console.error('Gym Chat top-end comparison eval failed.', error)
  process.exit(1)
})
