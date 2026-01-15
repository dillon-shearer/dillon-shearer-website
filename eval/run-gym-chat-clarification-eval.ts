import { strict as assert } from 'node:assert'

import { POST } from '../app/api/gym-chat/route'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type ConversationState = {
  pendingClarification?: { kind: 'return_for_effort_metric' } | null
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

const runClarificationEval = async () => {
  const messages: ChatMessage[] = []
  let conversationState: ConversationState = {}

  const send = async (content: string) => {
    messages.push({ role: 'user', content })
    const response = await POST(buildRequest(messages, conversationState))
    const data = await response.json()
    const assistantMessage = typeof data?.assistantMessage === 'string' ? data.assistantMessage : ''
    messages.push({ role: 'assistant', content: assistantMessage })
    conversationState = data?.conversationState ?? {}
    return { response, data, assistantMessage }
  }

  const first = await send('Which exercises are giving me the most return for effort?')
  assert.match(first.assistantMessage.toLowerCase(), /return for effort/)
  assert.equal(conversationState.pendingClarification?.kind, 'return_for_effort_metric')

  const second = await send('b. progression over time')
  assert.ok(!conversationState.pendingClarification)
  assert.ok(!/return for effort/.test(second.assistantMessage.toLowerCase()))

  const third = await send('Which lifts have stalled, and for how long?')
  assert.ok(!/return for effort/.test(third.assistantMessage.toLowerCase()))

  const shortReply = await send('b')
  assert.ok(!conversationState.pendingClarification)
  assert.ok(!/return for effort/.test(shortReply.assistantMessage.toLowerCase()))

  const volumeReply = await send('volume')
  assert.ok(!conversationState.pendingClarification)
  assert.ok(!/return for effort/.test(volumeReply.assistantMessage.toLowerCase()))

  console.log('Gym Chat clarification eval passed.')
}

runClarificationEval().catch(error => {
  console.error('Gym Chat clarification eval failed.', error)
  process.exit(1)
})
