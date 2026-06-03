import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  checkRateLimit,
  createRateLimitResponse,
  getRequestSource,
  RATE_LIMIT_POLICIES,
} from './rate-limit.js'

test('allows requests up to the policy limit and blocks the next one', () => {
  const store = new Map()
  const policy = { name: 'test-policy', windowMs: 60000, max: 2 }

  assert.equal(
    checkRateLimit({ policy, source: '203.0.113.10', now: 1000, store })
      .allowed,
    true,
  )
  assert.equal(
    checkRateLimit({ policy, source: '203.0.113.10', now: 2000, store })
      .allowed,
    true,
  )

  const blocked = checkRateLimit({
    policy,
    source: '203.0.113.10',
    now: 3000,
    store,
  })

  assert.equal(blocked.allowed, false)
  assert.equal(blocked.count, 3)
  assert.equal(blocked.remaining, 0)
  assert.equal(blocked.retryAfterSeconds, 58)
})

test('resets a source after the window expires', () => {
  const store = new Map()
  const policy = { name: 'test-policy', windowMs: 60000, max: 1 }

  assert.equal(
    checkRateLimit({ policy, source: '203.0.113.11', now: 1000, store })
      .allowed,
    true,
  )
  assert.equal(
    checkRateLimit({ policy, source: '203.0.113.11', now: 2000, store })
      .allowed,
    false,
  )
  assert.equal(
    checkRateLimit({ policy, source: '203.0.113.11', now: 62000, store })
      .allowed,
    true,
  )
})

test('tracks policies independently for the same source', () => {
  const store = new Map()
  const source = '203.0.113.12'

  const formsResult = checkRateLimit({
    policy: { ...RATE_LIMIT_POLICIES.formsSubmit, max: 1 },
    source,
    now: 1000,
    store,
  })
  const challengeResult = checkRateLimit({
    policy: { ...RATE_LIMIT_POLICIES.capChallenge, max: 1 },
    source,
    now: 1000,
    store,
  })

  assert.equal(formsResult.allowed, true)
  assert.equal(challengeResult.allowed, true)
})

test('prefers Netlify context IP and falls back to proxy headers', () => {
  const request = new Request('https://example.com/api/challenge', {
    headers: {
      'x-forwarded-for': '203.0.113.20, 198.51.100.4',
    },
  })

  assert.equal(
    getRequestSource(request, { ip: '203.0.113.30' }),
    '203.0.113.30',
  )
  assert.equal(getRequestSource(request), '203.0.113.20')
})

test('blocked responses use 429 and expose retry headers', async () => {
  const result = {
    allowed: false,
    count: 3,
    limit: 2,
    policy: 'test-policy',
    remaining: 0,
    resetAt: 61000,
    retryAfterSeconds: 58,
    sourceHash: '00000000',
    windowSeconds: 60,
  }
  const response = createRateLimitResponse(result)

  assert.equal(response.status, 429)
  assert.equal(response.headers.get('retry-after'), '58')
  assert.equal(response.headers.get('x-rate-limit-result'), 'blocked')
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Too many requests',
    retryAfter: 58,
  })
})
