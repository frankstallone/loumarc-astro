import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'post',
  title: 'Blog post',
  type: 'document',
  initialValue: () => ({
    publishedAt: new Date().toISOString().substring(0, 10),
  }),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
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
      name: 'excerpt',
      title: 'Excerpt',
      description:
        'The excerpt is a short description of the blog post that currently shows up on the blog landing page and anywhere we have blog Cards.',
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
      name: 'mainImage',
      title: 'Main image',
      description: 'The main image used for the blog post.',
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
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: {type: 'author'},
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      description: 'The categories the blog post belongs to (Currently we have none).',
      type: 'array',
      of: [{type: 'reference', to: {type: 'category'}}],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      description: 'The date the blog post was published.',
      type: 'date',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      description: 'The main content of the blog post.',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'mainImage',
    },
    prepare(selection) {
      const {author} = selection
      return {...selection, subtitle: author && `by ${author}`}
    },
  },
})
