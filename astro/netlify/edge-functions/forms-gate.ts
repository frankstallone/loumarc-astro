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
export default async (request: Request, context: any) => {
  try {
    // Basic trace
    const { pathname } = new URL(request.url);
    console.log(`[forms-gate] start ${request.method} ${pathname}`);
    // Only gate POSTs to /forms/*; pass through everything else
    if (request.method !== 'POST') {
      console.log('[forms-gate] non-POST, passing through');
      return context.next();
    }
    // Defensive: ensure this only processes /forms/* paths even if mis-mapped
    if (!pathname.startsWith('/forms/')) {
      console.log('[forms-gate] non-/forms path, passing through');
      return context.next();
    }

    // Capture the raw body so we can both read it (for validation) and forward it
    const bodyBuffer = await request.arrayBuffer();
    const bodyBytes = new Uint8Array(bodyBuffer);

    // Reconstruct requests from the captured bytes for parsing and for forwarding
    const parseReq = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: bodyBytes,
    });
    const forwardReq = new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: bodyBytes,
    });

    // Parse form payload via Web API
    let formData: FormData;
    try {
      formData = await parseReq.formData();
    } catch (_e) {
      console.log('[forms-gate] invalid form data');
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid form data' }),
        {
          status: 400,
          headers: { 'content-type': 'application/json' },
        },
      );
    }

    // Honeypot check
    const honey = formData.get('additional-info');
    if (typeof honey === 'string' && honey.trim().length > 0) {
      console.log('[forms-gate] honeypot triggered');
      // Silently accept to not tip off bots, but do not forward to Forms
      const accept = request.headers.get('accept') || '';
      if (accept.includes('application/json')) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'honeypot',
          },
        });
      }
      return new Response(null, {
        status: 303,
        headers: { Location: '/thank-you/', 'x-forms-gate': 'honeypot' },
      });
    }

    // Required: form-name and cap-token
    const formName = formData.get('form-name');
    const capToken = formData.get('cap-token');

    if (!formName || (typeof formName === 'string' && formName.trim() === '')) {
      console.log('[forms-gate] missing form-name');
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing form-name' }),
        {
          status: 422,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'missing-form-name',
          },
        },
      );
    }

    if (!capToken || (typeof capToken === 'string' && capToken.trim() === '')) {
      console.log('[forms-gate] missing cap-token');
      const accept = request.headers.get('accept') || '';
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
        );
      }
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/captcha-required/',
          'x-forms-gate': 'missing-cap-token',
        },
      });
    }

    // Validate CapJS token via existing Netlify Function
    const validateUrl = new URL('/api/validate', request.url).toString();
    let valid = false;
    try {
      const res = await fetch(validateUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: String(capToken) }),
      });
      const data = await res.json();
      valid = Boolean(data && data.success);
      console.log(`[forms-gate] cap validate success=${valid}`);
    } catch (_e) {
      valid = false;
      console.log('[forms-gate] cap validate error');
    }

    if (!valid) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid cap-token' }),
        {
          status: 422,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'invalid-cap',
          },
        },
      );
    }

    // Token is valid — allow the request to reach Netlify Forms
    // Await to ensure the submission is processed server-side, then craft UX-specific response
    let upstream: Response | undefined;
    try {
      upstream = await context.next(forwardReq);
      console.log('[forms-gate] forwarded to forms');
    } catch (_e) {
      // If forwarding fails, return an error to client
      console.log('[forms-gate] forward failed');
      return new Response(
        JSON.stringify({ ok: false, error: 'Forward failed' }),
        {
          status: 502,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'forward-failed',
          },
        },
      );
    }

    // Return JSON for XHR, else redirect to thank-you page for non-JS fallback
    const accept = request.headers.get('accept') || '';
    const upstreamStatus = upstream?.status ?? 200;
    const upstreamOk = upstreamStatus < 400;
    if (accept.includes('application/json')) {
      if (upstreamOk) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'x-forms-gate': 'ok',
            'x-forms-gate-upstream-status': String(upstreamStatus),
          },
        });
      }
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
      );
    }

    if (upstreamOk) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: '/thank-you/',
          'x-forms-gate': 'ok',
          'x-forms-gate-upstream-status': String(upstreamStatus),
        },
      });
    }
    // On non-XHR and upstream error, surface upstream response to client
    return upstream as Response;
  } catch (err) {
    console.log(
      '[forms-gate] unhandled error',
      (err as any)?.message || String(err),
    );
    return new Response(JSON.stringify({ ok: false, error: 'Edge crash' }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'x-forms-gate': 'crash' },
    });
  }
};
