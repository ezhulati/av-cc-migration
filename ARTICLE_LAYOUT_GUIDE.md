# Article Layout System

## Overview

The article layout system uses a **single shared component** (`ArticleLayout.astro`) to provide consistent styling and functionality across all content types (destinations, attractions, activities, etc.).

## Key Benefit

✅ **Change once, update everywhere** - Any modification to `ArticleLayout.astro` automatically applies to all destinations, attractions, and any future content types using this layout.

## Files Structure

```
src/
├── layouts/
│   └── ArticleLayout.astro          # ⭐ Master layout - edit here to change all pages
├── pages/
    ├── destinations/
    │   └── [slug].astro            # Uses ArticleLayout (minimal logic)
    ├── attractions/
    │   └── [slug].astro            # Uses ArticleLayout (minimal logic)
    └── activities/
        └── [slug].astro            # Uses ArticleLayout (minimal logic)
```

## How It Works

### 1. Master Layout (`ArticleLayout.astro`)

This file contains:
- ✅ All HTML structure (hero, content, sidebar, gallery)
- ✅ All CSS styling
- ✅ JavaScript functionality (read more button)
- ✅ Responsive design
- ✅ Typography and spacing

**To change the design/layout**: Edit this file only!

### 2. Content Pages (Minimal Logic)

Files like `destinations/[slug].astro`, `attractions/[slug].astro`, and `activities/[slug].astro` are now **very simple** - they just:
- Fetch content from collections
- Prepare data (breadcrumbs, info items)
- Pass props to `ArticleLayout`
- No styling or structure!

## Making Changes

### Example 1: Change Hero Height

**File**: `src/layouts/ArticleLayout.astro`

```css
/* Find this in the <style> section */
.hero {
  position: relative;
  min-height: 50vh;  /* Change this value */
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
```

This change will apply to **all destinations, attractions, and activities** automatically.

### Example 2: Change Text Justification

**File**: `src/layouts/ArticleLayout.astro`

```css
.article-content :global(p) {
  line-height: 1.75;
  margin-bottom: var(--space-md);
  font-size: 1.0625rem;
  text-align: justify;  /* Change or remove this */
}
```

### Example 3: Modify Continue Reading Button

**File**: `src/layouts/ArticleLayout.astro`

```css
/* Find the .read-more-btn styles */
.read-more-btn {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  /* Change colors, padding, etc. */
}
```

### Example 4: Change Sidebar Width

**File**: `src/layouts/ArticleLayout.astro`

```css
@media (min-width: 1024px) {
  .layout {
    grid-template-columns: 1fr 320px;  /* Change sidebar width */
    align-items: start;
  }
}
```

## Adding New Content Types

To use this layout for a new content type (e.g., activities, guides):

1. Create new page file: `src/pages/activities/[slug].astro`
2. Import ArticleLayout: `import ArticleLayout from '../../layouts/ArticleLayout.astro';`
3. Prepare your props (see examples in destinations/attractions)
4. Pass props to `<ArticleLayout>`

**Example**:

```astro
---
import ArticleLayout from '../../layouts/ArticleLayout.astro';
// ... fetch your content ...

const breadcrumbs = [
  { label: 'Home', href: '/' },
  { label: 'Activities', href: '/activities/' }
];

const infoItems = [
  { icon: '🎯', label: 'Type', value: 'Outdoor Activity' },
  { icon: '💵', label: 'Price', value: '$50 per person' }
];
---

<ArticleLayout
  title="Activity Title"
  heroTitle="Activity Title"
  breadcrumbs={breadcrumbs}
  infoItems={infoItems}
  {/* ... other props */}
>
  <Content />
</ArticleLayout>
```

## Props Reference

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Page title (for `<title>` tag) |
| `description` | `string` | Meta description |
| `canonical` | `string` | Canonical URL |
| `heroTitle` | `string` | Main heading displayed in hero |
| `breadcrumbs` | `Array` | Breadcrumb navigation items |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `image` | `string` | - | OG image |
| `language` | `string` | - | Page language |
| `heroSubtitle` | `string` | - | Subtitle in hero section |
| `featuredImage` | `string` | - | Hero background image |
| `infoItems` | `Array` | - | Sidebar info card items |
| `highlights` | `Array<string>` | - | Highlights list |
| `images` | `Array<string>` | - | Photo gallery images |
| `primaryAction` | `Object` | Find Accommodation | Primary CTA button |
| `secondaryAction` | `Object` | Things to Do | Secondary CTA button |
| `navigationLinks` | `Array` | Default links | Sidebar navigation |
| `contentType` | `string` | `'article'` | For tracking/analytics |

## Common Customizations

### Change Color Scheme

All colors use CSS variables. Find and modify in `ArticleLayout.astro`:

```css
.highlights__list li::before {
  background: hsl(var(--primary));  /* Primary color */
}

.article-content :global(h2) {
  border-left: 4px solid hsl(var(--primary));  /* Accent color */
}
```

### Adjust Spacing

Spacing uses CSS variables at the top of the file:

```css
:root {
  --space-xs: 0.5rem;   /* Extra small spacing */
  --space-sm: 1rem;     /* Small spacing */
  --space-md: 1.5rem;   /* Medium spacing */
  --space-lg: 2rem;     /* Large spacing */
  --space-xl: 3rem;     /* Extra large spacing */
  --space-2xl: 4rem;    /* 2X large spacing */
}
```

### Modify Typography

```css
.article-content :global(p) {
  line-height: 1.75;      /* Line height */
  font-size: 1.0625rem;   /* Base font size */
  text-align: justify;    /* Text alignment */
}

.article-content :global(h2) {
  font-size: 2rem;        /* H2 size */
  font-weight: 700;       /* H2 weight */
}
```

## Best Practices

1. ✅ **Always edit `ArticleLayout.astro` for design changes**
2. ✅ **Keep individual page files minimal** (just data preparation)
3. ✅ **Test changes on both destinations and attractions** before deploying
4. ✅ **Use CSS variables for values** that might change
5. ✅ **Document major changes** in this file

## Testing Changes

After modifying `ArticleLayout.astro`:

1. Check a destination page: `http://localhost:4321/destinations/tirana/`
2. Check an attraction page: `http://localhost:4321/attractions/blue-eye-spring/`
3. Check an activity page: `http://localhost:4321/activities/hiking-trekking/`
4. Test on mobile viewport
5. Verify the "Continue Reading" button works
6. Test the photo gallery lightbox

## Troubleshooting

### Changes not appearing?
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+F5)
- Restart dev server: `npm run dev`

### Styles conflicting?
- Check for `is:inline` styles that might override
- Verify CSS specificity

### Layout broken on mobile?
- Check responsive breakpoints in media queries
- Test at common breakpoints: 320px, 768px, 1024px

## Future Enhancements

Potential additions to the shared layout:

- [ ] Table of contents (auto-generated from H2s)
- [ ] Social share buttons
- [ ] Print-friendly version
- [ ] Dark mode toggle
- [ ] Related content suggestions
- [ ] Comments section
- [ ] Accessibility improvements

## Content Types Currently Using ArticleLayout

✅ **Destinations** - `/destinations/[slug]`
✅ **Attractions** - `/attractions/[slug]`
✅ **Activities** - `/activities/[slug]`

All three content types now share the same layout, styling, and functionality!

---

**Last Updated**: 2025-01-18
**Maintained By**: Development Team
**Questions?**: Check `ArticleLayout.astro` comments for inline documentation
