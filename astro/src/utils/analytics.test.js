import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getTelephoneClickParameters,
  installTelephoneClickTracking,
} from './analytics.js'

test('builds consistent GA4 parameters for telephone links', () => {
  assert.deepEqual(
    getTelephoneClickParameters({
      href: 'tel:+19085754000',
      text: '  (908)   575-4000  ',
      pageLocation: 'https://loumarcsigns.com/products/',
    }),
    {
      phone_number: '+19085754000',
      link_text: '(908) 575-4000',
      link_url: 'tel:+19085754000',
      page_location: 'https://loumarcsigns.com/products/',
    },
  )
})

test('sends one delegated phone_click event for case-insensitive telephone links', () => {
  const listeners = new Map()
  const documentObject = {
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
  }
  const calls = []
  const windowObject = {
    location: { href: 'https://loumarcsigns.com/' },
    gtag(...args) {
      calls.push(args)
    },
  }
  const link = {
    getAttribute(name) {
      return name === 'href' ? 'TEL:+19085754000' : null
    },
    textContent: 'Call (908) 575-4000',
  }
  const target = {
    closest(selector) {
      return selector === 'a[href]' ? link : null
    },
  }

  installTelephoneClickTracking({
    documentObject,
    windowObject,
  })

  listeners.get('click')({ target })

  assert.deepEqual(calls, [
    [
      'event',
      'phone_click',
      {
        phone_number: '+19085754000',
        link_text: 'Call (908) 575-4000',
        link_url: 'TEL:+19085754000',
        page_location: 'https://loumarcsigns.com/',
      },
    ],
  ])
  assert.equal(listeners.size, 1)
})

test('ignores non-telephone clicks and pages without gtag', () => {
  const listeners = new Map()
  const documentObject = {
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
  }
  const windowObject = {
    location: { href: 'https://loumarcsigns.com/' },
  }

  installTelephoneClickTracking({ documentObject, windowObject })

  assert.doesNotThrow(() => {
    listeners.get('click')({ target: { closest: () => null } })
    listeners.get('click')({
      target: {
        closest: () => ({
          getAttribute: () => 'tel:+19085754000',
          textContent: '(908) 575-4000',
        }),
      },
    })
  })
})
