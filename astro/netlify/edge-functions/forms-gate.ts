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
    return new Response(JSON.stringify({ ok: false, error: 'Invalid form data' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
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
        headers: { 'content-type': 'application/json', 'x-forms-gate': 'honeypot' },
      });
    }
    return new Response(null, { status: 303, headers: { Location: '/thank-you/', 'x-forms-gate': 'honeypot' } });
  }

  // Required: form-name and cap-token
  const formName = formData.get('form-name');
  const capToken = formData.get('cap-token');

  if (!formName || (typeof formName === 'string' && formName.trim() === '')) {
    console.log('[forms-gate] missing form-name');
    return new Response(JSON.stringify({ ok: false, error: 'Missing form-name' }), {
      status: 422,
      headers: { 'content-type': 'application/json', 'x-forms-gate': 'missing-form-name' },
    });
  }

  if (!capToken || (typeof capToken === 'string' && capToken.trim() === '')) {
    console.log('[forms-gate] missing cap-token');
    const accept = request.headers.get('accept') || '';
    if (accept.includes('application/json')) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing cap-token' }), {
        status: 422,
        headers: { 'content-type': 'application/json', 'x-forms-gate': 'missing-cap-token' },
      });
    }
    return new Response(null, {
      status: 303,
      headers: { Location: '/captcha-required/', 'x-forms-gate': 'missing-cap-token' },
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
    return new Response(JSON.stringify({ ok: false, error: 'Invalid cap-token' }), {
      status: 422,
      headers: { 'content-type': 'application/json', 'x-forms-gate': 'invalid-cap' },
    });
  }

  // Token is valid — allow the request to reach Netlify Forms
  // Await to ensure the submission is processed server-side, then craft UX-specific response
  try {
    const resp = await context.next(forwardReq);
    console.log('[forms-gate] forwarded to forms');
    // Optionally inspect resp if needed in future
  } catch (_e) {
    // If forwarding fails, return an error to client
    console.log('[forms-gate] forward failed');
    return new Response(JSON.stringify({ ok: false, error: 'Forward failed' }), {
      status: 502,
      headers: { 'content-type': 'application/json', 'x-forms-gate': 'forward-failed' },
    });
  }

  // Return JSON for XHR, else redirect to thank-you page for non-JS fallback
  const accept = request.headers.get('accept') || '';
  if (accept.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-forms-gate': 'ok' },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { Location: '/thank-you/', 'x-forms-gate': 'ok' },
  });
  } catch (err) {
    console.log('[forms-gate] unhandled error', (err as any)?.message || String(err));
    return new Response(JSON.stringify({ ok: false, error: 'Edge crash' }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'x-forms-gate': 'crash' },
    });
  }
};
