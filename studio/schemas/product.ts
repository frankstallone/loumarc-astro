import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
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
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'body',
      title: 'Body',
      description: 'The main content of the product page.',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
    },
  },
})
