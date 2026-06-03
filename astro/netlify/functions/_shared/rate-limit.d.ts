export interface RateLimitPolicy {
  name: string
  windowMs?: number
  max?: number
  nativeWindowLimit?: number
  nativeWindowSize?: number
}

export interface RateLimitResult {
  allowed: boolean
  count: number
  limit: number
  policy: string
  remaining: number
  resetAt: number
  retryAfterSeconds: number
  sourceHash: string
  windowSeconds: number
}

export const RATE_LIMIT_POLICIES: {
  formsSubmit: RateLimitPolicy
  capChallenge: RateLimitPolicy
  capRedeem: RateLimitPolicy
  capValidate: RateLimitPolicy
  capApiNative: RateLimitPolicy
}

export function getRequestSource(request: Request, context?: any): string

export function checkRateLimit(options: {
  policy: RateLimitPolicy
  source: string
  now?: number
  store?: Map<string, { count: number; resetAt: number }>
}): RateLimitResult

export function createRateLimitResponse(result: RateLimitResult): Response

export function logRateLimitDecision(
  result: RateLimitResult,
  metadata: { method: string; path: string },
): void

export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string>
