import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'

import {
  createChallenge,
  redeemChallenge,
  cleanupExpiredMarkers,
  maybeCleanupExpiredMarkers,
  validateToken,
} from './stateless-cap.js'

const SECRET = 'stateless-cap-test-secret-value-123'

test('stateless Cap flow redeems solved challenges and validates form tokens once', async () => {
  const now = 1_000
  const store = createMemoryTokenStore()
  const challenge = createChallenge({
    challengeCount: 2,
    challengeDifficulty: 0,
    challengeSize: 8,
    now,
    secret: SECRET,
  })
  const solutions = solveChallenge(challenge)

  const redeemed = await redeemChallenge({
    now,
    secret: SECRET,
    solutions,
    store,
    token: challenge.token,
    cleanup: noopCleanup,
  })

  assert.equal(redeemed.success, true)
  assert.equal(typeof redeemed.token, 'string')
  assert.equal(store.entries.has(getOnlyKey(store, 'challenge/')), true)

  const replayedChallenge = await redeemChallenge({
    now,
    secret: SECRET,
    solutions,
    store,
    token: challenge.token,
    cleanup: noopCleanup,
  })

  assert.deepEqual(replayedChallenge, {
    success: false,
    message: 'Challenge already redeemed',
  })

  const validated = await validateToken({
    now,
    secret: SECRET,
    store,
    token: redeemed.token,
    cleanup: noopCleanup,
  })
  const replayedValidation = await validateToken({
    now,
    secret: SECRET,
    store,
    token: redeemed.token,
    cleanup: noopCleanup,
  })

  assert.deepEqual(validated, { success: true })
  assert.deepEqual(replayedValidation, { success: false })
})

test('stateless Cap rejects expired challenges and verification tokens', async () => {
  const now = 2_000
  const store = createMemoryTokenStore()
  const challenge = createChallenge({
    challengeCount: 1,
    challengeDifficulty: 1,
    challengeSize: 8,
    now,
    secret: SECRET,
  })
  const solutions = solveChallenge(challenge)

  const expiredChallenge = await redeemChallenge({
    now: now + 10 * 60 * 1000 + 1,
    secret: SECRET,
    solutions,
    store,
    token: challenge.token,
    cleanup: noopCleanup,
  })

  assert.deepEqual(expiredChallenge, {
    success: false,
    message: 'Challenge expired',
  })

  const redeemed = await redeemChallenge({
    now,
    secret: SECRET,
    solutions,
    store,
    token: challenge.token,
    cleanup: noopCleanup,
  })
  const expiredVerification = await validateToken({
    now: now + 20 * 60 * 1000 + 1,
    secret: SECRET,
    store,
    token: redeemed.token,
    cleanup: noopCleanup,
  })

  assert.deepEqual(expiredVerification, { success: false })
})

test('stateless Cap rejects malformed, tampered, or incorrect data', async () => {
  const now = 3_000
  const store = createMemoryTokenStore()
  const challenge = createChallenge({
    challengeCount: 1,
    challengeDifficulty: 1,
    challengeSize: 8,
    now,
    secret: SECRET,
  })
  const solutions = solveChallenge(challenge)

  assert.deepEqual(
    await redeemChallenge({
      now,
      secret: SECRET,
      solutions: [-1],
      store,
      token: challenge.token,
      cleanup: noopCleanup,
    }),
    { success: false, message: 'Invalid solution' },
  )
  assert.deepEqual(
    await redeemChallenge({
      now,
      secret: SECRET,
      solutions,
      store,
      token: `${challenge.token}tampered`,
      cleanup: noopCleanup,
    }),
    { success: false, message: 'Invalid challenge' },
  )
  assert.deepEqual(
    await validateToken({
      now,
      secret: SECRET,
      store,
      token: 'not-a-token',
    }),
    { success: false },
  )
  assert.deepEqual(
    await validateToken({
      now,
      secret: SECRET,
      store,
      token: `lc_cap_${'a'.repeat(2048)}`,
    }),
    { success: false },
  )

  const redeemed = await redeemChallenge({
    now,
    secret: SECRET,
    solutions,
    store,
    token: challenge.token,
    cleanup: noopCleanup,
  })

  assert.equal(redeemed.success, true)
  assert.deepEqual(
    await validateToken({
      now,
      secret: SECRET,
      store,
      token: `${redeemed.token}.extra`,
      cleanup: noopCleanup,
    }),
    { success: false },
  )
})

test('stateless Cap opportunistically deletes expired replay markers', async () => {
  const store = createMemoryTokenStore()
  store.entries.set('challenge/expired', {
    metadata: { expires: 999 },
    value: '1',
  })
  store.entries.set('challenge/current', {
    metadata: { expires: 1_001 },
    value: '1',
  })
  store.entries.set('verification/expired', {
    metadata: { expires: 998 },
    value: '1',
  })
  store.entries.set('verification/missing-expiry', {
    metadata: {},
    value: '1',
  })

  await cleanupExpiredMarkers({ now: 1_000, store })

  assert.equal(store.entries.has('challenge/expired'), false)
  assert.equal(store.entries.has('verification/expired'), false)
  assert.equal(store.entries.has('challenge/current'), true)
  assert.equal(store.entries.has('verification/missing-expiry'), true)
})

test('stateless Cap cleanup sampling is non-blocking', async () => {
  const store = {
    async list() {
      throw new Error('store unavailable')
    },
  }

  await maybeCleanupExpiredMarkers({
    random: () => 0,
    store,
  })
})

function createMemoryTokenStore() {
  const entries = new Map()

  return {
    entries,
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
    async list(options = {}) {
      const prefix = options.prefix || ''
      return {
        blobs: [...entries.keys()]
          .filter((key) => key.startsWith(prefix))
          .map((key) => ({ etag: `"${key}"`, key })),
        directories: [],
      }
    },
    async getMetadata(key) {
      const entry = entries.get(key)

      if (!entry) {
        return null
      }

      return {
        etag: `"${key}"`,
        metadata: entry.metadata,
      }
    },
    async delete(key) {
      entries.delete(key)
    },
  }
}

function noopCleanup() {}

function getOnlyKey(store, prefix) {
  const matches = [...store.entries.keys()].filter((key) =>
    key.startsWith(prefix),
  )

  assert.equal(matches.length, 1)
  return matches[0]
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
