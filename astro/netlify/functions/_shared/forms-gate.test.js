import assert from 'node:assert/strict'
import { test } from 'node:test'

import formsGate from '../../edge-functions/forms-gate.ts'

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

function formRequest({ accept, body, source }) {
  return new Request('https://loumarcsigns.com/forms/contact', {
    body: new URLSearchParams(body),
    headers: {
      accept,
      'content-type': 'application/x-www-form-urlencoded',
      'x-forwarded-for': source,
    },
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
