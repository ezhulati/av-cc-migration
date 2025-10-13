# AlbaniaVisit Migration - Quick Start Guide

## ✅ Project Initialized

Your Astro 5 migration project is ready! Here's what's been set up:

### 📁 Project Structure

```
av-cc-migration/
├── scripts/                    # Migration automation scripts
│   ├── migrate-content.js     # Extract content from WordPress via GraphQL
│   ├── download-images.js     # Download all images
│   ├── generate-markdown.js   # Convert HTML to Markdown
│   └── validate-urls.js       # Validate URLs and generate redirects
├── src/
│   ├── content/               # Content collections (markdown files)
│   │   ├── posts/            # Blog posts
│   │   ├── pages/            # Static pages
│   │   ├── accommodation/    # Accommodation listings
│   │   ├── destinations/     # Destination guides
│   │   ├── activities/       # Activities
│   │   ├── attractions/      # Attractions
│   │   └── config.ts         # Content schemas
│   └── pages/
│       └── index.astro       # Homepage
├── data/                      # Migration data (JSON files)
├── public/images/            # Downloaded images
├── package.json              # Dependencies and scripts
├── astro.config.mjs          # Astro configuration
├── CLAUDE.md                 # Full requirements specification
└── README.md                 # Project documentation
```

### 🎯 Architecture Decision: **Full Static Migration**

**No database needed!** We're using:
- ✅ Markdown files for content (version controlled)
- ✅ Local image storage
- ✅ Astro Content Collections for structure
- ✅ Static HTML generation for max performance

### 📦 Dependencies Installed

Core:
- Astro 5.0.0
- TypeScript
- Sharp (image optimization)
- @astrojs/sitemap
- @astrojs/rss

Migration tools:
- graphql-request (WPGraphQL client)
- turndown (HTML → Markdown)
- cheerio (HTML parsing)
- axios (HTTP requests)

---

## 🚀 Getting Started

### Step 1: Configure WordPress Connection

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your WordPress credentials:**
   ```env
   WORDPRESS_URL=https://albaniavisit.com
   GRAPHQL_ENDPOINT=https://albaniavisit.com/graphql
   WP_USERNAME=your_admin_username
   WP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   SITE_URL=https://albaniavisit.com
   ```

3. **Create WordPress Application Password:**
   - Go to: https://albaniavisit.com/wp-admin/profile.php
   - Scroll to "Application Passwords"
   - Name: "Astro Migration"
   - Click "Add New Application Password"
   - Copy the generated password to `.env`

4. **Verify WPGraphQL is installed and active:**
   - Visit: https://albaniavisit.com/wp-admin/plugins.php
   - Ensure "WPGraphQL" is active
   - Test endpoint: https://albaniavisit.com/graphql (should show GraphiQL)

---

### Step 2: Test GraphQL Connection

Create a test query to verify connectivity:

```bash
node -e "
import { GraphQLClient, gql } from 'graphql-request';
const client = new GraphQLClient('https://albaniavisit.com/graphql');
const query = gql\`{ posts(first: 1) { nodes { title } } }\`;
client.request(query).then(data => console.log('✅ Connected!', data));
"
```

Or test in browser:
- Visit: https://albaniavisit.com/graphql
- Run query:
  ```graphql
  {
    posts(first: 5) {
      nodes {
        title
        slug
      }
    }
  }
  ```

---

### Step 3: Run Migration

**Option A: Full automated migration**
```bash
npm run migrate:all
```

**Option B: Step-by-step migration**
```bash
# 1. Extract all content from WordPress
npm run migrate:extract
# Creates: data/content-inventory.json
# Creates: data/audit-report.json

# 2. Download all images
npm run migrate:images
# Downloads images to: public/images/
# Creates: data/media-inventory.json

# 3. Generate markdown files
npm run migrate:markdown
# Creates markdown files in: src/content/

# 4. Validate URLs and generate redirects
npm run migrate:validate
# Creates: data/url-map.json
# Creates: data/validation-report.json
# Creates: _redirects (for Netlify)
```

---

### Step 4: Development

**Start dev server:**
```bash
npm run dev
```

Visit: http://localhost:4321

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

---

## 📊 What to Expect

After running the migration scripts, you should see:

### Content Inventory
```
Posts: ~31+
Pages: ~20+
Accommodation: ~100-500+ (35 sitemaps worth)
Destinations: TBD
Activities: TBD
Attractions: TBD
Tours: TBD

Languages:
  English: ~60%
  Albanian: ~40%
```

### Directory Structure After Migration
```
src/content/
├── posts/
│   ├── best-time-to-visit-albania.md
│   ├── moving-to-albania.md
│   └── ... (~31+ posts)
├── pages/
│   ├── about.md
│   ├── contact.md
│   └── ... (~20+ pages)
├── accommodation/
│   └── ... (100-500+ listings)
└── destinations/
    └── ... (multiple destinations)

public/images/
├── posts/
├── accommodation/
├── destinations/
└── ...
```

---

## 🔧 Troubleshooting

### GraphQL Connection Issues

**Error: "Cannot query field 'posts'"**
- WPGraphQL plugin not installed or not active
- Solution: Install WPGraphQL from WordPress admin

**Error: "Unauthorized"**
- Application password incorrect
- Solution: Regenerate app password in WordPress profile

**Error: "Cannot query field 'accommodations'"**
- Custom post type not exposed to GraphQL
- Solution: Configure custom post types in WPGraphQL settings
- Or: Script will skip and log "not available"

### Migration Issues

**No posts extracted**
- Check GraphQL endpoint is accessible
- Verify .env configuration
- Test GraphQL queries manually first

**Images not downloading**
- Check internet connection
- Verify image URLs are accessible
- Images might be behind authentication

**Markdown generation fails**
- Ensure data/content-inventory.json exists
- Run: `npm run migrate:extract` first

---

## 📝 Next Steps After Migration

### 1. Review Content
- [ ] Spot-check markdown files in `src/content/`
- [ ] Verify images loaded correctly
- [ ] Check frontmatter metadata

### 2. Build Pages
- [ ] Create layouts for posts/pages
- [ ] Add navigation component
- [ ] Create dynamic routes
- [ ] Add SEO components

### 3. Design Implementation
- [ ] Add Tailwind CSS (optional)
- [ ] Create component library
- [ ] Design homepage
- [ ] Design post/page templates

### 4. SEO Setup
- [ ] Configure sitemap
- [ ] Add robots.txt
- [ ] Implement structured data
- [ ] Add Open Graph tags

### 5. Deploy
- [ ] Choose hosting (Netlify recommended)
- [ ] Configure domain
- [ ] Set up SSL
- [ ] Deploy to production

---

## 🎓 Learning Resources

### Astro Documentation
- [Astro Docs](https://docs.astro.build)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Routing](https://docs.astro.build/en/core-concepts/routing/)
- [Layouts](https://docs.astro.build/en/core-concepts/layouts/)

### WPGraphQL
- [WPGraphQL Docs](https://www.wpgraphql.com/docs/introduction)
- [GraphQL IDE](https://albaniavisit.com/graphql)

### Migration Guides
- [WordPress to Astro](https://docs.astro.build/en/guides/migrate-to-astro/from-wordpress/)
- [SEO Migration Best Practices](./CLAUDE.md)

---

## 🔑 Key Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Migration
npm run migrate:extract   # Extract content from WordPress
npm run migrate:images    # Download images
npm run migrate:markdown  # Generate markdown files
npm run migrate:validate  # Validate URLs
npm run migrate:all       # Run complete migration

# Astro
npm run astro             # Run astro CLI
npm run astro check       # Type check
```

---

## 💡 Tips

1. **Test on staging first** - Don't point DNS to new site until fully tested
2. **Keep WordPress running** - Keep WP site live for 30 days as backup
3. **Incremental testing** - Test each migration step before proceeding
4. **Version control** - Commit after each successful step
5. **Backup data** - Keep copies of all JSON files generated

---

## 🆘 Need Help?

- Review: [CLAUDE.md](./CLAUDE.md) - Full requirements specification
- Check: [README.md](./README.md) - Project overview
- Astro Discord: https://astro.build/chat
- WPGraphQL Discord: https://wpgraphql.com/community

---

## ✅ Project Status

- [x] Astro 5 project initialized
- [x] Dependencies installed
- [x] Migration scripts created
- [x] Content Collections configured
- [x] Project structure set up
- [ ] WordPress connection configured
- [ ] Migration executed
- [ ] Content reviewed
- [ ] Design implemented
- [ ] SEO configured
- [ ] Deployed

**Current Step**: Configure WordPress connection and test migration scripts

**Next Action**: Copy `.env.example` to `.env` and add your WordPress credentials
