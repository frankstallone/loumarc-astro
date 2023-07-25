import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'companyName',
      title: 'Company name',
      type: 'string',
    }),
    defineField({
      name: 'phoneNumber',
      title: 'Company telephone number',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Company description',
      description: 'Description to be used as a default meta description',
      type: 'text',
    }),
    defineField({
      name: 'url',
      title: 'Domain URL',
      type: 'url',
    }),
    defineField({
      name: 'ogImage',
      title: 'Open Graph Image',
      type: 'image',
    }),
    defineField({
      name: 'schemaDotOrg',
      title: 'Schema.org',
      description: 'Site wide Schema.org properties',
      type: 'object',
      fields: [
        {
          name: 'streetAddress',
          title: 'Postal Address',
          description: '@type: PostalAddress, streetAddress',
          type: 'string',
        },
        {
          name: 'addressLocality',
          title: 'Address Locality',
          description: 'addressLocality',
          type: 'string',
        },
        {
          name: 'addressRegion',
          title: 'Address Region',
          description: 'addressRegion',
          type: 'string',
        },
        {
          name: 'postalCode',
          title: 'Postal Code',
          description: 'postalCode',
          type: 'string',
        },
        {
          name: 'areaServed',
          title: 'Area Served, @type: State',
          description: 'areaServed',
          type: 'string',
        },
        {
          name: 'areaServedSameAs',
          title: 'Area Served, Same As',
          description: 'sameAs',
          type: 'string',
        },
        {
          name: 'schemaDescription',
          title: 'Description',
          description: 'Schema.org description',
          type: 'text',
        },
      ],
    }),
  ],
})
