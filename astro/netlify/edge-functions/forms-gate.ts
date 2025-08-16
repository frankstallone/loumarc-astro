export default async (request: Request, context: any) => {
  // Only gate POSTs to /forms/*; pass through everything else
  if (request.method !== 'POST') {
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
    return new Response(JSON.stringify({ ok: false, error: 'Invalid form data' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Honeypot check
  const honey = formData.get('additional-info');
  if (typeof honey === 'string' && honey.trim().length > 0) {
    // Silently accept to not tip off bots, but do not forward to Forms
    const accept = request.headers.get('accept') || '';
    if (accept.includes('application/json')) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(null, { status: 303, headers: { Location: '/thank-you/' } });
  }

  // Required: form-name and cap-token
  const formName = formData.get('form-name');
  const capToken = formData.get('cap-token');

  if (!formName || (typeof formName === 'string' && formName.trim() === '')) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing form-name' }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!capToken || (typeof capToken === 'string' && capToken.trim() === '')) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing cap-token' }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
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
  } catch (_e) {
    valid = false;
  }

  if (!valid) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid cap-token' }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Token is valid — allow the request to reach Netlify Forms
  // Await to ensure the submission is processed server-side, then craft UX-specific response
  try {
    await context.next(forwardReq);
  } catch (_e) {
    // If forwarding fails, return an error to client
    return new Response(JSON.stringify({ ok: false, error: 'Forward failed' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Return JSON for XHR, else redirect to thank-you page for non-JS fallback
  const accept = request.headers.get('accept') || '';
  if (accept.includes('application/json')) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { Location: '/thank-you/' },
  });
};
