import assert from 'node:assert/strict'
import { test } from 'node:test'

import capHandler from '../cap.js'

test('CapJS validate returns a normal validation error before rate limiting', async () => {
  const response = await capHandler(
    new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.40',
      },
      body: JSON.stringify({}),
    }),
    {},
  )

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { success: false })
})

test('CapJS endpoints return 429 after repeated same-source traffic', async () => {
  let response

  for (let requestCount = 0; requestCount < 21; requestCount += 1) {
    response = await capHandler(
      new Request('https://loumarcsigns.com/api/challenge', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '203.0.113.41',
        },
      }),
      {},
    )
  }

  assert.equal(response.status, 429)
  assert.equal(response.headers.get('x-rate-limit-policy'), 'cap-challenge')
  assert.equal(response.headers.get('x-rate-limit-result'), 'blocked')
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Too many requests',
    retryAfter: 60,
  })
})
