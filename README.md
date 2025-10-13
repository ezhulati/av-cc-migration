# AlbaniaVisit.com - WordPress to Astro 5 Migration

Migration project for albaniavisit.com from WordPress to Astro 5.

## Project Overview

Full static site migration preserving SEO, URLs, and all content from 5+ years of WordPress content.

See [CLAUDE.md](./CLAUDE.md) for comprehensive requirements specification.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your WordPress credentials

# Run development server
npm run dev

# Build for production
npm run build
```

## Migration Scripts

```bash
# Extract all content from WordPress
npm run migrate:extract

# Download all images
npm run migrate:images

# Generate markdown files
npm run migrate:markdown

# Validate URLs
npm run migrate:validate

# Run full migration pipeline
npm run migrate:all
```

## Project Structure

```
av-cc-migration/
├── src/
│   ├── content/          # Content collections (markdown files)
│   ├── layouts/          # Page layouts
│   ├── components/       # Reusable components
│   ├── pages/            # Routes
│   ├── styles/           # Global styles
│   └── utils/            # Utility functions
├── scripts/              # Migration scripts
├── data/                 # Migration data (JSON)
├── public/               # Static assets
└── CLAUDE.md            # Full requirements spec
```

## Architecture

- **CMS**: Full static migration (no database)
- **Content**: Markdown files with YAML frontmatter
- **Images**: Local storage in public/images/
- **Deployment**: Netlify/Vercel/Cloudflare Pages
- **Languages**: English (default) + Albanian (/sq/)

## Next Steps

1. Configure WordPress GraphQL endpoint in .env
2. Run migration scripts
3. Review migrated content
4. Build and deploy

## Documentation

- [Requirements Specification](./CLAUDE.md) - Complete migration plan
- [Astro Documentation](https://docs.astro.build)
- [Content Collections Guide](https://docs.astro.build/en/guides/content-collections/)
