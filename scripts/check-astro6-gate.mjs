#!/usr/bin/env node

import { execFileSync } from 'node:child_process'

function npmView(pkg, fields = ['version', 'peerDependencies']) {
  const output = execFileSync('npm', ['view', pkg, ...fields, '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()

  const parsed = JSON.parse(output)

  if (typeof parsed === 'string') {
    return parsed
  }

  return parsed
}

function supportsAstro6(range = '') {
  return /(^|\s|\|)\^?6(?:\.\d+\.\d+)?(?=$|\s|\|)/.test(range)
}

function printPackageStatus(name, version, astroRange, status) {
  const peerText = astroRange ? ` (astro peer: ${astroRange})` : ''
  console.log(`- ${name}@${version}${peerText}: ${status}`)
}

const astroVersion = npmView('astro', ['version'])
const netlifyVersion = npmView('@astrojs/netlify', ['version'])
const sanity = npmView('@sanity/astro')
const purgeCss = npmView('astro-purgecss')

const sanityRange = sanity.peerDependencies?.astro ?? ''
const purgeCssRange = purgeCss.peerDependencies?.astro ?? ''
const sanityReady = supportsAstro6(sanityRange)

console.log('Astro 6 upgrade gate check')
console.log(`- astro@${astroVersion} is the current stable target`)
console.log(`- @astrojs/netlify@${netlifyVersion} is available for Astro 6`)
printPackageStatus('@sanity/astro', sanity.version, sanityRange, sanityReady ? 'READY' : 'BLOCKED')
printPackageStatus(
  'astro-purgecss',
  purgeCss.version,
  purgeCssRange,
  'REMOVE DURING CUTOVER'
)

if (sanityReady) {
  console.log('')
  console.log('Gate open: proceed with the Astro 6 cutover plan.')
  process.exit(0)
}

console.log('')
console.log('Gate closed: do not bump Astro to 6 yet.')
console.log('Reason: @sanity/astro has not published Astro 6 support in npm metadata.')
process.exit(1)
