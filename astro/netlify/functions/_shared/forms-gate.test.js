import assert from 'node:assert/strict'
import { test } from 'node:test'

import formsGate from '../../edge-functions/forms-gate.ts'

test('forms gate blocks only exact campaign values in the Referer URL', async (t) => {
  const logs = captureFormSpamLogs(t)
  const cases = [
    ['blocked campaign', '?gad_campaignid=23468912534', true],
    ['allowed campaign', '?gad_campaignid=23473502092', false],
    ['missing Referer', undefined, false],
    ['malformed Referer', 'not a URL?gad_campaignid=23468912534', false],
    ['missing campaign', '?utm_source=google', false],
    ['empty campaign', '?gad_campaignid=', false],
    ['longer value', '?gad_campaignid=234689125340', false],
    ['prefixed value', '?gad_campaignid=123468912534', false],
    ['shorter value', '?gad_campaignid=2346891253', false],
    ['padded value', '?gad_campaignid=+23468912534+', false],
    ['other parameter', '?other=23468912534', false],
    ['different parameter name', '?GAD_CAMPAIGNID=23468912534', false],
    ['fragment', '#gad_campaignid=23468912534', false],
    [
      'encoded value',
      '?gad_campaignid=%32%33%34%36%38%39%31%32%35%33%34',
      true,
    ],
    [
      'blocked value last',
      '?gad_campaignid=23473502092&gad_campaignid=23468912534',
      true,
    ],
    [
      'blocked value first',
      '?gad_campaignid=23468912534&gad_campaignid=23473502092',
      true,
    ],
  ]
  let sourceIndex = 1

  for (const accept of ['application/json', 'text/html']) {
    for (const [name, value, blocked] of cases) {
      await t.test(`${name} (${accept})`, async (t) => {
        const referer =
          value?.startsWith('?') || value?.startsWith('#')
            ? `https://loumarcsigns.com/request-form/${value}`
            : value
        const body = { 'form-name': 'test-001', 'cap-token': 'valid-token' }
        const validate = t.mock.method(globalThis, 'fetch', async () =>
          jsonResponse({ success: true }),
        )
        const next = t.mock.fn(async (request) => {
          assert.deepEqual(Object.fromEntries(await request.formData()), body)
          assert.equal(request.headers.get('referer'), referer ?? null)
          return new Response(null, { status: 202 })
        })

        const response = await formsGate(
          formRequest({
            accept,
            body,
            referer,
            multipart: accept === 'application/json',
            source: `198.51.100.${sourceIndex++}`,
          }),
          { next },
        )

        assert.equal(next.mock.callCount(), blocked ? 0 : 1)
        assert.equal(validate.mock.callCount(), blocked ? 0 : 1)
        assert.equal(
          response.headers.get('x-forms-gate'),
          blocked ? 'blocked-campaign' : 'ok',
        )
        if (accept === 'application/json') {
          assert.equal(response.status, 200)
          assert.deepEqual(
            await response.json(),
            blocked ? { ok: true, skipped: true } : { ok: true },
          )
        } else {
          assert.equal(response.status, 303)
          assert.equal(response.headers.get('location'), '/thank-you/')
        }
      })
    }
  }

  const blockedLogs = logs.filter((log) => log.reason === 'blocked-campaign')
  assert.equal(blockedLogs.length, 8)
  assert.equal(
    blockedLogs.every((log) => log.result === 'blocked'),
    true,
  )
  assert.equal(JSON.stringify(logs).includes('23468912534'), false)
  assertNoSensitiveLogFields(logs)
})

test('forms gate logs honeypot, missing token, invalid token, and forwarded outcomes', async (t) => {
  const logs = captureFormSpamLogs(t)
  let capSuccess = false

  t.mock.method(globalThis, 'fetch', async () =>
    jsonResponse({ success: capSuccess }),
  )

  const honeypot = await formsGate(
    formRequest({
      accept: 'application/json',
      body: {
        'additional-info': 'filled',
        'cap-token': 'not-used',
        'form-name': 'contact',
      },
      source: '203.0.113.80',
    }),
    { next: async () => new Response(null, { status: 204 }) },
  )
  const missingToken = await formsGate(
    formRequest({
      accept: 'application/json',
      body: { 'form-name': 'contact' },
      source: '203.0.113.81',
    }),
    { next: async () => new Response(null, { status: 204 }) },
  )
  const invalidToken = await formsGate(
    formRequest({
      accept: 'application/json',
      body: { 'cap-token': 'invalid-token', 'form-name': 'contact' },
      source: '203.0.113.82',
    }),
    { next: async () => new Response(null, { status: 204 }) },
  )

  capSuccess = true
  const forwarded = await formsGate(
    formRequest({
      accept: 'application/json',
      body: { 'cap-token': 'valid-token', 'form-name': 'contact' },
      source: '203.0.113.83',
    }),
    { next: async () => new Response(null, { status: 202 }) },
  )

  assert.equal(honeypot.status, 200)
  assert.equal(missingToken.status, 422)
  assert.equal(invalidToken.status, 422)
  assert.equal(forwarded.status, 200)
  assert.deepEqual(
    logs
      .filter((log) => log.surface === 'forms-gate')
      .map(({ action, reason, result, status, upstreamStatus }) => ({
        action,
        reason,
        result,
        status,
        upstreamStatus,
      })),
    [
      {
        action: 'forms-gate.submission',
        reason: 'honeypot',
        result: 'blocked',
        status: 200,
        upstreamStatus: undefined,
      },
      {
        action: 'forms-gate.submission',
        reason: 'missing-token',
        result: 'blocked',
        status: 422,
        upstreamStatus: undefined,
      },
      {
        action: 'forms-gate.submission',
        reason: 'invalid-token',
        result: 'blocked',
        status: 422,
        upstreamStatus: undefined,
      },
      {
        action: 'forms-gate.forward',
        reason: 'forwarded',
        result: 'forwarded',
        status: 200,
        upstreamStatus: 202,
      },
    ],
  )
  assertNoSensitiveLogFields(logs)
})

test('forms gate logs upstream and operational failures distinctly', async (t) => {
  const logs = captureFormSpamLogs(t)

  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify({ success: false }), { status: 503 }),
  )
  const validationUnavailable = await formsGate(
    formRequest({
      accept: 'application/json',
      body: { 'cap-token': 'token', 'form-name': 'contact' },
      source: '203.0.113.84',
    }),
    { next: async () => new Response(null, { status: 204 }) },
  )

  const crashed = await formsGate(
    {
      arrayBuffer() {
        throw new Error('body unavailable')
      },
      headers: new Headers({
        accept: 'application/json',
        'x-forwarded-for': '203.0.113.85',
      }),
      method: 'POST',
      url: 'https://loumarcsigns.com/forms/contact?email=private@example.com',
    },
    {},
  )

  assert.equal(validationUnavailable.status, 503)
  assert.equal(crashed.status, 500)
  assert.equal(
    logs.some(
      (log) =>
        log.action === 'forms-gate.validation' &&
        log.reason === 'upstream-forwarding' &&
        log.result === 'failed' &&
        log.status === 503 &&
        log.upstreamStatus === 503,
    ),
    true,
  )
  assert.equal(
    logs.some(
      (log) =>
        log.action === 'forms-gate.request' &&
        log.reason === 'operational-error' &&
        log.result === 'failed' &&
        log.status === 500,
    ),
    true,
  )
  assert.equal(
    logs.some((log) => log.path.includes('private@example.com')),
    false,
  )
  assertNoSensitiveLogFields(logs)
})

function formRequest({ accept, body, source, referer, multipart = false }) {
  const headers = new Headers({ accept, 'x-forwarded-for': source })
  let payload = new URLSearchParams(body)
  if (multipart) {
    payload = new FormData()
    for (const [name, value] of Object.entries(body)) payload.set(name, value)
  } else {
    headers.set('content-type', 'application/x-www-form-urlencoded')
  }
  if (referer !== undefined) headers.set('referer', referer)

  return new Request('https://loumarcsigns.com/forms/contact', {
    body: payload,
    headers,
    method: 'POST',
  })
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json' },
  })
}

function captureFormSpamLogs(t) {
  const logs = []

  t.mock.method(console, 'log', (line) => {
    try {
      const parsed = JSON.parse(line)
      if (parsed.event === 'loumarc.form_spam') {
        logs.push(parsed)
      }
    } catch (_error) {}
  })

  return logs
}

function assertNoSensitiveLogFields(logs) {
  assert.equal(
    logs.some(
      (log) =>
        Object.hasOwn(log, 'token') ||
        Object.hasOwn(log, 'source') ||
        Object.hasOwn(log, 'email'),
    ),
    false,
  )
}
