import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  groups: [
    {
      name: 'seo',
      title: 'SEO',
    },
    {
      name: 'schema',
      title: 'Schema.org',
    },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Product',
      description: 'Used as the level 1 heading (<h1>) on the page.',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      description: 'The slug is used to generate the page URL.',
      group: 'seo',
      type: 'slug',
      validation: (Rule) => Rule.required(),
      options: {
        source: 'title',
        maxLength: 96,
      },
    }),
    defineField({
      name: 'mainImage',
      title: 'Main image',
      description: 'The main image used for the product.',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          description: 'Used for screen readers.',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      description: 'The gallery of images used for the product.',
      type: 'gallery',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      description: 'Featured products Cards show up first.',
      type: 'boolean',
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      description:
        'The excerpt is a short description of the product that currently shows up on the product page and anywhere we have product Cards.',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      description: 'The meta description used for search engines.',
      group: 'seo',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'body',
      title: 'Body',
      description: 'The main content of the product page.',
      type: 'blockContent',
    }),
    defineField({
      name: 'productSchema',
      title: 'Product Schema.org fields',
      description: 'Schema fields for SEO.',
      group: 'schema',
      type: 'object',
      fields: [
        defineField({
          name: 'image',
          title: 'Product photo',
          description: 'Product photography, used for Schema.org',
          type: 'image',
          options: {
            hotspot: true,
          },
        }),
        defineField({
          name: 'schemaDescription',
          title: 'Description',
          description: 'Description of the product, used for Schema.org',
          type: 'text',
        }),
        defineField({
          name: 'itemOfferedName',
          title: 'Item Offered Name',
          description: 'Offer catalog for unique custom signs, used for Schema.org',
          type: 'array',
          of: [
            {
              type: 'string',
            },
          ],
          options: {
            layout: 'tags',
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
    },
  },
})
