import { defineCollection, z } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featuredImage: z.string().optional(),
    language: z.enum(['en', 'sq']).optional(),
    alternateLanguage: z.string().optional(),
    alternateURL: z.string().optional(),
    slug: z.string().optional(), // Made optional as fallback
    seo: z.any().optional(),
  }),
});

const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    featuredImage: z.string().optional(),
    language: z.enum(['en', 'sq']).optional(),
    slug: z.string().optional(), // Made optional as fallback
    seo: z.any().optional(),
  }),
});

const accommodationCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    location: z.string().optional(),
    category: z.string().optional(), // Accommodation category
    starRating: z.number().optional(), // 1-5 star rating
    accommodationType: z.enum(['hotel', 'apartment', 'villa', 'hostel', 'guesthouse', 'resort']).optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    price: z.string().optional(),
    priceFrom: z.number().optional(), // Numeric price
    amenities: z.array(z.string()).default([]),
    images: z.array(z.string()).default([]),
    featuredImage: z.string().optional(),
    rating: z.number().optional(), // Guest rating/review score
    ratingWords: z.string().optional(), // Rating description (e.g., "Very Good")
    numberOfReviews: z.number().optional(),
    bookingURL: z.string().optional(),
    language: z.enum(['en', 'sq']).optional(),
    slug: z.string().optional(), // Made optional as fallback
    pubDate: z.coerce.date().optional(),
    seo: z.any().optional(),

    // Extended fields from CSV
    address: z.string().optional(),
    city: z.string().optional(),
    ratings: z.object({
      overall: z.number(),
      location: z.number(),
      cleanliness: z.number(),
      facilities: z.number(),
      value: z.number(),
      comfort: z.number(),
      staff: z.number(),
      wifi: z.number(),
    }).optional(),
    roomTypes: z.array(z.string()).default([]),
    nearbyAttractions: z.array(z.string()).default([]),
    nearbyRestaurants: z.array(z.string()).default([]),
    nearbyBeaches: z.array(z.string()).default([]),
    whatsNearby: z.array(z.string()).default([]),
    airports: z.array(z.string()).default([]),
    paymentMethods: z.array(z.string()).default([]),
    reviews: z.array(z.object({
      name: z.string(),
      country: z.string(),
      text: z.string(),
    })).default([]),
    bestFor: z.string().optional(),
    bestCategories: z.string().optional(),
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
    language: z.enum(['en', 'sq']).optional(),
    slug: z.string().optional(),
    highlights: z.array(z.string()).default([]),
    seo: z.any().optional(),
  }),
});

const activitiesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string().optional(),
    featuredImage: z.string().optional(),
    language: z.enum(['en', 'sq']).optional(),
    slug: z.string().optional(),
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
    language: z.enum(['en', 'sq']).optional(),
    slug: z.string().optional(),
    seo: z.any().optional(),
  }),
});

export const collections = {
  'posts': postsCollection,
  'pages': pagesCollection,
  'accommodation': accommodationCollection,
  'destinations': destinationsCollection,
  'activities': activitiesCollection,
  'attractions': attractionsCollection,
};
