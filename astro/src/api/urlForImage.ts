import { sanityClient } from 'sanity:client';
import { createImageUrlBuilder } from '@sanity/image-url';

export const imageBuilder = createImageUrlBuilder(sanityClient);

export function urlForImage(source: string) {
  return imageBuilder.image(source);
}
