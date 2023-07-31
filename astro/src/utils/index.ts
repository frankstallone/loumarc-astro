import { urlForImage } from '../api/urlForImage';

interface ImageUrlBuilderOptions {
  title: string;
  width: number;
  height: number;
  format: 'webp' | 'jpg';
  quality: number;
}

/**
 * Function that returns a SEO friendly string for image name
 * @param title Page title
 * @param secondaryInfo Array of strings to be used in image name
 * @returns SEO friendly string for image name
 */

export function getImageName(
  title: string,
  secondaryInfo?: Array<string> | null
) {
  // Converting page title to dashed lowercase string
  const titleToDash = title.toLowerCase().replace(/\s/g, '-');
  // Array of SEO locations for product pages
  const seoLocations = [
    'new-jersey',
    'southern-new-jersey',
    'central-new-jersey',
    'northern-new-jersey',
    'near-me',
  ];
  // Array of secondary info for creating image names, if none provided, use SEO locations are default
  const secondaryInfoStrings = secondaryInfo ? secondaryInfo : seoLocations;
  // Return page title only if secondary info is null
  if (secondaryInfo === null) return `/${titleToDash}`;
  // Return page title and randomly selected option from given array
  return `/${titleToDash}-${
    secondaryInfoStrings[
      Math.floor(Math.random() * secondaryInfoStrings.length)
    ]
  }`;
}

/**
 * Function that returns a vanity URL for an image
 * @param image Sanity Image Object
 * @param options ImageUrlBuilderOptions
 * @param secondaryInfo Array of strings to be used in image name
 * @returns Vanity URL string
 */
export function getVanityURL(
  image,
  options: ImageUrlBuilderOptions,
  secondaryInfo?: Array<string> | null
) {
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
    getImageName(options.title, secondaryInfo) +
    `.${options.format}` +
    originalURL.slice(originalURLQueryIndex);

  return vanityURL;
}

export function getProductSchema(product, siteSettings) {
  // Creating product image for schema.org
  const schemaImage = getVanityURL(
    product.image,
    {
      title: `New Jersey ${product.title}`,
      width: 600,
      height: 450,
      format: 'jpg',
      quality: 90,
    },
    null
  );

  function createOffer(items: Array<string>) {
    return items.map((item) => {
      return {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: item,
        },
      };
    });
  }

  const itemsOffered = createOffer(product.itemOfferedName);

  const productSchema = {
    '@context': 'http://schema.org/',
    '@type': 'Service',
    serviceType: product.title,
    description: product.schemaDescription,
    provider: {
      '@type': 'LocalBusiness',
      name: siteSettings.companyName,
      telephone: siteSettings.phoneNumber,
      logo: 'https://loumarcsigns.com/images/og-image.png',
      priceRange: '$$-$$$',
      image: schemaImage,
      address: {
        '@type': 'PostalAddress',
        streetAddress: siteSettings.schemaDotOrg.streetAddress,
        addressLocality: siteSettings.schemaDotOrg.addressLocality,
        addressRegion: siteSettings.schemaDotOrg.addressRegion,
        postalCode: siteSettings.schemaDotOrg.postalCode,
      },
    },
    areaServed: [
      {
        '@type': 'State',
        name: 'New Jersey',
        sameAs: 'https://en.wikipedia.org/wiki/New_Jersey',
      },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Unique Custom Signs',
      itemListElement: itemsOffered,
    },
  };

  return `<script type="application/ld+json">${JSON.stringify(
    productSchema,
    null,
    2
  )}</script>`;
}
