import {defineConfig, isDev} from 'sanity'
import {visionTool} from '@sanity/vision'
import {deskTool} from 'sanity/desk'
import {schemaTypes} from './schemas'
import {getStartedPlugin} from './plugins/sanity-plugin-tutorial'
import {structure} from './src/structure'

const devOnlyPlugins = [getStartedPlugin()]

export default defineConfig({
  name: 'default',
  title: 'loumarc',

  projectId: 'vk5xc4pu',
  dataset: 'production',

  plugins: [
    deskTool({
      structure,
    }),
    visionTool(),
    ...(isDev ? devOnlyPlugins : []),
  ],

  schema: {
    types: schemaTypes,
  },
})
