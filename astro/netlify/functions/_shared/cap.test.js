import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'

import capHandler from '../cap.js'
import { RATE_LIMIT_POLICIES } from './rate-limit.js'
import { createChallenge } from './stateless-cap.js'

const originalNetlify = globalThis.Netlify
const TEST_CAP_SECRET = 'test-cap-token-secret-value-12345'

test('CapJS handler completes the stateless challenge flow once', async (t) => {
  const originalTokenStore = globalThis.__loumarcCapTokenStore
  const store = createMemoryTokenStore()
  const logs = captureFormSpamLogs(t)
  globalThis.__loumarcCapTokenStore = store
  globalThis.Netlify = {
    env: {
      get(name) {
        return name === 'LOUMARC_CAP_TOKEN_SECRET' ? TEST_CAP_SECRET : undefined
      },
    },
  }

  try {
    const challengeResponse = await capHandler(
      new Request('https://loumarcsigns.com/api/challenge', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '203.0.113.42',
        },
      }),
      {},
    )
    const challengeBody = await challengeResponse.json()
    const solutions = solveChallenge(challengeBody)

    assert.equal(challengeResponse.status, 200)
    assert.equal(typeof challengeBody.token, 'string')

    const redeemResponse = await capHandler(
      new Request('https://loumarcsigns.com/api/redeem', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.42',
        },
        body: JSON.stringify({
          token: challengeBody.token,
          solutions,
        }),
      }),
      {},
    )
    const redeemBody = await redeemResponse.json()

    assert.equal(redeemResponse.status, 200)
    assert.equal(redeemBody.success, true)
    assert.equal(typeof redeemBody.token, 'string')

    const validateResponse = await capHandler(
      new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.42',
        },
        body: JSON.stringify({ token: redeemBody.token }),
      }),
      {},
    )
    const replayResponse = await capHandler(
      new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.43',
        },
        body: JSON.stringify({ token: redeemBody.token }),
      }),
      {},
    )

    assert.equal(validateResponse.status, 200)
    assert.deepEqual(await validateResponse.json(), { success: true })
    assert.equal(replayResponse.status, 200)
    assert.deepEqual(await replayResponse.json(), { success: false })

    const capReasons = logs
      .filter((log) => log.surface === 'cap-verification')
      .map((log) => log.reason)
    assert.equal(capReasons.includes('challenge-created'), true)
    assert.equal(capReasons.includes('redeem-success'), true)
    assert.equal(capReasons.includes('validate-success'), true)
    assert.equal(capReasons.includes('validate-failure'), true)
    assert.equal(
      logs.some(
        (log) =>
          Object.hasOwn(log, 'token') ||
          Object.hasOwn(log, 'solutions') ||
          Object.hasOwn(log, 'source'),
      ),
      false,
    )
  } finally {
    globalThis.Netlify = originalNetlify
    if (originalTokenStore === undefined) {
      delete globalThis.__loumarcCapTokenStore
    } else {
      globalThis.__loumarcCapTokenStore = originalTokenStore
    }
  }
})

test('CapJS validate returns a normal validation error before rate limiting', async (t) => {
  const logs = captureFormSpamLogs(t)
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
  assert.equal(
    logs.some(
      (log) =>
        log.surface === 'cap-verification' &&
        log.action === 'cap.validate' &&
        log.reason === 'malformed-request' &&
        log.result === 'malformed' &&
        log.status === 400,
    ),
    true,
  )
})

test('CapJS endpoints return 429 after repeated same-source traffic', async (t) => {
  t.mock.method(Date, 'now', () => 1000)
  globalThis.Netlify = {
    env: {
      get(name) {
        return name === 'LOUMARC_CAP_TOKEN_SECRET' ? TEST_CAP_SECRET : undefined
      },
    },
  }
  let response

  try {
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
  } finally {
    globalThis.Netlify = originalNetlify
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

test('CapJS malformed direct requests are rate limited before malformed logs repeat', async (t) => {
  const originalLimit = RATE_LIMIT_POLICIES.capValidate.max
  const logs = captureFormSpamLogs(t)
  RATE_LIMIT_POLICIES.capValidate.max = 1

  try {
    const firstResponse = await capHandler(
      new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
        headers: {
          'x-forwarded-for': '203.0.113.44',
        },
        method: 'GET',
      }),
      {},
    )
    const secondResponse = await capHandler(
      new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
        headers: {
          'x-forwarded-for': '203.0.113.44',
        },
        method: 'GET',
      }),
      {},
    )

    assert.equal(firstResponse.status, 405)
    assert.equal(secondResponse.status, 429)
    assert.equal(
      logs.filter(
        (log) =>
          log.surface === 'cap-verification' &&
          log.action === 'cap.request' &&
          log.reason === 'malformed-request',
      ).length,
      1,
    )
  } finally {
    RATE_LIMIT_POLICIES.capValidate.max = originalLimit
  }
})

test('CapJS malformed paths use an allow-listed monitoring path', async (t) => {
  const logs = captureFormSpamLogs(t)
  const response = await capHandler(
    new Request(
      'https://loumarcsigns.com/.netlify/functions/cap/validate/lc_cap_secret_customer@example.com',
      {
        headers: {
          'x-forwarded-for': '203.0.113.45',
        },
        method: 'POST',
      },
    ),
    {},
  )

  assert.equal(response.status, 404)
  assert.equal(
    logs.some(
      (log) =>
        log.surface === 'cap-verification' &&
        log.action === 'cap.request' &&
        log.reason === 'malformed-request' &&
        log.path === '/.netlify/functions/cap/unknown',
    ),
    true,
  )
  assert.equal(JSON.stringify(logs).includes('lc_cap_secret'), false)
  assert.equal(JSON.stringify(logs).includes('customer@example.com'), false)
})

test('CapJS operational failures use structured monitoring events', async (t) => {
  const originalTokenStore = globalThis.__loumarcCapTokenStore
  const logs = captureFormSpamLogs(t)
  t.mock.method(console, 'error', () => {})
  globalThis.Netlify = {
    env: {
      get() {
        return undefined
      },
    },
  }

  try {
    const configResponse = await capHandler(
      new Request('https://loumarcsigns.com/api/challenge', {
        headers: {
          'x-forwarded-for': '203.0.113.46',
        },
        method: 'POST',
      }),
      {},
    )

    globalThis.Netlify = {
      env: {
        get(name) {
          return name === 'LOUMARC_CAP_TOKEN_SECRET'
            ? TEST_CAP_SECRET
            : undefined
        },
      },
    }
    globalThis.__loumarcCapTokenStore = {
      async set() {
        throw new Error('store unavailable')
      },
    }
    const challenge = createChallenge({
      challengeCount: 1,
      challengeDifficulty: 0,
      challengeSize: 8,
      secret: TEST_CAP_SECRET,
    })
    const storeResponse = await capHandler(
      new Request('https://loumarcsigns.com/api/redeem', {
        body: JSON.stringify({
          solutions: solveChallenge(challenge),
          token: challenge.token,
        }),
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.47',
        },
        method: 'POST',
      }),
      {},
    )

    assert.equal(configResponse.status, 500)
    assert.equal(storeResponse.status, 503)
    assert.equal(
      logs.some(
        (log) =>
          log.action === 'cap.challenge' &&
          log.reason === 'operational-error' &&
          log.result === 'failed' &&
          log.status === 500 &&
          log.errorType === 'CapConfigurationError',
      ),
      true,
    )
    assert.equal(
      logs.some(
        (log) =>
          log.action === 'cap.redeem' &&
          log.reason === 'operational-error' &&
          log.result === 'failed' &&
          log.status === 503 &&
          log.errorType === 'CapStoreError',
      ),
      true,
    )
    assert.equal(
      logs.some(
        (log) =>
          Object.hasOwn(log, 'token') ||
          Object.hasOwn(log, 'solutions') ||
          Object.hasOwn(log, 'source'),
      ),
      false,
    )
  } finally {
    globalThis.Netlify = originalNetlify
    if (originalTokenStore === undefined) {
      delete globalThis.__loumarcCapTokenStore
    } else {
      globalThis.__loumarcCapTokenStore = originalTokenStore
    }
  }
})

function createMemoryTokenStore() {
  const entries = new Map()

  return {
    async set(key, value, options = {}) {
      if (options.onlyIfNew && entries.has(key)) {
        return { modified: false }
      }

      entries.set(key, {
        metadata: options.metadata || {},
        value,
      })

      return { etag: `"${entries.size}"`, modified: true }
    },
  }
}

function solveChallenge({ challenge, token }) {
  const solutions = []

  for (
    let challengeNumber = 1;
    challengeNumber <= challenge.c;
    challengeNumber += 1
  ) {
    const salt = prng(`${token}${challengeNumber}`, challenge.s)
    const target = prng(`${token}${challengeNumber}d`, challenge.d)

    for (let solution = 0; ; solution += 1) {
      const hash = createHash('sha256')
        .update(salt + solution)
        .digest('hex')
      if (hash.startsWith(target)) {
        solutions.push(solution)
        break
      }
    }
  }

  return solutions
}

function prng(seed, length) {
  function fnv1a(str) {
    let hash = 2166136261
    for (let i = 0; i < str.length; i += 1) {
      hash ^= str.charCodeAt(i)
      hash +=
        (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    }
    return hash >>> 0
  }

  let state = fnv1a(seed)
  let result = ''

  function next() {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return state >>> 0
  }

  while (result.length < length) {
    const rnd = next()
    result += rnd.toString(16).padStart(8, '0')
  }

  return result.substring(0, length)
}

function captureFormSpamLogs(t) {
  const logs = []

  t.mock.method(console, 'log', (line) => {
    try {
      const parsed = JSON.parse(line)
      if (parsed.event === 'loumarc.form_spam') {
        logs.push(parsed)
      }
    } catch (_error) {}
  })

  return logs
}

test('CapJS validate trusts the internal source header for fallback limiting', async () => {
  const originalLimit = RATE_LIMIT_POLICIES.capValidate.max
  RATE_LIMIT_POLICIES.capValidate.max = 1
  globalThis.Netlify = {
    env: {
      get(name) {
        return name === 'LOUMARC_INTERNAL_RATE_LIMIT_SECRET'
          ? 'test-secret'
          : undefined
      },
    },
  }

  try {
    const firstResponse = await capHandler(
      new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-loumarc-client-source': '203.0.113.60',
          'x-loumarc-internal-secret': 'test-secret',
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
          'x-loumarc-internal-secret': 'test-secret',
        },
        body: JSON.stringify({}),
      }),
      { ip: '198.51.100.60' },
    )

    assert.equal(firstResponse.status, 400)
    assert.equal(secondResponse.status, 400)
  } finally {
    RATE_LIMIT_POLICIES.capValidate.max = originalLimit
    globalThis.Netlify = originalNetlify
  }
})

test('CapJS validate ignores spoofed source headers without the internal secret', async () => {
  const originalLimit = RATE_LIMIT_POLICIES.capValidate.max
  RATE_LIMIT_POLICIES.capValidate.max = 1
  globalThis.Netlify = {
    env: {
      get(name) {
        return name === 'LOUMARC_INTERNAL_RATE_LIMIT_SECRET'
          ? 'test-secret'
          : undefined
      },
    },
  }

  try {
    const firstResponse = await capHandler(
      new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-loumarc-client-source': '203.0.113.70',
        },
        body: JSON.stringify({}),
      }),
      { ip: '198.51.100.70' },
    )
    const secondResponse = await capHandler(
      new Request('https://loumarcsigns.com/.netlify/functions/cap/validate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-loumarc-client-source': '203.0.113.71',
        },
        body: JSON.stringify({}),
      }),
      { ip: '198.51.100.70' },
    )

    assert.equal(firstResponse.status, 400)
    assert.equal(secondResponse.status, 429)
  } finally {
    RATE_LIMIT_POLICIES.capValidate.max = originalLimit
    globalThis.Netlify = originalNetlify
  }
})
