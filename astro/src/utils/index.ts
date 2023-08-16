import { urlForImage } from '../api/urlForImage';

interface ImageUrlBuilderOptions {
  title: string;
  width: number;
  height: number;
  format: 'webp' | 'jpg';
  quality: number;
  index?: number;
  imgObj: any; // Sanity image object
}

/**
 * Turns a page title into dash-seperated lowercase string
 * @param title Page title string
 * @returns Dash-seperated lowercase string
 */
export function spaceToDash(title: string) {
  return title.toLowerCase().replace(/\s/g, '-');
}

/**
 * Function that returns a SEO friendly string for image name
 * @param title Page title
 * @param secondaryInfo Array of strings to be used in image name
 * @returns SEO friendly string for image name
 */

export function getSeoStrings(
  index: number,
  secondaryInfo?: Array<string> | null
) {
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

  // If we have an index, let's use it to return a specific string from the array
  if (secondaryInfoStrings[index]) {
    return `${secondaryInfoStrings[index]}`;
  } else {
    return `${secondaryInfoStrings[secondaryInfoStrings.length - 1]}-${
      index - secondaryInfoStrings.length + 1
    }`;
  }
}

/**
 * Function that returns a vanity URL for an image
 * @param options ImageUrlBuilderOptions
 * @param secondaryInfo Array of strings to be used in image name
 * @returns Vanity URL string
 */
export function getVanityURL(
  options: ImageUrlBuilderOptions,
  secondaryInfo?: Array<string> | null
) {
  // Constructed URL for webp image
  const originalURL = urlForImage(options.imgObj)
    .width(options.width)
    .height(options.height)
    .format(options.format)
    .quality(options.quality)
    .url();
  // Index of the query string
  const originalURLQueryIndex = originalURL.indexOf('?');
  const pageTitleDashed = spaceToDash(options.title);

  // Return URL with page title only if secondary info is null
  if (secondaryInfo === null || options.index === undefined)
    return (
      originalURL.slice(0, originalURLQueryIndex) +
      `/${pageTitleDashed}.${options.format}` +
      originalURL.slice(originalURLQueryIndex)
    );

  const seoStrings = getSeoStrings(options.index, secondaryInfo);
  // Return URL with SEO friendly image name
  return (
    originalURL.slice(0, originalURLQueryIndex) +
    `/${pageTitleDashed}-${seoStrings}.${options.format}` +
    originalURL.slice(originalURLQueryIndex)
  );
}

/**
 * Function that creates a Schema.org JSON-LD script for a product
 * @param product props.productSchema in <Head> component
 * @param siteSettings Site settings in Sanity
 * @returns
 */

export function getProductSchema(product, siteSettings) {
  // Creating product image for schema.org
  const schemaImage = getVanityURL(
    {
      imgObj: product.image,
      title: `New Jersey ${product.title}`,
      width: 600,
      height: 450,
      format: 'jpg',
      quality: 90,
    },
    null
  );
  // Creates an array of Offers for schema.org
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
