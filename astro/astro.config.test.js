import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('keeps the main-thread GA4 data layer off the Partytown bridge', async () => {
  const config = await readFile(
    new URL('./astro.config.mjs', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(config, /forward:\s*\[[^\]]*['"]dataLayer\.push['"]/)
})
