import { strict as assert } from 'node:assert'

import { POST } from '../app/api/gym-chat/route'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type ConversationState = {
  pendingClarification?: { kind: 'return_for_effort_metric' } | null
  lastAnalysis?: { kind?: string }
}

const buildRequest = (messages: ChatMessage[], conversationState: ConversationState) =>
  new Request('http://localhost/api/gym-chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-gym-chat-eval': '1',
    },
    body: JSON.stringify({
      messages,
      client: { timezone: 'UTC' },
      conversationState,
    }),
  })

const createSession = () => {
  const messages: ChatMessage[] = []
  let conversationState: ConversationState = {}

  const send = async (content: string) => {
    messages.push({ role: 'user', content })
    const response = await POST(buildRequest(messages, conversationState))
    const data = await response.json()
    const assistantMessage = typeof data?.assistantMessage === 'string' ? data.assistantMessage : ''
    messages.push({ role: 'assistant', content: assistantMessage })
    conversationState = data?.conversationState ?? {}
    return { response, data, assistantMessage, conversationState }
  }

  return { send }
}

const runSequenceA = async () => {
  const session = createSession()
  const first = await session.send('Which exercises are giving me the most return for effort?')
  assert.equal(first.conversationState.pendingClarification?.kind, 'return_for_effort_metric')

  const second = await session.send('b. progression over time')
  assert.ok(!second.conversationState.pendingClarification)
  assert.equal(second.conversationState.lastAnalysis?.kind, 'return_for_effort_progression')

  const third = await session.send('Which lifts have stalled, and for how long?')
  assert.ok(!/return for effort/.test(third.assistantMessage.toLowerCase()))
  assert.equal(third.conversationState.lastAnalysis?.kind, 'stalled_lifts')

  const fourth = await session.send('Drill into the Incline Press performance trends over the last year?')
  assert.ok(!/return for effort/.test(fourth.assistantMessage.toLowerCase()))
}

const runSequenceB = async () => {
  const session = createSession()
  const first = await session.send('Which exercises had the most total sets in the last 90 days?')
  assert.equal(first.conversationState.lastAnalysis?.kind, 'set_count')

  const second = await session.send('Compare top-end efforts over the last 12 months vs the last 3 months?')
  assert.equal(second.conversationState.lastAnalysis?.kind, 'top_end_efforts_compare_12m_3m')

  const third = await session.send('How many sessions did I log in the last 8 weeks?')
  assert.equal(third.conversationState.lastAnalysis?.kind, 'session_count')
}

const runSequenceC = async () => {
  const session = createSession()
  const first = await session.send('Which exercises are giving me the most return for effort?')
  assert.equal(first.conversationState.pendingClarification?.kind, 'return_for_effort_metric')

  const second = await session.send('?')
  assert.ok(!second.conversationState.pendingClarification)
  assert.ok(!/return for effort/.test(second.assistantMessage.toLowerCase()))
}

const runMultiTurnEval = async () => {
  await runSequenceA()
  await runSequenceB()
  await runSequenceC()
  console.log('Gym Chat multi-turn eval passed.')
}

runMultiTurnEval().catch(error => {
  console.error('Gym Chat multi-turn eval failed.', error)
  process.exit(1)
})
