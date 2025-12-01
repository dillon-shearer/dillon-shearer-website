import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildKoreaderUrl,
  normalizeEndpoint,
  sendKoreaderCommand,
} from '@/lib/koreader/client'

test('normalizeEndpoint trims whitespace and prepends http', () => {
  assert.equal(normalizeEndpoint(' 192.168.1.7:8080 '), 'http://192.168.1.7:8080')
})

test('buildKoreaderUrl composes endpoint and action path', () => {
  const url = buildKoreaderUrl('http://192.168.0.5:9000', 'next')
  assert.equal(url, 'http://192.168.0.5:9000/koreader/event/GotoViewRel/1')
})

test('buildKoreaderUrl trims trailing slashes', () => {
  const url = buildKoreaderUrl('http://192.168.0.5:9000////', 'prev')
  assert.equal(url, 'http://192.168.0.5:9000/koreader/event/GotoViewRel/-1')
})

test('sendKoreaderCommand rejects when endpoint missing', async () => {
  const result = await sendKoreaderCommand('', 'next')
  assert.equal(result.ok, false)
  assert.equal(result.error, 'Kindle endpoint is not configured.')
})
