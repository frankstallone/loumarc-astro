import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildFormSpamLogEntry, fingerprintSource } from './spam-monitoring.js'

test('form spam log entries use the shared low-PII shape', () => {
  const entry = buildFormSpamLogEntry({
    surface: 'forms-gate',
    action: 'forms-gate.submission',
    result: 'blocked',
    reason: 'missing-token',
    method: 'POST',
    path: '/forms/contact?email=customer@example.com',
    source: '203.0.113.10',
    status: 422,
    token: 'lc_cap_secret',
    email: 'customer@example.com',
  })

  assert.deepEqual(entry, {
    event: 'loumarc.form_spam',
    schemaVersion: 1,
    surface: 'forms-gate',
    action: 'forms-gate.submission',
    result: 'blocked',
    reason: 'missing-token',
    method: 'POST',
    path: '/forms/contact',
    status: 422,
    sourceHash: fingerprintSource('203.0.113.10'),
  })
  assert.equal('source' in entry, false)
  assert.equal('token' in entry, false)
  assert.equal('email' in entry, false)
})
