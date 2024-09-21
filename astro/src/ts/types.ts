export type Slug =
  | 'default'
  | 'how-to-gain-more-peoples-attention-with-signs-near-your-business';

export type SanityProps = {
  title: string;
  body: any;
  slug: string;
  metaDescription: string;
  productSchema: any;
  gallery?: any;
  mainImage?: string;
};

export type Header = {
  meta: {
    title?: string;
    description?: string;
    canonicalURL?: URL | string;
    image?: string;
  };
  productSchema?: {
    title?: string;
    image: string;
    description: string;
    itemOfferedName: Array<string>;
  };
  overlay?: boolean;
};
