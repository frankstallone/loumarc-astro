const FORM_SPAM_EVENT = 'loumarc.form_spam'
const SCHEMA_VERSION = 1

const OPTIONAL_FIELDS = [
  'method',
  'path',
  'status',
  'upstreamStatus',
  'rateLimitPolicy',
  'rateLimitCount',
  'rateLimitLimit',
  'rateLimitReset',
  'rateLimitWindowSeconds',
  'retryAfterSeconds',
  'errorType',
]

export function buildFormSpamLogEntry({
  surface,
  action,
  result,
  reason,
  method,
  path,
  source,
  sourceHash,
  status,
  upstreamStatus,
  rateLimitPolicy,
  rateLimitCount,
  rateLimitLimit,
  rateLimitReset,
  rateLimitWindowSeconds,
  retryAfterSeconds,
  errorType,
}) {
  const entry = {
    event: FORM_SPAM_EVENT,
    schemaVersion: SCHEMA_VERSION,
    surface,
    action,
    result,
    reason,
  }

  const values = {
    method,
    path: sanitizePath(path),
    status,
    upstreamStatus,
    sourceHash: sourceHash || fingerprintSource(source || 'unknown'),
    rateLimitPolicy,
    rateLimitCount,
    rateLimitLimit,
    rateLimitReset,
    rateLimitWindowSeconds,
    retryAfterSeconds,
    errorType,
  }

  for (const field of ['sourceHash', ...OPTIONAL_FIELDS]) {
    if (values[field] !== undefined && values[field] !== '') {
      entry[field] = values[field]
    }
  }

  return entry
}

export function logFormSpamEvent(details) {
  console.log(JSON.stringify(buildFormSpamLogEntry(details)))
}

export function fingerprintSource(source) {
  let hash = 5381
  const value = String(source || 'unknown')

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function sanitizePath(path) {
  if (!path) return undefined

  try {
    return new URL(path, 'https://loumarcsigns.com').pathname
  } catch (_error) {
    return String(path).split('?')[0]
  }
}
