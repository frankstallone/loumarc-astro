import type { ImageMetadata } from 'astro'

import channelLettersDoobiezFacade from '../assets/products/channel-letters/channel-letters-doobiez-facade.jpg'
import channelLettersFreshDispensaryFacadeDay from '../assets/products/channel-letters/channel-letters-fresh-dispensary-facade-day.jpg'
import channelLettersFreshElizabethFacadeNight from '../assets/products/channel-letters/channel-letters-fresh-elizabeth-facade-night.jpg'
import channelLettersFreshBlueHaloFacadeNight from '../assets/products/channel-letters/channel-letters-fresh-blue-halo-facade-night.jpg'
import channelLettersRoot22PoleSign from '../assets/products/monument-pylon-signs/channel-letters-root22-pole-sign.jpg'

export type LocalGalleryImage = {
  alt: string
  src: ImageMetadata
}

const storefrontLetterImages: LocalGalleryImage[] = [
  {
    src: channelLettersDoobiezFacade,
    alt: 'Doobiez - New Jersey Channel Letters sign by Loumarc Signs',
  },
  {
    src: channelLettersFreshDispensaryFacadeDay,
    alt: 'Fresh Dispensary - New Jersey Channel Letters sign by Loumarc Signs',
  },
  {
    src: channelLettersFreshElizabethFacadeNight,
    alt: 'Fresh Elizabeth - New Jersey Channel Letters sign by Loumarc Signs',
  },
  {
    src: channelLettersFreshBlueHaloFacadeNight,
    alt: 'Fresh - New Jersey Channel Letters sign by Loumarc Signs',
  },
]

const productGalleryAdditions: Record<string, LocalGalleryImage[]> = {
  'channel-letters': storefrontLetterImages,
  'lighted-box-exterior': storefrontLetterImages,
  'monument-pylon-signs': [
    {
      src: channelLettersRoot22PoleSign,
      alt: 'ROOT22 - New Jersey Monument Pylon sign by Loumarc Signs',
    },
  ],
}

export function getLocalProductGallery(slug: string) {
  return productGalleryAdditions[slug] ?? []
}
