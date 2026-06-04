import assert from 'node:assert/strict'
import { test } from 'node:test'

import capHandler from '../cap.js'
import { RATE_LIMIT_POLICIES } from './rate-limit.js'

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

test('CapJS endpoints return 429 after repeated same-source traffic', async (t) => {
  t.mock.method(Date, 'now', () => 1000)
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

test('CapJS validate trusts the internal source header for fallback limiting', async () => {
  const originalLimit = RATE_LIMIT_POLICIES.capValidate.max
  RATE_LIMIT_POLICIES.capValidate.max = 1

  try {
    const firstResponse = await capHandler(
      new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-loumarc-client-source': '203.0.113.60',
        },
        body: JSON.stringify({}),
      }),
      { ip: '198.51.100.60' },
    )
    const secondResponse = await capHandler(
      new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-loumarc-client-source': '203.0.113.61',
        },
        body: JSON.stringify({}),
      }),
      { ip: '198.51.100.60' },
    )

    assert.equal(firstResponse.status, 400)
    assert.equal(secondResponse.status, 400)
  } finally {
    RATE_LIMIT_POLICIES.capValidate.max = originalLimit
  }
})
