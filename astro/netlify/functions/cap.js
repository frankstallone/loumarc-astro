/**
 * @fileoverview Netlify serverless function for CAPTCHA challenge management.
 *
 * This function provides three public endpoints for CAPTCHA functionality:
 * - /api/challenge: Creates a new CAPTCHA challenge
 * - /api/redeem: Redeems a completed CAPTCHA challenge
 * - /api/validate: Validates an existing CAPTCHA token
 *
 * Netlify redirect rate-limit rules block excessive same-source traffic on the
 * public /api/* paths before this function is invoked. The in-handler limiter
 * mirrors the policy for local testing, protects direct function URL requests,
 * and logs decisions without recording form payloads or messages.
 *
 * @module netlify/functions/cap
 */

import {
  checkRateLimit,
  createRateLimitResponse,
  getRequestSource,
  logRateLimitDecision,
  RATE_LIMIT_POLICIES,
} from './_shared/rate-limit.js'
import { logFormSpamEvent } from './_shared/spam-monitoring.js'
import {
  CapConfigurationError,
  CapStoreError,
  createChallenge,
  redeemChallenge,
  validateToken,
} from './_shared/stateless-cap.js'

const INTERNAL_SOURCE_HEADER = 'x-loumarc-client-source'
const INTERNAL_SECRET_HEADER = 'x-loumarc-internal-secret'
const UNKNOWN_CAP_ROUTE_PATH = '/.netlify/functions/cap/unknown'

export default async function handler(request, context) {
  const { pathname } = new URL(request.url)
  const route = pathname.replace(/\/$/, '')
  const policy = policyForRoute(route)
  const logPath = policy ? pathname : UNKNOWN_CAP_ROUTE_PATH
  const rateLimitSource = getRateLimitSource({ context, request, route })
  const logCapEvent = (details) =>
    logFormSpamEvent({
      surface: 'cap-verification',
      method: request.method,
      path: logPath,
      source: rateLimitSource,
      ...details,
    })
  const rateLimitResult = checkRateLimit({
    policy: policy || RATE_LIMIT_POLICIES.capMalformed,
    source: rateLimitSource,
  })
  logRateLimitDecision(rateLimitResult, {
    method: request.method,
    path: logPath,
  })

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult)
  }

  if (request.method !== 'POST') {
    logCapEvent({
      action: 'cap.request',
      result: 'malformed',
      reason: 'malformed-request',
      status: 405,
    })
    return new Response(null, { status: 405 })
  }

  if (!policy) {
    logCapEvent({
      action: 'cap.request',
      result: 'malformed',
      reason: 'malformed-request',
      status: 404,
    })
    return new Response(null, { status: 404 })
  }

  if (route.endsWith('/challenge')) {
    try {
      const challenge = createChallenge()
      logCapEvent({
        action: 'cap.challenge',
        result: 'created',
        reason: 'challenge-created',
        status: 200,
      })
      return jsonResponse(challenge)
    } catch (error) {
      return capErrorResponse(error, {
        action: 'cap.challenge',
        logCapEvent,
      })
    }
  }

  if (route.endsWith('/redeem')) {
    const { body, malformedJson } = await readJson(request)
    const { token, solutions } = body

    if (malformedJson || !token || !solutions) {
      logCapEvent({
        action: 'cap.redeem',
        result: 'malformed',
        reason: 'malformed-request',
        status: 400,
      })
      return jsonResponse({ success: false }, { status: 400 })
    }

    try {
      const result = await redeemChallenge({ token, solutions })
      logCapEvent({
        action: 'cap.redeem',
        result: result.success ? 'success' : 'failure',
        reason: result.success ? 'redeem-success' : 'redeem-failure',
        status: 200,
      })
      return jsonResponse(result)
    } catch (error) {
      return capErrorResponse(error, {
        action: 'cap.redeem',
        logCapEvent,
      })
    }
  }

  if (route.endsWith('/validate')) {
    const { body, malformedJson } = await readJson(request)
    const { token } = body

    if (malformedJson || !token) {
      logCapEvent({
        action: 'cap.validate',
        result: 'malformed',
        reason: 'malformed-request',
        status: 400,
      })
      return jsonResponse({ success: false }, { status: 400 })
    }

    try {
      const result = await validateToken({ token })
      logCapEvent({
        action: 'cap.validate',
        result: result.success ? 'success' : 'failure',
        reason: result.success ? 'validate-success' : 'validate-failure',
        status: 200,
      })
      return jsonResponse(result)
    } catch (error) {
      return capErrorResponse(error, {
        action: 'cap.validate',
        logCapEvent,
      })
    }
  }
}

function policyForRoute(route) {
  if (route.endsWith('/challenge')) return RATE_LIMIT_POLICIES.capChallenge
  if (route.endsWith('/redeem')) return RATE_LIMIT_POLICIES.capRedeem
  if (route.endsWith('/validate')) return RATE_LIMIT_POLICIES.capValidate

  return null
}

function getRateLimitSource({ context, request, route }) {
  if (route.endsWith('/validate') && hasValidInternalSecret(request)) {
    return getRequestSource(request, context, {
      trustedHeader: INTERNAL_SOURCE_HEADER,
    })
  }

  return getRequestSource(request, context)
}

function hasValidInternalSecret(request) {
  const expectedSecret = getInternalSecret()
  const providedSecret = request.headers.get(INTERNAL_SECRET_HEADER)

  return Boolean(expectedSecret && providedSecret === expectedSecret)
}

function getInternalSecret() {
  return globalThis.Netlify?.env?.get?.('LOUMARC_INTERNAL_RATE_LIMIT_SECRET')
}

async function readJson(request) {
  try {
    return { body: await request.json(), malformedJson: false }
  } catch (_error) {
    return { body: {}, malformedJson: true }
  }
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  })
}

function capErrorResponse(error, { action, logCapEvent }) {
  const errorType = error?.name || 'Error'

  if (error instanceof CapConfigurationError) {
    console.error('[cap] configuration error:', error.message)
    logCapEvent({
      action,
      result: 'failed',
      reason: 'operational-error',
      status: 500,
      errorType,
    })
    return jsonResponse({ success: false }, { status: 500 })
  }

  if (error instanceof CapStoreError) {
    console.error('[cap] token store error:', error.message)
    logCapEvent({
      action,
      result: 'failed',
      reason: 'operational-error',
      status: 503,
      errorType,
    })
    return jsonResponse({ success: false }, { status: 503 })
  }

  console.error('[cap] unexpected error:', error?.message || String(error))
  logCapEvent({
    action,
    result: 'failed',
    reason: 'operational-error',
    status: 500,
    errorType,
  })
  return jsonResponse({ success: false }, { status: 500 })
}
