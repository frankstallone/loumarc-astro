const TELEPHONE_CLICK_EVENT = 'phone_click'

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim()

export function getTelephoneClickParameters({ href, text, pageLocation }) {
  return {
    phone_number: href.replace(/^tel:/i, ''),
    link_text: normalizeWhitespace(text),
    link_url: href,
    page_location: pageLocation,
  }
}

export function installTelephoneClickTracking({
  documentObject = globalThis.document,
  windowObject = globalThis.window,
} = {}) {
  if (!documentObject?.addEventListener) return

  const handleClick = (event) => {
    const target = event.target
    if (!target || typeof target.closest !== 'function') return

    const link = target.closest('a[href]')
    if (!link) return

    const href = link.getAttribute('href') || ''
    if (!/^tel:/i.test(href) || typeof windowObject?.gtag !== 'function') return

    windowObject.gtag(
      'event',
      TELEPHONE_CLICK_EVENT,
      getTelephoneClickParameters({
        href,
        text: link.textContent || '',
        pageLocation: windowObject.location?.href || '',
      }),
    )
  }

  documentObject.addEventListener('click', handleClick)
}
