/**
 * @fileoverview Netlify Edge Function that acts as a security gate for form submissions.
 *
 * This edge function intercepts POST requests to /forms/* paths and performs several
 * security validations before allowing submissions to reach Netlify Forms:
 *
 * 1. **Honeypot Protection**: Checks for hidden form fields that should remain empty
 * 2. **CAPTCHA Validation**: Validates CapJS tokens via the /api/validate endpoint
 * 3. **Form Name Validation**: Ensures required form-name field is present
 *
 * The function provides different response formats based on the request's Accept header:
 * - JSON responses for AJAX/XHR requests
 * - Redirect responses for traditional form submissions
 *
 * @module netlify/edge-functions/forms-gate
 * @requires /api/validate - CAPTCHA validation endpoint
 */

/**
 * Netlify Edge Function handler for form submission security validation.
 *
 * This function acts as a middleware that intercepts form submissions to /forms/*
 * paths and performs security checks before forwarding valid submissions to Netlify Forms.
 *
 * **Security Features:**
 * - **Honeypot Detection**: Monitors the 'additional-info' field for bot activity
 * - **CAPTCHA Validation**: Validates CapJS tokens against the /api/validate endpoint
 * - **Form Validation**: Ensures required fields (form-name, cap-token) are present
 *
 * **Request Flow:**
 * 1. Intercepts POST requests to /forms/* paths
 * 2. Parses form data and performs security checks
 * 3. Validates CAPTCHA token via internal API call
 * 4. Forwards valid submissions to Netlify Forms
 * 5. Returns appropriate response based on Accept header
 *
 * **Response Types:**
 * - **JSON**: For requests with `Accept: application/json` header
 * - **Redirect**: For traditional form submissions (303 redirects)
 * - **Error**: Various error responses with appropriate HTTP status codes
 *
 * @async
 * @function default
 * @param {Request} request - The incoming HTTP request object
 * @param {Request.url} request.url - The request URL
 * @param {string} request.method - The HTTP method (should be POST)
 * @param {Headers} request.headers - Request headers including Accept and Content-Type
 * @param {Object} context - Netlify Edge Function context object
 * @param {Function} context.next - Function to continue processing the request
 * @param {Function} context.next(request) - Continue with modified request object
 * @param {Function} context.next() - Continue with original request (no modification)
 * @see {@link https://docs.netlify.com/edge-functions/overview/#edge-function-context} Netlify Edge Function Context Documentation
 * @returns {Promise<Response>} HTTP response object
 *
 * @example
 * // Successful form submission (JSON response)
 * // Request: POST /forms/contact with Accept: application/json
 * // Form data includes: form-name, cap-token, and other fields
 * // Response: { status: 200, body: '{"ok":true}' }
 *
 * @example
 * // Successful form submission (redirect response)
 * // Request: POST /forms/contact (traditional form)
 * // Response: { status: 303, headers: { Location: '/thank-you/' } }
 *
 * @example
 * // Honeypot triggered
 * // Request: POST /forms/contact with additional-info field filled
 * // Response: { status: 200, body: '{"ok":true,"skipped":true}' }
 *
 * @example
 * // Missing CAPTCHA token
 * // Request: POST /forms/contact without cap-token
 * // Response: { status: 303, headers: { Location: '/captcha-required/' } }
 *
 * @example
 * // Invalid CAPTCHA token
 * // Request: POST /forms/contact with invalid cap-token
 * // Response: { status: 422, body: '{"ok":false,"error":"Invalid cap-token"}' }
 */
import {
  checkRateLimit,
  createRateLimitResponse,
  getRequestSource,
  logRateLimitDecision,
  RATE_LIMIT_POLICIES,
} from '../functions/_shared/rate-limit.js'
import { logFormSpamEvent } from '../functions/_shared/spam-monitoring.js'

export default async (request: Request, context: any) => {
  try {
    const { pathname } = new URL(request.url)
    const requestSource = getRequestSource(request, context)
    const logGateEvent = (details: Record<string, unknown>) =>
      logFormSpamEvent({
        surface: 'forms-gate',
        method: request.method,
        path: pathname,
        source: requestSource,
        ...details,
      })

    // Only gate POSTs to /forms/*; pass through everything else
    if (request.method !== 'POST') {
      logGateEvent({
        action: 'forms-gate.bypass',
        result: 'passed-through',
        reason: 'non-post',
      })
      return context.next()
    }
    // Defensive: ensure this only processes /forms/* paths even if mis-mapped
    if (!pathname.startsWith('/forms/')) {
      logGateEvent({
        action: 'forms-gate.bypass',
        result: 'passed-through',
        reason: 'non-form-path',
      })
      return context.next()
    }

    const rateLimitResult = checkRateLimit({
      policy: RATE_LIMIT_POLICIES.formsSubmit,
      source: requestSource,
    })
    logRateLimitDecision(rateLimitResult, {
      method: request.method,
      path: pathname,
    })

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult)
    }

    // Capture the raw body so we can both read it (for validation) and forward it
    const bodyBuffer = await request.arrayBuffer()
    const bodyBytes = new Uint8Array(bodyBuffer)

    // Reconstruct requests from the captured bytes for parsing and for forwarding
    const parseReq = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: bodyBytes,
    })
    const forwardReq = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: bodyBytes,
    })

    // Parse form payload via Web API
    let formData: FormData
    try {
      formData = await parseReq.formData()
    } catch (_e) {
      logGateEvent({
        action: 'forms-gate.validation',
        result: 'failed',
        reason: 'validation-error',
        status: 400,
      })
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid form data' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      )
    }

    // Honeypot check
    const honey = formData.get('additional-info')
    if (typeof honey === 'string' && honey.trim().length > 0) {
      // Silently accept to not tip off bots, but do not forward to Forms
      const accept = request.headers.get('accept') || ''
      logGateEvent({
        action: 'forms-gate.submission',
        result: 'blocked',
        reason: 'honeypot',
        status: accept.includes('application/json') ? 200 : 303,
      })
      if (accept.includes('application/json')) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'honeypot',
          },
        })
      }
      return new Response(null, {
        status: 303,
        headers: { Location: '/thank-you/', 'x-forms-gate': 'honeypot' },
      })
    }

    // Required: form-name and cap-token
    const formName = formData.get('form-name')
    const capToken = formData.get('cap-token')

    if (!formName || (typeof formName === 'string' && formName.trim() === '')) {
      logGateEvent({
        action: 'forms-gate.validation',
        result: 'failed',
        reason: 'validation-error',
        status: 422,
      })
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing form-name' }),
        {
          status: 422,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'missing-form-name',
          },
        },
      )
    }

    if (!capToken || (typeof capToken === 'string' && capToken.trim() === '')) {
      const accept = request.headers.get('accept') || ''
      logGateEvent({
        action: 'forms-gate.submission',
        result: 'blocked',
        reason: 'missing-token',
        status: accept.includes('application/json') ? 422 : 303,
      })
      if (accept.includes('application/json')) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing cap-token' }),
          {
            status: 422,
            headers: {
              'content-type': 'application/json',
              'x-forms-gate': 'missing-cap-token',
            },
          },
        )
      }
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/captcha-required/',
          'x-forms-gate': 'missing-cap-token',
        },
      })
    }

    // Use the function URL so successful form submissions do not consume the
    // public /api/validate redirect rate-limit bucket.
    const validateUrl = new URL(
      '/.netlify/functions/cap/validate',
      request.url,
    ).toString()
    const internalSecret = getInternalSecret()
    let valid = false
    try {
      const validateHeaders: Record<string, string> = {
        'content-type': 'application/json',
      }
      if (internalSecret) {
        validateHeaders['x-loumarc-client-source'] = requestSource
        validateHeaders['x-loumarc-internal-secret'] = internalSecret
      }

      const res = await fetch(validateUrl, {
        method: 'POST',
        headers: validateHeaders,
        body: JSON.stringify({ token: String(capToken) }),
      })

      if (!res.ok) {
        logGateEvent({
          action: 'forms-gate.validation',
          result: 'failed',
          reason: 'upstream-forwarding',
          status: 503,
          upstreamStatus: res.status,
        })
        return capUnavailableResponse()
      }

      const data = await res.json()
      valid = Boolean(data && data.success)
    } catch (_e) {
      logGateEvent({
        action: 'forms-gate.validation',
        result: 'failed',
        reason: 'upstream-forwarding',
        status: 503,
      })
      return capUnavailableResponse()
    }

    if (!valid) {
      logGateEvent({
        action: 'forms-gate.submission',
        result: 'blocked',
        reason: 'invalid-token',
        status: 422,
      })
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid cap-token' }),
        {
          status: 422,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'invalid-cap',
          },
        },
      )
    }

    // Token is valid — allow the request to reach Netlify Forms
    // Await to ensure the submission is processed server-side, then craft UX-specific response
    let upstream: Response | undefined
    try {
      upstream = await context.next(forwardReq)
    } catch (_e) {
      // If forwarding fails, return an error to client
      logGateEvent({
        action: 'forms-gate.forward',
        result: 'failed',
        reason: 'upstream-forwarding',
        status: 502,
      })
      return new Response(
        JSON.stringify({ ok: false, error: 'Forward failed' }),
        {
          status: 502,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'forward-failed',
          },
        },
      )
    }

    // Return JSON for XHR, else redirect to thank-you page for non-JS fallback
    const accept = request.headers.get('accept') || ''
    const upstreamStatus = upstream?.status ?? 200
    const upstreamOk = upstreamStatus < 400
    if (accept.includes('application/json')) {
      if (upstreamOk) {
        logGateEvent({
          action: 'forms-gate.forward',
          result: 'forwarded',
          reason: 'forwarded',
          status: 200,
          upstreamStatus,
        })
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'ok',
            'x-forms-gate-upstream-status': String(upstreamStatus),
          },
        })
      }
      logGateEvent({
        action: 'forms-gate.forward',
        result: 'failed',
        reason: 'upstream-forwarding',
        status: 502,
        upstreamStatus,
      })
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Forms processing failed',
          status: upstreamStatus,
        }),
        {
          status: 502,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'upstream-error',
            'x-forms-gate-upstream-status': String(upstreamStatus),
          },
        },
      )
    }

    if (upstreamOk) {
      logGateEvent({
        action: 'forms-gate.forward',
        result: 'forwarded',
        reason: 'forwarded',
        status: 303,
        upstreamStatus,
      })
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/thank-you/',
          'x-forms-gate': 'ok',
          'x-forms-gate-upstream-status': String(upstreamStatus),
        },
      })
    }
    // On non-XHR and upstream error, surface upstream response to client
    logGateEvent({
      action: 'forms-gate.forward',
      result: 'failed',
      reason: 'upstream-forwarding',
      status: upstreamStatus,
      upstreamStatus,
    })
    return upstream as Response
  } catch (err) {
    const { pathname } = new URL(request.url)
    logFormSpamEvent({
      surface: 'forms-gate',
      action: 'forms-gate.validation',
      result: 'failed',
      reason: 'validation-error',
      method: request.method,
      path: pathname,
      source: getRequestSource(request, context),
      status: 500,
      errorType: (err as any)?.name || 'Error',
    })
    return new Response(JSON.stringify({ ok: false, error: 'Edge crash' }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'x-forms-gate': 'crash' },
    })
  }
}

function getInternalSecret() {
  return (globalThis as any).Netlify?.env?.get?.(
    'LOUMARC_INTERNAL_RATE_LIMIT_SECRET',
  )
}

function capUnavailableResponse() {
  return new Response(
    JSON.stringify({ ok: false, error: 'Verification unavailable' }),
    {
      status: 503,
      headers: {
        'content-type': 'application/json',
        'x-forms-gate': 'cap-unavailable',
      },
    },
  )
}

export const config = {
  path: '/forms/*',
  method: 'POST',
  rateLimit: {
    windowLimit: RATE_LIMIT_POLICIES.formsSubmit.nativeWindowLimit,
    windowSize: RATE_LIMIT_POLICIES.formsSubmit.nativeWindowSize,
    aggregateBy: ['ip', 'domain'],
  },
}
