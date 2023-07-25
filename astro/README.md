# Astro Basics

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```
/
├── public/
├── src/
│   ├── api/
│   ├── assets/
│   ├── components/
│   ├── css/
│   ├── layouts/
│   ├── pages/
│   └── ts/
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory. However, images have been optimized using `@astrojs/image` and are stored in the `/assets/` directory. Astro is in the middle of moving to a new Assets API, so this may change in the future.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `npm install`          | Installs dependencies                            |
| `npm run dev`          | Starts local dev server at `localhost:3000`      |
| `npm run build`        | Build your production site to `./dist/`          |
| `npm run preview`      | Preview your build locally, before deploying     |
| `npm run astro ...`    | Run CLI commands like `astro add`, `astro check` |
| `npm run astro --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## Schema.org JSON-LD example for Channel Letter Signs

```
<script type="application/ld+json">{
  "@context": "https://schema.org/",
  "@type": "Service",
  "serviceType": "Channel Letter Signs",
  "description": "New Jersey Channel Letter Signs | Lighted Channel Letter Signs | Choosing lighted channel letter signs for your New Jersey business involves many considerations. Reverse illuminated or lighted acrylic face? LED or neon illumination? Raceway or wall-mounted? These options might seem overwhelming, but with Loumarc Signs, you have experts to navigate these questions and more.",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Loumarc Signs",
    "telephone": "(908) 575-4000",
     "logo": "https://bit.ly/loumarc-signs-logo",
	 "priceRange": "$$-$$$",
    "image": "https://bit.ly/new-jersey-channel-letter-signs",
    "address": {
    "@type": "PostalAddress",
       "streetAddress": "178 US-206 suite a",
    "addressLocality": "Hillsborough Township",
    "addressRegion": "NJ",
    "postalCode": "08844" }
  },
      "areaServed": [{
    "@type": "State",
    "name": "New Jersey",
    "sameAs": "https://en.wikipedia.org/wiki/New_Jersey"
  }],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Unique Custom Signs",
    "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Channel Letter Signs"
            }
          },
        {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "New Jersery Channel Letter Signs"
            }
          },
         {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Lighted Channel Letter Signs"
            }
          },
         {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "New Jersey Lighted Channel Letter Signs"
            }
          },
	 {
	    "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "LED Channel Letter Signs"
            }
          },
	 {
	    "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Neon Illuminated Channel Letter Signs"
            }
          },
 	{
	    "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Raceway Channel Letter Signs"
            }
          },
	  {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Service",
              "name": "Wall Mounted Channel Letter Signs"
            }
          }
        ]
      }
}
</script>
```

### Sitewide

- `provider`: Pulled from `siteSettings.json` in Sanity
- `logo`: Pulled from Astro `public/images` folder.
  - `image`: Pulled from Main Image field in Sanity for specific product

### Products

- `serviceType`: Dynamically pulled from `title`
- `description`: Pulled from field in Sanity for specific product, `schemaDescription`
- `itemListElement` Should pull from an array field in Sanity. Find a friendly name for `itemOffered`
