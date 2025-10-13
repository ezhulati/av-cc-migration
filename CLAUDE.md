# AlbaniaVisit.com WordPress to Astro 5 Migration Project

## Executive Summary

This document outlines the comprehensive migration strategy for transitioning albaniavisit.com from WordPress to Astro 5, a modern static site generator. The primary objective is to preserve 5 years of SEO rankings, maintain exact URL structures, and migrate all valuable content including custom images and multimedia assets while building a best-in-class travel website experience.

## Project Goals

### Primary Objectives
1. **SEO Preservation**: Maintain all existing URL structures and search engine rankings
2. **Content Migration**: Transfer all posts, pages, custom post types, and media assets
3. **Image Asset Management**: Preserve and optimize all photography and visual content
4. **Multilingual Support**: Maintain English (/en/) and Albanian (/sq/) language versions
5. **Modern Architecture**: Implement Astro 5 with best practices for performance and SEO
6. **Zero Downtime**: Execute migration with minimal disruption to users and search engines

### Success Metrics
- 100% URL structure preservation (no broken links)
- All images and media assets successfully migrated
- Page load speed improvement (target: <2s initial load)
- Lighthouse scores >90 across all metrics
- Zero loss in search engine rankings post-migration
- Maintained or improved Core Web Vitals

## Current Site Analysis

### Site Structure Overview

**Domain**: albaniavisit.com
**Current Platform**: WordPress
**Content Management**: WordPress Admin + WPGraphQL (installed)
**Language Support**: Bilingual (English & Albanian)

### Content Inventory

#### 1. Content Types Identified

**Standard WordPress Content**:
- Blog Posts (~31+ identified in post-sitemap.xml)
- Static Pages (~20+ core pages)
- Custom Post Types:
  - Accommodation (35+ sitemaps worth of content)
  - Activities
  - Attractions
  - Destinations
  - Tours
  - Travel Guides
  - Bus Routes
  - News
  - Tourism Politics
  - Cuisine

**Media Assets**:
- Featured images for all posts/pages
- Gallery images
- Inline content images
- Downloadable resources
- Video embeds (if any)

#### 2. URL Structure Patterns

**Blog Posts**:
```
English: /[post-slug]/
Albanian: /sq/[post-slug]/
```

**Pages**:
```
English: /[page-slug]/
Albanian: /sq/[page-slug]/
```

**Custom Post Types**:
```
Accommodation (English): /accommodation/[post-slug]/
Accommodation (Albanian): /sq/akomodimi/[post-slug]/

Destinations: /destinations/[location-name]/
Attractions: /attractions/[site-name]/
Activities: /activities/[activity-type]/
```

**Hierarchical Pages**:
```
/about/
/about/team/
/about/team/[member-name]/

/cars/
/cars/transfers/
/cars/rental-cars/
```

#### 3. Key Sections & Navigation

**Main Navigation Structure**:
1. **Destinations**
   - Northern Albania
   - Central Albania
   - Southern Albania
   - Specific cities: Tirana, Shkodër, Gjirokastër, etc.

2. **Landmarks**
   - UNESCO World Heritage Sites
   - Castles & Fortresses
   - Historical Sites & Museums
   - Beaches & Coastal Areas

3. **Experiences**
   - Outdoor Adventure
   - Hiking & Trekking
   - Rock Climbing
   - Agrotourism
   - Wine Tasting

4. **Advisor**
   - Trip Planning
   - Travel Information
   - Currency, Language, Safety guides

5. **About**
   - Vision
   - Team
   - Foundation

6. **Services**
   - Cars & Transfers
   - Accommodation listings

#### 4. Important URLs for Preservation

**Critical Pages**:
- Homepage: `/` and `/sq/`
- About pages: `/about/*`
- Contact: `/contact/`
- Terms & Conditions: `/terms-conditions/`
- Key blog posts (high traffic):
  - `/best-time-to-visit-albania/`
  - `/moving-to-albania/`
  - `/albania-winter-travel-guide/`
  - `/life-in-communist-albania/`

**E-commerce/Booking**:
- `/gp-checkout/*` (payment processing)
- `/gp-invoices/`
- `/partnerships/`

## Technical Architecture

### WordPress Current Stack
- CMS: WordPress (version TBD - need to verify)
- Plugins:
  - WPGraphQL (installed)
  - Multilingual plugin (WPML or Polylang - need to verify)
  - SEO plugin (Yoast/RankMath - need to verify)
  - Custom Post Type plugins
- Theme: Custom theme (need to analyze)
- Database: MySQL
- Hosting: (need to verify)

### Astro 5 Target Stack

**Core Framework**:
```
- Astro 5.x (latest stable)
- Node.js 18+
- TypeScript
- Content Collections API
```

**Key Features to Implement**:
- Static Site Generation (SSG)
- Image Optimization (@astrojs/image)
- SEO optimization
- Sitemap generation
- RSS feeds
- Internationalization (i18n)

**Recommended Integrations**:
```
- @astrojs/sitemap - XML sitemap generation
- @astrojs/rss - RSS feed generation
- astro-i18next or astro-i18n-aut - Multilingual routing
- @astrojs/tailwind - Styling (recommended)
- sharp - Image processing
- astro-seo - Enhanced SEO meta tags
```

**Content Layer**:
```
- Astro Content Collections
- Markdown/MDX for content
- JSON for structured data
- YAML frontmatter
```

## Migration Strategy

### Phase 1: Data Extraction & Analysis

#### 1.1 Setup Data Extraction Tools

**WPGraphQL Queries Setup**:
- Configure WPGraphQL endpoint access
- Create comprehensive GraphQL queries for:
  - All posts with metadata
  - All pages with hierarchies
  - All custom post types
  - Taxonomies (categories, tags, custom taxonomies)
  - Media library (images, videos, documents)
  - Menu structures
  - User data (authors)
  - SEO metadata (titles, descriptions, schemas)

**WordPress REST API Fallback**:
- Use REST API for any data not available via GraphQL
- Media endpoint: `/wp-json/wp/v2/media`
- Posts endpoint: `/wp-json/wp/v2/posts`

#### 1.2 Content Audit Script

Create a Node.js script to:
```javascript
// scripts/audit-content.js
- Connect to WPGraphQL endpoint
- Fetch all content types
- Generate inventory report:
  - Total posts/pages/CPT counts
  - Total media assets
  - URL mapping (old → new)
  - Broken internal links
  - Missing images
  - Content without featured images
  - Orphaned pages
```

**Deliverables**:
- `content-inventory.json` - Complete content catalog
- `url-map.json` - Old URL to new URL mapping
- `media-inventory.json` - All media assets with metadata
- `audit-report.md` - Human-readable audit summary

#### 1.3 URL Structure Mapping

Create comprehensive URL mapping document:
```json
{
  "wordpress_url": "https://albaniavisit.com/best-time-to-visit-albania/",
  "astro_url": "https://albaniavisit.com/best-time-to-visit-albania/",
  "content_type": "post",
  "language": "en",
  "has_alternate": true,
  "alternate_url": "/sq/best-time-to-visit-albania/",
  "priority": "high",
  "preserve_exact": true
}
```

### Phase 2: Migration Infrastructure

#### 2.1 Project Structure

```
av-cc-migration/
├── src/
│   ├── content/
│   │   ├── posts/           # Blog posts (markdown)
│   │   ├── pages/           # Static pages
│   │   ├── accommodation/   # Accommodation CPT
│   │   ├── destinations/    # Destinations CPT
│   │   ├── activities/      # Activities CPT
│   │   ├── attractions/     # Attractions CPT
│   │   └── config.ts        # Content collections config
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── BlogPost.astro
│   │   ├── Page.astro
│   │   └── Accommodation.astro
│   ├── components/
│   │   ├── Navigation.astro
│   │   ├── Footer.astro
│   │   ├── SEO.astro
│   │   └── LanguageSwitcher.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── [slug].astro      # Dynamic pages
│   │   ├── [post].astro      # Dynamic blog posts
│   │   └── sq/               # Albanian versions
│   ├── styles/
│   │   └── global.css
│   └── utils/
│       ├── seo.ts
│       └── i18n.ts
├── public/
│   ├── images/              # Migrated images
│   │   ├── posts/
│   │   ├── accommodation/
│   │   └── destinations/
│   └── assets/
├── scripts/
│   ├── migrate-content.js   # Main migration script
│   ├── download-images.js   # Image download script
│   ├── generate-markdown.js # Convert WP content to MD
│   ├── validate-urls.js     # URL validation
│   └── audit-content.js     # Initial audit
├── data/
│   ├── content-inventory.json
│   ├── url-map.json
│   ├── media-inventory.json
│   └── redirects.json
├── astro.config.mjs
├── tsconfig.json
├── package.json
└── CLAUDE.md               # This document
```

#### 2.2 Migration Scripts Development

**Script 1: Content Extractor (`scripts/migrate-content.js`)**
```javascript
Purpose: Extract all content from WordPress via WPGraphQL
Features:
- Connect to WPGraphQL endpoint
- Paginated queries for large datasets
- Extract posts, pages, CPTs with all metadata
- Handle multilingual content
- Extract taxonomies and relationships
- Save to JSON format for processing
- Error handling and retry logic
- Progress tracking
```

**Script 2: Image Downloader (`scripts/download-images.js`)**
```javascript
Purpose: Download all images from WordPress media library
Features:
- Parse image URLs from content
- Download with original filenames
- Organize by content type (posts/accommodation/etc)
- Handle featured images separately
- Download multiple sizes (thumbnail, medium, large, full)
- Update image paths in content
- Skip already downloaded images
- Generate image manifest
- Validate image integrity
```

**Script 3: Markdown Generator (`scripts/generate-markdown.js`)**
```javascript
Purpose: Convert WordPress content to Markdown with frontmatter
Features:
- HTML to Markdown conversion
- Generate YAML frontmatter with metadata:
  - title, description, date, author
  - featured image path
  - categories, tags
  - SEO metadata (meta title, meta description)
  - language code
  - canonical URL
  - alternate language URLs
- Preserve shortcodes (convert to Astro components)
- Handle embedded media
- Clean up WordPress-specific HTML
- Format code blocks properly
- Handle tables, lists, blockquotes
```

**Script 4: URL Validator (`scripts/validate-urls.js`)**
```javascript
Purpose: Ensure all URLs are properly mapped and functioning
Features:
- Compare WordPress sitemap vs new Astro routes
- Check for broken internal links
- Validate redirect rules
- Check for duplicate URLs
- Verify canonical URLs
- Test language alternates (hreflang)
- Generate redirect rules for any changed URLs
```

#### 2.3 Development Environment Setup

**Required Dependencies**:
```json
{
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/sitemap": "^latest",
    "@astrojs/rss": "^latest",
    "@astrojs/tailwind": "^latest",
    "astro-i18next": "^latest",
    "sharp": "^latest"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "axios": "^1.6.0",
    "graphql": "^16.8.0",
    "graphql-request": "^6.1.0",
    "turndown": "^7.1.2",
    "cheerio": "^1.0.0",
    "js-yaml": "^4.1.0",
    "dotenv": "^16.3.0"
  }
}
```

**Environment Variables**:
```env
# .env
WORDPRESS_URL=https://albaniavisit.com
GRAPHQL_ENDPOINT=https://albaniavisit.com/graphql
WP_USERNAME=admin
WP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
SITE_URL=https://albaniavisit.com
```

### Phase 3: Content Migration Execution

#### 3.1 Pre-Migration Checklist

- [ ] Backup entire WordPress database
- [ ] Export WordPress XML file (Tools > Export)
- [ ] Document current WordPress plugins and settings
- [ ] Take screenshots of all key pages
- [ ] Record current Google Analytics/Search Console baseline metrics
- [ ] Archive current sitemap.xml
- [ ] Test WPGraphQL endpoint accessibility
- [ ] Verify WordPress Application Password created
- [ ] Create migration staging environment

#### 3.2 Migration Execution Steps

**Step 1: Extract All Content**
```bash
npm run migrate:extract
# Runs scripts/migrate-content.js
# Output: data/content-inventory.json
```

**Step 2: Download All Images**
```bash
npm run migrate:images
# Runs scripts/download-images.js
# Output: public/images/* organized by type
```

**Step 3: Generate Markdown Files**
```bash
npm run migrate:markdown
# Runs scripts/generate-markdown.js
# Output: src/content/* with all content as .md files
```

**Step 4: Validate URLs**
```bash
npm run migrate:validate
# Runs scripts/validate-urls.js
# Output: data/validation-report.json
```

**Step 5: Generate Redirects**
```bash
npm run migrate:redirects
# Generates _redirects file for hosting platform
```

#### 3.3 Content Processing Pipeline

For each piece of content:

1. **Extract from WordPress**
   - Query via GraphQL
   - Get all metadata, content, taxonomies
   - Identify relationships (author, categories, tags)

2. **Transform Content**
   - Convert HTML to Markdown
   - Transform WordPress shortcodes to Astro components
   - Update internal links to new structure
   - Update image paths to local paths

3. **Create Frontmatter**
   ```yaml
   ---
   title: "Best Time to Visit Albania"
   description: "Complete guide to Albania's seasons, weather, and best travel times"
   pubDate: 2023-05-15
   updatedDate: 2024-03-20
   author: "Ilia Zhulati"
   category: "Travel Guide"
   tags: ["planning", "weather", "seasons"]
   featuredImage: "/images/posts/best-time-visit-albania.jpg"
   language: "en"
   alternateLanguage: "sq"
   alternateURL: "/sq/best-time-to-visit-albania/"
   slug: "best-time-to-visit-albania"
   seo:
     metaTitle: "Best Time to Visit Albania | Complete Guide 2024"
     metaDescription: "Discover the best time to visit Albania..."
     canonicalURL: "https://albaniavisit.com/best-time-to-visit-albania/"
   ---
   ```

4. **Save to Content Collections**
   - Write markdown file to appropriate collection
   - Validate frontmatter schema
   - Verify image references

5. **Update Image References**
   - Download featured image
   - Download inline images
   - Update all image URLs to local paths
   - Optimize images (WebP conversion)

### Phase 4: Astro Site Development

#### 4.1 Content Collections Configuration

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    author: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    featuredImage: z.string(),
    language: z.enum(['en', 'sq']),
    alternateLanguage: z.string().optional(),
    alternateURL: z.string().optional(),
    slug: z.string(),
    seo: z.object({
      metaTitle: z.string(),
      metaDescription: z.string(),
      canonicalURL: z.string(),
    }),
  }),
});

const accommodationCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    location: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
    price: z.string().optional(),
    amenities: z.array(z.string()),
    images: z.array(z.string()),
    rating: z.number().optional(),
    bookingURL: z.string().optional(),
    // ... more fields
  }),
});

export const collections = {
  'posts': postsCollection,
  'pages': defineCollection({ /* ... */ }),
  'accommodation': accommodationCollection,
  'destinations': defineCollection({ /* ... */ }),
  'activities': defineCollection({ /* ... */ }),
  'attractions': defineCollection({ /* ... */ }),
};
```

#### 4.2 Dynamic Routing Setup

**Blog Posts**: `src/pages/[...slug].astro`
```astro
---
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => {
    return data.language === 'en';
  });

  return posts.map(post => ({
    params: { slug: post.data.slug },
    props: { post },
  }));
}
---
```

**Albanian Routes**: `src/pages/sq/[...slug].astro`
```astro
---
export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => {
    return data.language === 'sq';
  });

  return posts.map(post => ({
    params: { slug: post.data.slug },
    props: { post },
  }));
}
---
```

#### 4.3 SEO Implementation

```astro
---
// src/components/SEO.astro
interface Props {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  alternates?: Array<{ lang: string; url: string }>;
}
---

<head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />

  {alternates?.map(alt => (
    <link rel="alternate" hreflang={alt.lang} href={alt.url} />
  ))}

  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  {image && <meta property="og:image" content={image} />}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  {image && <meta name="twitter:image" content={image} />}

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "name": "AlbaniaVisit",
    "url": "https://albaniavisit.com",
    // ... more structured data
  })} />
</head>
```

#### 4.4 Image Optimization

```astro
---
import { Image } from 'astro:assets';
import featuredImage from '../images/posts/example.jpg';
---

<Image
  src={featuredImage}
  alt="Alt text"
  width={1200}
  height={630}
  format="webp"
  quality={80}
  loading="lazy"
/>
```

#### 4.5 Multilingual Routing

```typescript
// src/utils/i18n.ts
export const languages = {
  en: 'English',
  sq: 'Shqip',
};

export const defaultLang = 'en';

export function getLanguageFromURL(url: URL) {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) return lang as keyof typeof languages;
  return defaultLang;
}

export function getAlternateURL(slug: string, lang: string) {
  if (lang === defaultLang) {
    return `/${slug}/`;
  }
  return `/${lang}/${slug}/`;
}
```

#### 4.6 Sitemap Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://albaniavisit.com',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          sq: 'sq',
        },
      },
      filter: (page) => !page.includes('/gp-checkout/'),
    }),
  ],
});
```

### Phase 5: Design & Templating

#### 5.1 Design Research & Inspiration

**Best-in-Class Travel Website References**:
- Lonely Planet (destination guides)
- Atlas Obscura (unique places)
- Culture Trip (local experiences)
- The Points Guy (travel advice)
- Visit Norway (national tourism board)

**Key Design Elements to Implement**:
- Hero images with immersive photography
- Card-based layout for destinations/accommodations
- Interactive maps integration
- Search and filter functionality
- High-quality image galleries
- Responsive mobile-first design
- Fast loading with image optimization
- Clear typography hierarchy
- Consistent color palette reflecting Albanian culture

#### 5.2 Component Library

**Core Components to Build**:
```
- Hero.astro - Full-width hero sections
- Card.astro - Content cards for posts/destinations
- Gallery.astro - Image galleries with lightbox
- Map.astro - Interactive map component
- SearchBar.astro - Search functionality
- FilterBar.astro - Category/tag filtering
- Breadcrumbs.astro - Navigation breadcrumbs
- RelatedPosts.astro - Related content suggestions
- Newsletter.astro - Email signup form
- SocialShare.astro - Social sharing buttons
- Testimonials.astro - User reviews
- BookingWidget.astro - Accommodation booking
- LanguageSwitcher.astro - EN/SQ toggle
```

#### 5.3 Layout Templates

**Layouts Required**:
1. `BaseLayout.astro` - Global wrapper
2. `BlogPostLayout.astro` - Blog post template
3. `PageLayout.astro` - Static pages
4. `DestinationLayout.astro` - Destination pages
5. `AccommodationLayout.astro` - Accommodation listings
6. `ArchiveLayout.astro` - Category/tag archives

#### 5.4 Styling Strategy

**CSS Framework**: Tailwind CSS recommended
**Custom Styling**: CSS modules for component-specific styles
**Typography**: Modern font pairing (e.g., Inter + Merriweather)
**Color Palette**: Red/Black (Albanian flag colors) with neutral grays
**Dark Mode**: Optional implementation

### Phase 6: Testing & Quality Assurance

#### 6.1 Automated Testing

**URL Testing**:
- [ ] All old URLs return 200 or 301 redirects
- [ ] No 404 errors for existing content
- [ ] All internal links resolve correctly
- [ ] Canonical URLs properly set
- [ ] Hreflang tags correct for all languages

**Content Validation**:
- [ ] All posts migrated (count matches)
- [ ] All pages migrated
- [ ] All custom post types migrated
- [ ] All images successfully downloaded
- [ ] All featured images display correctly
- [ ] All inline images load properly
- [ ] No missing media assets

**SEO Validation**:
- [ ] All pages have unique titles
- [ ] All pages have meta descriptions
- [ ] All pages have canonical URLs
- [ ] Structured data validates (schema.org)
- [ ] Sitemap.xml generates correctly
- [ ] Robots.txt configured properly
- [ ] XML sitemap submitted to Google Search Console

**Performance Testing**:
- [ ] Lighthouse score >90 (performance)
- [ ] Lighthouse score >90 (SEO)
- [ ] Lighthouse score >90 (accessibility)
- [ ] Lighthouse score >90 (best practices)
- [ ] Core Web Vitals pass (LCP, FID, CLS)
- [ ] Images optimized (WebP format)
- [ ] Page size <1MB per page

#### 6.2 Manual Testing Checklist

**Functionality**:
- [ ] Navigation menus work correctly
- [ ] Language switcher toggles EN/SQ
- [ ] Search functionality works
- [ ] Filter/category pages work
- [ ] Pagination works on archive pages
- [ ] Contact forms submit properly
- [ ] Booking/checkout flows function

**Cross-Browser Testing**:
- [ ] Chrome (desktop & mobile)
- [ ] Firefox
- [ ] Safari (desktop & mobile)
- [ ] Edge

**Responsive Design**:
- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)
- [ ] Large screens (1920px+)

**Content Review**:
- [ ] Spot-check 20 random posts for formatting
- [ ] Verify top 10 high-traffic pages
- [ ] Check all destination pages
- [ ] Review accommodation listings
- [ ] Validate about/team pages

#### 6.3 SEO Comparison Testing

**Pre-Migration Baseline** (capture before launch):
- [ ] Google Search Console impressions/clicks
- [ ] Google Analytics sessions/pageviews
- [ ] Top 50 ranking keywords positions
- [ ] Backlink profile count
- [ ] Domain authority score

**Post-Migration Monitoring** (track for 90 days):
- [ ] Week 1: Daily monitoring
- [ ] Week 2-4: Every 3 days
- [ ] Month 2-3: Weekly monitoring
- [ ] Track ranking fluctuations
- [ ] Monitor traffic changes
- [ ] Watch for crawl errors in GSC

### Phase 7: Deployment Strategy

#### 7.1 Hosting Options

**Recommended Platforms**:
1. **Netlify** (Primary Recommendation)
   - Built-in redirects support
   - Excellent Astro integration
   - Global CDN
   - Automatic deployments

2. **Vercel**
   - Fast global edge network
   - Built-in analytics
   - Automatic optimizations

3. **Cloudflare Pages**
   - Fastest CDN
   - Built-in security
   - Free tier generous

#### 7.2 Redirect Configuration

**Netlify _redirects file**:
```
# Force HTTPS
http://albaniavisit.com/* https://albaniavisit.com/:splat 301!

# Redirect www to non-www
https://www.albaniavisit.com/* https://albaniavisit.com/:splat 301!

# Preserve any changed URLs (if any)
/old-url/ /new-url/ 301

# 404 catch-all
/* /404 404
```

#### 7.3 Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing
- [ ] Content audit complete
- [ ] Design review approved
- [ ] Stakeholder sign-off
- [ ] Backup plan ready
- [ ] Rollback procedure documented

**Deployment Day**:
- [ ] Deploy to staging environment
- [ ] Run final smoke tests
- [ ] Update DNS records (if needed)
- [ ] Deploy to production
- [ ] Verify homepage loads
- [ ] Test 10 random URLs
- [ ] Check Google Search Console
- [ ] Submit new sitemap

**Post-Deployment**:
- [ ] Monitor error logs
- [ ] Check analytics for traffic
- [ ] Verify Google indexing
- [ ] Monitor Core Web Vitals
- [ ] Check social media previews
- [ ] Test newsletter signup
- [ ] Verify booking flows work

#### 7.4 DNS & SSL Configuration

**DNS Records**:
```
A     @       [hosting-ip-address]
CNAME www     [hosting-domain]
```

**SSL Certificate**:
- Let's Encrypt via hosting provider
- Auto-renewal enabled
- Force HTTPS redirect

### Phase 8: Post-Migration Optimization

#### 8.1 SEO Recovery & Enhancement

**Week 1-2 Actions**:
- Monitor Google Search Console daily
- Fix any crawl errors immediately
- Resubmit sitemap if needed
- Monitor ranking changes
- Check for indexing issues

**Month 1 Actions**:
- Add structured data enhancements
- Optimize page load times
- Improve Core Web Vitals scores
- Fix any broken links reported
- Update any outdated content

**Month 2-3 Actions**:
- Create new content to boost rankings
- Build internal linking strategy
- Add FAQ schemas to key pages
- Implement breadcrumb navigation
- Optimize images further

#### 8.2 Performance Optimization

**Image Optimization**:
- Convert all images to WebP
- Implement lazy loading
- Use responsive images (srcset)
- Add image placeholders (blur-up)

**Code Optimization**:
- Minimize JavaScript bundles
- Defer non-critical CSS
- Implement service worker caching
- Enable HTTP/2 push
- Add resource hints (preconnect, prefetch)

**CDN Optimization**:
- Enable edge caching
- Configure cache headers
- Implement stale-while-revalidate
- Set up asset versioning

#### 8.3 Analytics Setup

**Google Analytics 4**:
- Install GA4 tracking code
- Set up custom events:
  - Page views
  - Scroll depth
  - Outbound links
  - Newsletter signups
  - Booking clicks

**Google Search Console**:
- Verify site ownership
- Submit sitemap
- Monitor performance
- Track search queries
- Fix indexing issues

**Additional Tracking** (optional):
- Hotjar for user behavior
- Plausible for privacy-friendly analytics
- Custom event tracking

### Phase 9: Content Enhancement Strategy

#### 9.1 Content Refresh Opportunities

**While Migrating**:
- Update outdated information
- Improve thin content
- Add more images where sparse
- Enhance meta descriptions
- Add internal links
- Update call-to-actions

**Post-Migration**:
- Create content calendar
- Add new destination guides
- Update seasonal content
- Create comprehensive pillar pages
- Build content clusters

#### 9.2 SEO Content Improvements

**On-Page SEO**:
- Optimize title tags (include target keywords)
- Write compelling meta descriptions
- Use header hierarchy (H1, H2, H3)
- Add alt text to all images
- Include target keywords naturally
- Add FAQ sections
- Implement table of contents

**Technical SEO**:
- Add structured data (JSON-LD)
- Optimize URL slugs
- Implement canonical tags
- Add breadcrumb navigation
- Create XML sitemap
- Optimize robots.txt

**Internal Linking**:
- Link from high-authority pages
- Create topic clusters
- Use descriptive anchor text
- Build hub pages
- Add related posts sections

## Best Practices & Guidelines

### WordPress to Astro Migration Best Practices

1. **URL Preservation is Critical**
   - Never change URLs unless absolutely necessary
   - Implement 301 redirects for any changed URLs
   - Maintain exact URL patterns including trailing slashes
   - Preserve language URL structure (/sq/)

2. **Content Fidelity**
   - Preserve all HTML formatting
   - Maintain image aspect ratios
   - Keep all metadata (author, dates, categories)
   - Preserve embedded content (YouTube, etc.)

3. **SEO Metadata Transfer**
   - Migrate all SEO plugin data (Yoast/RankMath)
   - Preserve Open Graph tags
   - Maintain Twitter Card metadata
   - Transfer structured data schemas

4. **Image Migration**
   - Download all image sizes
   - Maintain WordPress naming conventions
   - Preserve alt text and captions
   - Keep image directory structure

5. **Multilingual Preservation**
   - Maintain language URL patterns
   - Preserve hreflang tags
   - Keep language-specific content separate
   - Implement language switcher

6. **Testing Before Launch**
   - Test on staging environment first
   - Validate all URLs before DNS changes
   - Check all forms and interactive features
   - Run full site crawl (Screaming Frog)

7. **Gradual Migration Approach**
   - Migrate in phases if possible
   - Start with low-traffic sections
   - Monitor each phase before proceeding
   - Have rollback plan ready

8. **Post-Migration Monitoring**
   - Monitor Google Search Console daily
   - Track ranking changes
   - Watch for crawl errors
   - Monitor traffic patterns
   - Check Core Web Vitals

### Astro 5 Best Practices for Travel Websites

1. **Content Organization**
   - Use Content Collections for structured data
   - Organize by content type (posts/destinations/etc)
   - Implement proper taxonomies
   - Create content schemas

2. **Image Handling**
   - Use Astro's Image component
   - Implement responsive images
   - Convert to WebP format
   - Add lazy loading
   - Use appropriate image sizes

3. **Performance Optimization**
   - Minimize JavaScript
   - Use static generation (SSG)
   - Implement partial hydration
   - Defer non-critical resources
   - Enable caching

4. **SEO Implementation**
   - Create SEO component
   - Generate sitemap automatically
   - Add structured data
   - Implement canonical URLs
   - Add hreflang tags

5. **Multilingual Support**
   - Separate content by language
   - Use i18n routing
   - Implement language switcher
   - Add alternate language tags

## Risk Assessment & Mitigation

### Potential Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Loss of SEO rankings | Medium | Critical | • Preserve exact URLs<br>• Implement 301 redirects<br>• Monitor GSC daily<br>• Have rollback plan |
| Missing images/media | Medium | High | • Download all assets first<br>• Validate downloads<br>• Keep WordPress backup<br>• Test image loading |
| Broken internal links | Medium | High | • Generate URL map<br>• Update all links during migration<br>• Test with link checker<br>• Fix before launch |
| Content formatting issues | High | Medium | • Test HTML to Markdown conversion<br>• Spot-check random posts<br>• Fix formatting in migration script |
| Multilingual routing broken | Medium | High | • Test both languages<br>• Validate hreflang tags<br>• Check language switcher<br>• Test alternate URLs |
| Performance degradation | Low | Medium | • Optimize images<br>• Test with Lighthouse<br>• Enable CDN<br>• Monitor Core Web Vitals |
| Booking/form functionality | Medium | Critical | • Test all forms thoroughly<br>• Check payment integration<br>• Verify email notifications<br>• Have support ready |
| Search functionality loss | Medium | Medium | • Implement search early<br>• Test with real queries<br>• Consider Algolia/Meilisearch |

### Rollback Plan

**If Critical Issues Arise**:
1. Keep WordPress site running during testing
2. Don't point DNS until fully validated
3. Keep database backup accessible
4. Have WordPress hosting maintained for 30 days post-launch
5. Document rollback procedure:
   - Revert DNS changes
   - Point domain back to WordPress
   - Notify Google via Search Console
   - Communicate with users if needed

## Timeline & Milestones

### Estimated Timeline: 8-12 Weeks

**Weeks 1-2: Planning & Setup**
- Complete content audit
- Setup migration scripts
- Test WPGraphQL connection
- Design site architecture
- Create project structure

**Weeks 3-4: Content Extraction**
- Extract all WordPress content
- Download all images
- Generate markdown files
- Validate URL mapping
- Create redirects file

**Weeks 5-7: Astro Development**
- Build layouts and components
- Implement content collections
- Create dynamic routing
- Develop multilingual system
- Implement SEO components

**Weeks 8-9: Design & Styling**
- Design new templates
- Implement responsive design
- Create component library
- Add interactive features
- Optimize images

**Weeks 10-11: Testing**
- Run automated tests
- Perform manual QA
- Cross-browser testing
- Performance optimization
- Fix bugs and issues

**Week 12: Deployment & Launch**
- Deploy to staging
- Final testing
- Stakeholder approval
- Deploy to production
- Monitor closely

**Post-Launch: Weeks 13-16**
- Daily monitoring (Week 1)
- Fix any issues
- SEO optimization
- Performance tuning
- Content updates

## Success Criteria

### Launch Requirements (Must-Have)

- [ ] 100% of content migrated
- [ ] All images successfully transferred
- [ ] All URLs working (200 or 301)
- [ ] Zero 404 errors on existing content
- [ ] Both languages (EN/SQ) functioning
- [ ] Lighthouse score >85 on all metrics
- [ ] All forms working
- [ ] Booking system functional
- [ ] Search working
- [ ] Mobile responsive on all devices
- [ ] Cross-browser compatible
- [ ] Sitemap generated and submitted
- [ ] Analytics tracking active
- [ ] SSL certificate active

### Post-Launch Success Metrics (30 Days)

- [ ] No significant ranking drops (>20%)
- [ ] Organic traffic maintained (±10%)
- [ ] Page load time <2 seconds
- [ ] Core Web Vitals all "Good"
- [ ] Zero critical errors in GSC
- [ ] Bounce rate improved or maintained
- [ ] Conversion rate maintained or improved

### Long-Term Goals (90 Days)

- [ ] Improved Lighthouse scores (>90)
- [ ] Increased organic traffic (+15%)
- [ ] Improved keyword rankings
- [ ] Better Core Web Vitals
- [ ] Reduced bounce rate
- [ ] Increased page views per session
- [ ] Higher conversion rates

## Resources & References

### Documentation
- [Astro Documentation](https://docs.astro.build)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Migrating from WordPress](https://docs.astro.build/en/guides/migrate-to-astro/from-wordpress/)
- [WPGraphQL Documentation](https://www.wpgraphql.com/docs/introduction)
- [Astro i18n Guide](https://docs.astro.build/en/guides/internationalization/)

### Tools
- **WPGraphQL**: WordPress GraphQL API
- **GraphiQL**: GraphQL query tester
- **Screaming Frog**: Site crawler for validation
- **Google Search Console**: SEO monitoring
- **Google Lighthouse**: Performance testing
- **Netlify**: Hosting platform
- **Turndown**: HTML to Markdown converter

### Community Resources
- Astro Discord Server
- WordPress to Astro migration examples on GitHub
- Astro showcase for travel websites

## Next Steps

### Immediate Actions

1. **Setup Development Environment**
   ```bash
   npm create astro@latest
   npm install dependencies
   ```

2. **Configure WPGraphQL Access**
   - Verify WPGraphQL is active
   - Create application password
   - Test GraphQL endpoint
   - Write test queries

3. **Create Migration Scripts**
   - Setup scripts directory
   - Install dependencies (axios, turndown, etc)
   - Create content extraction script
   - Test with sample data

4. **Begin Content Audit**
   - Run audit script
   - Generate inventory
   - Identify any issues
   - Document findings

5. **Design Kickoff**
   - Research competitor sites
   - Create mood board
   - Design key templates
   - Get stakeholder feedback

### Questions to Answer

- [ ] What WordPress version is currently running?
- [ ] What is the current hosting provider?
- [ ] Are there any custom WordPress plugins in use?
- [ ] What multilingual plugin is used (WPML/Polylang)?
- [ ] What SEO plugin is used (Yoast/RankMath)?
- [ ] Are there any third-party integrations (booking, payments)?
- [ ] What is the current monthly traffic volume?
- [ ] What are the top 10 most important URLs?
- [ ] Are there any custom post types not identified?
- [ ] What is the acceptable downtime window (if any)?

## Appendix

### A. GraphQL Query Examples

**Query All Posts**:
```graphql
query GetAllPosts {
  posts(first: 100, after: null) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      title
      slug
      date
      modified
      content
      excerpt
      featuredImage {
        node {
          sourceUrl
          altText
          mediaDetails {
            width
            height
          }
        }
      }
      author {
        node {
          name
          slug
        }
      }
      categories {
        nodes {
          name
          slug
        }
      }
      tags {
        nodes {
          name
          slug
        }
      }
      seo {
        title
        metaDesc
        canonical
        opengraphTitle
        opengraphDescription
        opengraphImage {
          sourceUrl
        }
      }
    }
  }
}
```

**Query Custom Post Type (Accommodation)**:
```graphql
query GetAccommodation {
  accommodations(first: 100) {
    nodes {
      id
      title
      slug
      content
      accommodationFields {
        location
        price
        amenities
        rating
        bookingUrl
      }
      featuredImage {
        node {
          sourceUrl
        }
      }
    }
  }
}
```

### B. Example Astro Config

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://albaniavisit.com',
  output: 'static',
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          sq: 'sq',
        },
      },
    }),
    tailwind(),
  ],
  build: {
    format: 'directory',
  },
  image: {
    domains: ['albaniavisit.com'],
  },
});
```

### C. Example Package.json Scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "migrate:extract": "node scripts/migrate-content.js",
    "migrate:images": "node scripts/download-images.js",
    "migrate:markdown": "node scripts/generate-markdown.js",
    "migrate:validate": "node scripts/validate-urls.js",
    "migrate:all": "npm run migrate:extract && npm run migrate:images && npm run migrate:markdown",
    "test:links": "node scripts/test-links.js",
    "test:lighthouse": "lighthouse https://albaniavisit.com --output=html",
    "analyze": "astro build --analyze"
  }
}
```

---

## Document Version Control

**Version**: 1.0
**Created**: 2025-10-13
**Author**: Claude (Anthropic AI Assistant)
**Project**: AlbaniaVisit.com WordPress to Astro 5 Migration
**Status**: Initial Requirements Specification

**Change Log**:
- 2025-10-13: Initial document creation with comprehensive migration plan

---

*This document is a living specification and will be updated as the project progresses and new requirements are discovered.*
