import { defineCollection, z } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featuredImage: z.string().optional(),
    language: z.enum(['en', 'sq']),
    alternateLanguage: z.string().optional(),
    alternateURL: z.string().optional(),
    slug: z.string(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      canonicalURL: z.string().optional(),
    }).optional(),
  }),
});

const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    featuredImage: z.string().optional(),
    language: z.enum(['en', 'sq']),
    slug: z.string(),
    seo: z.object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      canonicalURL: z.string().optional(),
    }).optional(),
  }),
});

const accommodationCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    location: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    price: z.string().optional(),
    amenities: z.array(z.string()).default([]),
    images: z.array(z.string()).default([]),
    featuredImage: z.string().optional(),
    rating: z.number().optional(),
    bookingURL: z.string().optional(),
    language: z.enum(['en', 'sq']),
    slug: z.string(),
    pubDate: z.coerce.date().optional(),
  }),
});

const destinationsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    region: z.string().optional(),
    featuredImage: z.string().optional(),
    images: z.array(z.string()).default([]),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    language: z.enum(['en', 'sq']),
    slug: z.string(),
    highlights: z.array(z.string()).default([]),
  }),
});

const activitiesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().optional(),
    featuredImage: z.string().optional(),
    language: z.enum(['en', 'sq']),
    slug: z.string(),
  }),
});

const attractionsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    type: z.string().optional(),
    location: z.string().optional(),
    featuredImage: z.string().optional(),
    images: z.array(z.string()).default([]),
    language: z.enum(['en', 'sq']),
    slug: z.string(),
  }),
});

const toursCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    duration: z.string().optional(),
    price: z.string().optional(),
    featuredImage: z.string().optional(),
    language: z.enum(['en', 'sq']),
    slug: z.string(),
  }),
});

export const collections = {
  'posts': postsCollection,
  'pages': pagesCollection,
  'accommodation': accommodationCollection,
  'destinations': destinationsCollection,
  'activities': activitiesCollection,
  'attractions': attractionsCollection,
  'tours': toursCollection,
};
