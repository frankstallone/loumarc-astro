import { urlForImage } from '../api/urlForImage';

interface ImageUrlBuilderOptions {
  title: string;
  width: number;
  height: number;
  format: 'webp' | 'jpg';
  quality: number;
}

export function getProductLocation(title: string) {
  // Converting page title to dashed lowercase string
  const titleToDash = title.toLowerCase().replace(/\s/g, '-');
  // Array of SEO locations
  const seoLocations = [
    'new-jersey',
    'southern-new-jersey',
    'central-new-jersey',
    'northern-new-jersey',
    'near-me',
  ];
  // Randomly select a location from the array
  return `/${titleToDash}-${
    seoLocations[Math.floor(Math.random() * seoLocations.length)]
  }`;
}

export function getVanityURL(image, options: ImageUrlBuilderOptions) {
  // Constructed URL for webp image
  const originalURL = urlForImage(image)
    .width(options.width)
    .height(options.height)
    .format(options.format)
    .quality(options.quality)
    .url();
  // Index of the query string
  const originalURLQueryIndex = originalURL.indexOf('?');
  // New URL with vanity string
  const vanityURL =
    originalURL.slice(0, originalURLQueryIndex) +
    getProductLocation(options.title) +
    originalURL.slice(originalURLQueryIndex);

  return vanityURL;
}
