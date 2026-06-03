/**
 * @fileoverview Netlify serverless function for CAPTCHA challenge management using @cap.js/server.
 *
 * This function provides three public endpoints for CAPTCHA functionality:
 * - /api/challenge: Creates a new CAPTCHA challenge
 * - /api/redeem: Redeems a completed CAPTCHA challenge
 * - /api/validate: Validates an existing CAPTCHA token
 *
 * Netlify's code-based rate limit config blocks excessive same-source traffic
 * before the function is invoked. The in-handler limiter mirrors the policy for
 * local testing and logs decisions without recording form payloads or messages.
 *
 * @module netlify/functions/cap
 * @requires @cap.js/server
 */

import Cap from '@cap.js/server'

import {
  checkRateLimit,
  createRateLimitResponse,
  getRequestSource,
  logRateLimitDecision,
  RATE_LIMIT_POLICIES,
} from './_shared/rate-limit.js'

const cap = new Cap({ tokens_store_path: '/tmp/tokens.json' })

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
    source: getRequestSource(request, context),
  })
  logRateLimitDecision(rateLimitResult, {
    method: request.method,
    path: pathname,
  })

  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult)
  }

  if (route.endsWith('/challenge')) {
    const challenge = cap.createChallenge()
    return jsonResponse(challenge)
  }

  if (route.endsWith('/redeem')) {
    const body = await readJson(request)
    const { token, solutions } = body

    if (!token || !solutions) {
      return jsonResponse({ success: false }, { status: 400 })
    }

    const result = await cap.redeemChallenge({ token, solutions })
    return jsonResponse(result)
  }

  if (route.endsWith('/validate')) {
    const body = await readJson(request)
    const { token } = body

    if (!token) {
      return jsonResponse({ success: false }, { status: 400 })
    }

    const result = await cap.validateToken(token)
    return jsonResponse(result)
  }
}

export const config = {
  path: ['/api/challenge', '/api/redeem', '/api/validate'],
  method: 'POST',
  rateLimit: {
    windowLimit: RATE_LIMIT_POLICIES.capApiNative.nativeWindowLimit,
    windowSize: RATE_LIMIT_POLICIES.capApiNative.nativeWindowSize,
    aggregateBy: ['ip', 'domain'],
  },
}

function policyForRoute(route) {
  if (route.endsWith('/challenge')) return RATE_LIMIT_POLICIES.capChallenge
  if (route.endsWith('/redeem')) return RATE_LIMIT_POLICIES.capRedeem
  if (route.endsWith('/validate')) return RATE_LIMIT_POLICIES.capValidate

  return null
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
