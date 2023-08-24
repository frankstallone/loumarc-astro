import { portableTextToHtml } from 'astro-sanity';
import { urlForImage } from './urlForImage';

const customComponents = {
  types: {
    image: ({ value }) => {
      return `
        <picture>
          <source
            srcset="${urlForImage(value.asset)
              .width(900)
              .format('webp')
              .quality(90)
              .url()}"
            type="image/webp"
            class="h-auto"
          />
          <img
            class="responsive__img"
            src="${urlForImage(value.asset)
              .width(900)
              .format('jpg')
              .quality(90)
              .url()}"
            alt="${value.alt}"
            class="h-auto"
          />
        </picture>
      `;
    },
  },
};

export function sanityPortableText(portabletext) {
  return portableTextToHtml(portabletext, customComponents);
}
