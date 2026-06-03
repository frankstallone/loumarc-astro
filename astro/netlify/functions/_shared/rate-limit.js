const DEFAULT_STORE = new Map()
const MAX_STORE_SIZE = 10000

export const RATE_LIMIT_POLICIES = {
  formsSubmit: {
    name: 'forms-submit',
    windowMs: 60 * 1000,
    max: 6,
    nativeWindowLimit: 6,
    nativeWindowSize: 60,
  },
  capChallenge: {
    name: 'cap-challenge',
    windowMs: 60 * 1000,
    max: 20,
  },
  capRedeem: {
    name: 'cap-redeem',
    windowMs: 60 * 1000,
    max: 20,
  },
  capValidate: {
    name: 'cap-validate',
    windowMs: 60 * 1000,
    max: 30,
  },
}

export function getRequestSource(request, context) {
  if (typeof context?.ip === 'string' && context.ip.trim()) {
    return context.ip.trim()
  }

  const headers = request?.headers
  const candidates = [
    'x-nf-client-connection-ip',
    'x-forwarded-for',
    'client-ip',
    'x-real-ip',
    'cf-connecting-ip',
  ]

  for (const header of candidates) {
    const value = headers?.get?.(header)
    if (value) return value.split(',')[0].trim()
  }

  return 'unknown'
}

export function checkRateLimit({
  policy,
  source,
  now = Date.now(),
  store = DEFAULT_STORE,
}) {
  const windowMs = policy.windowMs
  const key = `${policy.name}:${source || 'unknown'}`
  const existing = store.get(key)
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowMs }

  bucket.count += 1
  store.set(key, bucket)

  if (store.size > MAX_STORE_SIZE) {
    pruneExpiredBuckets(store, now)
  }

  const remaining = Math.max(policy.max - bucket.count, 0)
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  )

  return {
    allowed: bucket.count <= policy.max,
    count: bucket.count,
    limit: policy.max,
    policy: policy.name,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds,
    sourceHash: fingerprintSource(source || 'unknown'),
    windowSeconds: Math.ceil(windowMs / 1000),
  }
}

export function createRateLimitResponse(result) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: 'Too many requests',
      retryAfter: result.retryAfterSeconds,
    }),
    {
      status: 429,
      headers: rateLimitHeaders(result),
    },
  )
}

export function logRateLimitDecision(result, { method, path }) {
  const decision = result.allowed ? 'allowed' : 'blocked'
  console.log(
    `[rate-limit] ${decision} policy=${result.policy} method=${method} path=${path} source=${result.sourceHash} count=${result.count}/${result.limit} reset=${new Date(result.resetAt).toISOString()}`,
  )
}

export function rateLimitHeaders(result) {
  const resetSeconds = Math.ceil(result.resetAt / 1000)
  const headers = {
    'content-type': 'application/json',
    'retry-after': String(result.retryAfterSeconds),
    'x-rate-limit-limit': String(result.limit),
    'x-rate-limit-remaining': String(result.remaining),
    'x-rate-limit-reset': String(resetSeconds),
    'x-rate-limit-policy': result.policy,
  }

  if (!result.allowed) {
    headers['x-rate-limit-result'] = 'blocked'
  }

  return headers
}

function pruneExpiredBuckets(store, now) {
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}

function fingerprintSource(source) {
  let hash = 5381

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}
