# AlbaniaVisit.com Migration - Master Plan

## 🎯 Mission
Migrate albaniavisit.com from WordPress to Astro 5, preserving 5 years of SEO rankings and 6,960+ pieces of content.

---

## ✅ Phase 1: Foundation & Data Extraction [COMPLETED]

### 1.1 Project Setup ✅
- [x] Initialize Astro 5 project
- [x] Configure Content Collections
- [x] Set up migration scripts
- [x] Install dependencies
- [x] Configure GitHub repository

### 1.2 WordPress Connection ✅
- [x] Configure WPGraphQL endpoint
- [x] Test connection
- [x] Verify authentication

### 1.3 Content Extraction ✅
- [x] Extract 31 blog posts
- [x] Extract 23 static pages
- [x] Extract 6,906 accommodation listings
- [x] Identify 6,922 images

**Status**: ✅ Complete - All content extracted successfully

---

## 🔄 Phase 2: Asset Migration [IN PROGRESS]

### 2.1 Image Download 🔄
- [x] Download posts images (31)
- [x] Download pages images (23)
- [~] Download accommodation images (6,906) - **IN PROGRESS**
- [ ] Verify all images downloaded
- [ ] Optimize images (WebP conversion)

**Current**: ~400+ images downloaded, ~6,500 remaining
**ETA**: 30-40 minutes

### 2.2 Content Transformation ⏳
- [ ] Convert HTML to Markdown (all posts)
- [ ] Convert HTML to Markdown (all pages)
- [ ] Convert HTML to Markdown (all accommodation)
- [ ] Generate proper frontmatter
- [ ] Link images to content
- [ ] Detect languages from URLs

**Next Action**: Start this while images download

---

## 📝 Phase 3: Core Site Architecture [NEXT UP]

### 3.1 Layouts & Templates
- [ ] Create BaseLayout.astro (global wrapper)
- [ ] Create BlogPostLayout.astro (for posts)
- [ ] Create PageLayout.astro (for static pages)
- [ ] Create AccommodationLayout.astro (for listings)
- [ ] Create ArchiveLayout.astro (category pages)

### 3.2 Essential Components
- [ ] Navigation.astro (main menu)
- [ ] Footer.astro
- [ ] SEO.astro (meta tags, Open Graph)
- [ ] LanguageSwitcher.astro (EN/SQ toggle)
- [ ] Breadcrumbs.astro
- [ ] Card.astro (content cards)

### 3.3 Dynamic Routing
- [ ] `/[slug].astro` - Blog posts (English)
- [ ] `/sq/[slug].astro` - Blog posts (Albanian)
- [ ] `/accommodation/[slug].astro` - Accommodation
- [ ] `/sq/akomodimi/[slug].astro` - Accommodation (Albanian)
- [ ] Category/archive pages

**Estimated Time**: 4-6 hours

---

## 🎨 Phase 4: Design Implementation [PLANNED]

### 4.1 Visual Design
- [ ] Choose CSS framework (Tailwind recommended)
- [ ] Define color palette (Albanian red/black theme)
- [ ] Choose typography (fonts)
- [ ] Create design system

### 4.2 Homepage
- [ ] Hero section with featured destination
- [ ] Latest blog posts section
- [ ] Featured accommodations
- [ ] Popular destinations
- [ ] Search functionality (optional)

### 4.3 Content Pages
- [ ] Blog post template design
- [ ] Accommodation listing design
- [ ] Destination page design
- [ ] Image galleries
- [ ] Related content sections

**Estimated Time**: 6-8 hours

---

## 🔍 Phase 5: SEO & Performance [PLANNED]

### 5.1 SEO Implementation
- [ ] Generate XML sitemap
- [ ] Create robots.txt
- [ ] Add structured data (JSON-LD)
- [ ] Implement canonical URLs
- [ ] Add hreflang tags (EN/SQ)
- [ ] Configure Open Graph tags
- [ ] Add Twitter Card metadata

### 5.2 Performance Optimization
- [ ] Optimize images (WebP, lazy loading)
- [ ] Minimize JavaScript
- [ ] Defer non-critical CSS
- [ ] Enable compression
- [ ] Add resource hints
- [ ] Implement caching headers

### 5.3 Validation
- [ ] Run Lighthouse audits (target >90)
- [ ] Test Core Web Vitals
- [ ] Validate all URLs
- [ ] Check for broken links
- [ ] Test cross-browser compatibility

**Estimated Time**: 3-4 hours

---

## 🚀 Phase 6: Deployment [PLANNED]

### 6.1 Staging Deployment
- [ ] Deploy to Netlify/Vercel staging
- [ ] Configure domain preview
- [ ] Test all functionality
- [ ] Run final QA checks

### 6.2 Production Deployment
- [ ] Set up production hosting (Netlify recommended)
- [ ] Configure DNS records
- [ ] Set up SSL certificate
- [ ] Deploy _redirects file (301 redirects)
- [ ] Submit sitemap to Google Search Console

### 6.3 Post-Launch Monitoring
- [ ] Monitor Google Search Console daily (Week 1)
- [ ] Track ranking changes
- [ ] Watch for crawl errors
- [ ] Monitor traffic in Analytics
- [ ] Check Core Web Vitals

**Estimated Time**: 2-3 hours

---

## 📊 Phase 7: Content Enhancement [FUTURE]

### 7.1 Content Improvements
- [ ] Update outdated information
- [ ] Add missing meta descriptions
- [ ] Improve thin content
- [ ] Add internal links
- [ ] Create pillar pages

### 7.2 New Features
- [ ] Search functionality (Algolia/Meilisearch)
- [ ] Newsletter signup
- [ ] Booking integration
- [ ] User reviews system
- [ ] Interactive maps

### 7.3 Content Management
- [ ] Add Decap CMS (optional)
- [ ] Set up content workflow
- [ ] Create editor documentation

**Estimated Time**: Ongoing

---

## 📅 Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Foundation | 2 hours | ✅ Complete |
| Phase 2: Assets | 1-2 hours | 🔄 In Progress |
| Phase 3: Architecture | 4-6 hours | ⏳ Next |
| Phase 4: Design | 6-8 hours | 📋 Planned |
| Phase 5: SEO/Performance | 3-4 hours | 📋 Planned |
| Phase 6: Deployment | 2-3 hours | 📋 Planned |
| **Total** | **18-25 hours** | |

---

## 🎯 Immediate Next Steps (While Images Download)

### Priority 1: Content Transformation Setup
1. Test markdown generation with sample content
2. Verify frontmatter schemas work
3. Ensure language detection works

### Priority 2: Core Layouts
1. Create BaseLayout with proper HTML structure
2. Add SEO component
3. Create simple post layout for testing

### Priority 3: Dynamic Routing
1. Set up post routes (`/[slug].astro`)
2. Set up language routes (`/sq/[slug].astro`)
3. Test with sample posts

**Goal**: Have basic site structure ready when images finish downloading

---

## 🔑 Critical Success Factors

1. **URL Preservation**: Every URL must match exactly or redirect properly
2. **Image Links**: All images must be properly linked in markdown
3. **Language Support**: EN/SQ routing must work flawlessly
4. **SEO Metadata**: All meta tags, canonical URLs, hreflang must be correct
5. **Performance**: Site must be faster than current WordPress site

---

## 🛠️ Tools & Resources

### Development
- Astro 5 (framework)
- TypeScript (type safety)
- Sharp (image optimization)
- Turndown (HTML → Markdown)

### Deployment
- Netlify (recommended) or Vercel
- GitHub (version control)
- Cloudflare (DNS/CDN - optional)

### Monitoring
- Google Search Console (SEO)
- Google Analytics (traffic)
- Lighthouse (performance)
- Screaming Frog (crawling)

---

## 📝 Notes & Decisions

### Architecture Decisions
- ✅ Full static migration (no database)
- ✅ Markdown files for content
- ✅ Local image storage
- ✅ Language detection via URL structure

### Pending Decisions
- [ ] CSS framework choice (Tailwind recommended)
- [ ] Search implementation (Algolia/Meilisearch/Pagefind)
- [ ] CMS for future editing (Decap/Tina/none)
- [ ] Comments system (if needed)

---

**Last Updated**: 2025-10-13
**Current Phase**: Phase 2 - Asset Migration (Images downloading)
**Next Phase**: Phase 3 - Core Site Architecture
