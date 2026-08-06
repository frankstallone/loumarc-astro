import type { APIRoute } from 'astro'
import { sanityClient } from 'sanity:client'

export const prerender = true

type SiteSettings = {
  companyName?: string
  description?: string
  phoneNumber?: string
  streetAddress?: string
  addressLocality?: string
  addressRegion?: string
  postalCode?: string
}

type Resource = {
  title: string
  slug: string
  excerpt?: string
  metaDescription?: string
}

const clean = (value?: string) => value?.replace(/\s+/g, ' ').trim() ?? ''

const escapeLinkLabel = (value: string) =>
  clean(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')

const resourceLink = (resource: Resource, siteUrl: string, pathPrefix = '') => {
  const url = new URL(`${pathPrefix}/${resource.slug}/`, siteUrl).href
  const description = clean(resource.metaDescription || resource.excerpt)

  return `- [${escapeLinkLabel(resource.title)}](${url})${description ? `: ${description}` : ''}`
}

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error('Astro site config is required to generate llms.txt')
  }

  const siteUrl = site.origin
  const [settings, products, posts] = await Promise.all([
    sanityClient.fetch<SiteSettings>(`*[
      _type == "siteSettings" && _id == "siteSettings"
    ][0]{
      companyName,
      description,
      phoneNumber,
      "streetAddress": schemaDotOrg.streetAddress,
      "addressLocality": schemaDotOrg.addressLocality,
      "addressRegion": schemaDotOrg.addressRegion,
      "postalCode": schemaDotOrg.postalCode
    }`),
    sanityClient.fetch<Resource[]>(`*[
      _type == "product" && defined(title) && defined(slug.current)
    ] | order(title asc){
      title,
      "slug": slug.current,
      excerpt,
      metaDescription
    }`),
    sanityClient.fetch<Resource[]>(`*[
      _type == "post" && defined(title) && defined(slug.current)
    ] | order(coalesce(publishedAt, _createdAt) desc){
      title,
      "slug": slug.current,
      excerpt,
      metaDescription
    }`),
  ])

  const companyName = clean(settings?.companyName) || 'Loumarc Signs'
  const description =
    clean(settings?.description) ||
    'Full-service custom sign company based in Hillsborough Township, New Jersey.'
  const address = [
    settings?.streetAddress,
    settings?.addressLocality,
    [settings?.addressRegion, settings?.postalCode]
      .map(clean)
      .filter(Boolean)
      .join(' '),
  ]
    .map(clean)
    .filter(Boolean)
    .join(', ')
  const contact = [clean(settings?.phoneNumber), address]
    .filter(Boolean)
    .join(' · ')

  const lines = [
    `# ${companyName}`,
    '',
    `> ${description}`,
    '',
    'Use the linked pages as the source of truth for current products, project requirements, and business information.',
    '',
    ...(contact ? [`Contact: ${contact}`, ''] : []),
    '## Main',
    '',
    `- [Home](${siteUrl}/): Company overview, process, guarantee, and project inquiry.`,
    `- [Sign products](${siteUrl}/products/): Complete sign product catalog and service overview.`,
    `- [Start a sign project](${siteUrl}/#contact-form): Contact Loumarc Signs about goals, budget, needs, and deadlines.`,
    `- [Blog](${siteUrl}/blog/): Guides and project stories about sign planning, design, cost, permitting, materials, and accessibility.`,
    '',
    '## Sign products',
    '',
    ...products.map((product) => resourceLink(product, siteUrl, '/products')),
    '',
    '## Optional',
    '',
    `- [Accessibility statement](${siteUrl}/accessibility-statement/): Accessibility conformance, known limitations, and feedback contact.`,
    ...posts.map((post) => resourceLink(post, siteUrl)),
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
