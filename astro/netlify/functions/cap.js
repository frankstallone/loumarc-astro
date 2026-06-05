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
import {
  CapConfigurationError,
  CapStoreError,
  createChallenge,
  redeemChallenge,
  validateToken,
} from './_shared/stateless-cap.js'

const INTERNAL_SOURCE_HEADER = 'x-loumarc-client-source'
const INTERNAL_SECRET_HEADER = 'x-loumarc-internal-secret'

export default async function handler(request, context) {
  const { pathname } = new URL(request.url)
  const route = pathname.replace(/\/$/, '')

  if (request.method !== 'POST') {
    return new Response(null, { status: 405 })
  }

  const policy = policyForRoute(route)

  if (!policy) {
    return new Response(null, { status: 404 })
  }

  const rateLimitResult = checkRateLimit({
    policy,
    source: getRateLimitSource({ context, request, route }),
  })
  logRateLimitDecision(rateLimitResult, {
    method: request.method,
    path: pathname,
  })

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult)
  }

  if (route.endsWith('/challenge')) {
    try {
      return jsonResponse(createChallenge())
    } catch (error) {
      return capErrorResponse(error)
    }
  }

  if (route.endsWith('/redeem')) {
    const body = await readJson(request)
    const { token, solutions } = body

    if (!token || !solutions) {
      return jsonResponse({ success: false }, { status: 400 })
    }

    try {
      const result = await redeemChallenge({ token, solutions })
      return jsonResponse(result)
    } catch (error) {
      return capErrorResponse(error)
    }
  }

  if (route.endsWith('/validate')) {
    const body = await readJson(request)
    const { token } = body

    if (!token) {
      return jsonResponse({ success: false }, { status: 400 })
    }

    try {
      const result = await validateToken({ token })
      return jsonResponse(result)
    } catch (error) {
      return capErrorResponse(error)
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
    return await request.json()
  } catch (_error) {
    return {}
  }
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  })
}

function capErrorResponse(error) {
  if (error instanceof CapConfigurationError) {
    console.error('[cap] configuration error:', error.message)
    return jsonResponse({ success: false }, { status: 500 })
  }

  if (error instanceof CapStoreError) {
    console.error('[cap] token store error:', error.message)
    return jsonResponse({ success: false }, { status: 503 })
  }

  console.error('[cap] unexpected error:', error?.message || String(error))
  return jsonResponse({ success: false }, { status: 500 })
}
