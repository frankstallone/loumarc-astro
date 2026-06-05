import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

import { getStore } from '@netlify/blobs'

const STORE_NAME = 'cap-verification'
const TOKEN_VERSION = 1
const CHALLENGE_EXPIRES_MS = 10 * 60 * 1000
const VERIFICATION_EXPIRES_MS = 20 * 60 * 1000
const MAX_SIGNED_TOKEN_LENGTH = 2048
const TOKEN_PREFIX = 'lc_cap_'

export class CapConfigurationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CapConfigurationError'
  }
}

export class CapStoreError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CapStoreError'
  }
}

export function createChallenge({
  challengeCount = 50,
  challengeSize = 32,
  challengeDifficulty = 4,
  now = Date.now(),
  secret = getTokenSecret(),
} = {}) {
  const challenge = {
    c: challengeCount,
    s: challengeSize,
    d: challengeDifficulty,
  }
  const expires = now + CHALLENGE_EXPIRES_MS
  const payload = {
    v: TOKEN_VERSION,
    type: 'challenge',
    id: randomBytes(16).toString('hex'),
    challenge,
    expires,
  }

  return {
    challenge,
    token: signPayload(payload, secret),
    expires,
  }
}

export async function redeemChallenge({
  token,
  solutions,
  now = Date.now(),
  secret = getTokenSecret(),
  store = getTokenStore(),
} = {}) {
  if (
    !token ||
    !solutions ||
    !Array.isArray(solutions) ||
    solutions.some((solution) => !Number.isSafeInteger(solution))
  ) {
    return { success: false, message: 'Invalid body' }
  }

  const parsed = verifySignedPayload(token, secret)
  if (!parsed || parsed.type !== 'challenge' || !isChallengePayload(parsed)) {
    return { success: false, message: 'Invalid challenge' }
  }

  if (parsed.expires < now) {
    return { success: false, message: 'Challenge expired' }
  }

  if (!isValidSolution({ token, challenge: parsed.challenge, solutions })) {
    return { success: false, message: 'Invalid solution' }
  }

  const consumed = await consumeOnce({
    expires: parsed.expires,
    key: `challenge/${parsed.id}`,
    kind: 'challenge',
    now,
    store,
  })

  if (!consumed) {
    return { success: false, message: 'Challenge already redeemed' }
  }

  const expires = now + VERIFICATION_EXPIRES_MS
  const verificationPayload = {
    v: TOKEN_VERSION,
    type: 'verification',
    id: randomBytes(16).toString('hex'),
    challengeId: parsed.id,
    expires,
  }

  return {
    success: true,
    token: signPayload(verificationPayload, secret),
    expires,
  }
}

export async function validateToken({
  token,
  now = Date.now(),
  secret = getTokenSecret(),
  store = getTokenStore(),
} = {}) {
  if (!token) {
    return { success: false }
  }

  const parsed = verifySignedPayload(token, secret)
  if (
    !parsed ||
    parsed.type !== 'verification' ||
    !isVerificationPayload(parsed)
  ) {
    return { success: false }
  }

  if (parsed.expires < now) {
    return { success: false }
  }

  const consumed = await consumeOnce({
    expires: parsed.expires,
    key: `verification/${parsed.id}`,
    kind: 'verification',
    now,
    store,
  })

  return { success: consumed }
}

export function getTokenSecret() {
  const secret =
    globalThis.Netlify?.env?.get?.('LOUMARC_CAP_TOKEN_SECRET') ||
    process.env.LOUMARC_CAP_TOKEN_SECRET

  if (!secret || secret.length < 32) {
    throw new CapConfigurationError(
      'LOUMARC_CAP_TOKEN_SECRET must be set to a random value of at least 32 characters',
    )
  }

  return secret
}

export function getTokenStore() {
  if (globalThis.__loumarcCapTokenStore) {
    return globalThis.__loumarcCapTokenStore
  }

  try {
    return getStore({ name: STORE_NAME, consistency: 'strong' })
  } catch (error) {
    throw new CapStoreError(error?.message || 'Netlify Blobs store unavailable')
  }
}

async function consumeOnce({ expires, key, kind, now, store }) {
  try {
    const result = await store.set(key, '1', {
      metadata: {
        createdAt: now,
        expires,
        kind,
      },
      onlyIfNew: true,
    })

    return Boolean(result.modified)
  } catch (error) {
    throw new CapStoreError(error?.message || 'Netlify Blobs write failed')
  }
}

function signPayload(payload, secret) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = hmac(encodedPayload, secret)

  return `${TOKEN_PREFIX}${encodedPayload}.${signature}`
}

function verifySignedPayload(token, secret) {
  if (typeof token !== 'string') {
    return null
  }

  if (token.length > MAX_SIGNED_TOKEN_LENGTH) {
    return null
  }

  if (!token.startsWith(TOKEN_PREFIX)) {
    return null
  }

  const body = token.slice(TOKEN_PREFIX.length)
  const parts = body.split('.')

  if (parts.length !== 2) {
    return null
  }

  const [encodedPayload, signature] = parts

  if (!encodedPayload || !signature) {
    return null
  }

  const expectedSignature = hmac(encodedPayload, secret)
  if (!timingSafeEqualString(signature, expectedSignature)) {
    return null
  }

  try {
    return JSON.parse(base64UrlDecode(encodedPayload))
  } catch (_error) {
    return null
  }
}

function hmac(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function isChallengePayload(payload) {
  return (
    payload.v === TOKEN_VERSION &&
    typeof payload.id === 'string' &&
    /^[a-f0-9]{32}$/.test(payload.id) &&
    Number.isSafeInteger(payload.expires) &&
    payload.challenge &&
    Number.isSafeInteger(payload.challenge.c) &&
    Number.isSafeInteger(payload.challenge.s) &&
    Number.isSafeInteger(payload.challenge.d)
  )
}

function isVerificationPayload(payload) {
  return (
    payload.v === TOKEN_VERSION &&
    typeof payload.id === 'string' &&
    /^[a-f0-9]{32}$/.test(payload.id) &&
    typeof payload.challengeId === 'string' &&
    /^[a-f0-9]{32}$/.test(payload.challengeId) &&
    Number.isSafeInteger(payload.expires)
  )
}

function isValidSolution({ token, challenge, solutions }) {
  if (solutions.length !== challenge.c) {
    return false
  }

  return solutions.every((solution, index) => {
    if (!Number.isSafeInteger(solution) || solution < 0) {
      return false
    }

    const challengeNumber = index + 1
    const salt = prng(`${token}${challengeNumber}`, challenge.s)
    const target = prng(`${token}${challengeNumber}d`, challenge.d)
    const hash = createHash('sha256')
      .update(salt + solution)
      .digest('hex')

    return hash.startsWith(target)
  })
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

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}
