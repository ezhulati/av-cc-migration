# Custom Post Types Extraction Report

**Date:** October 13, 2025  
**Script:** `/Users/ez/Desktop/AI Library/Apps/AV-CC/scripts/extract-custom-post-types.js`  
**Method:** WordPress REST API (WPGraphQL not available for custom post types)

## Summary

Successfully extracted **116 total items** across 3 custom post types from albaniavisit.com:

### Extraction Results

| Content Type | Total Items | With Featured Image | English | Albanian | Status |
|-------------|-------------|---------------------|---------|----------|---------|
| **Destinations** | 37 | 35 (95%) | 37 | 0 | ✅ Complete |
| **Activities** | 11 | 9 (82%) | 11 | 0 | ✅ Complete |
| **Attractions** | 68 | 63 (93%) | 68 | 0 | ✅ Complete |
| **TOTAL** | **116** | **107 (92%)** | **116** | **0** | ✅ |

## Files Created

All files saved to `/Users/ez/Desktop/AI Library/Apps/AV-CC/data/`:

1. **destinations.json** (1.4 MB) - 37 destination pages
2. **activities.json** (200 KB) - 11 activity pages
3. **attractions.json** (1.4 MB) - 68 attraction pages
4. **custom-post-types-stats.json** (1.7 KB) - Statistics summary

## Data Structure

Each item includes:
- ✅ ID, title, slug, date, modified date
- ✅ Full HTML content and excerpt
- ✅ Featured image (sourceUrl, altText, dimensions)
- ✅ Categories and tags
- ✅ Author information
- ✅ Language detection (en/sq based on URL)
- ✅ Custom fields (ACF) if present
- ✅ Status (publish/draft/etc)
- ✅ Direct link to original page

## Content Breakdown

### Destinations (37 items)

**Top Categories:**
- Southern Albania: 23 items
- Albanian Riviera: 7 items
- Northern Albania: 7 items
- Coastal: 5 items
- Southern Coast: 5 items

**Sample Destinations:**
- Borsh, Gjipe, Jale Beach, Tirana, Berat, Valbona, Pogradec, Lin, Orikum, Palase

### Activities (11 items)

**Top Categories:**
- Outdoor Adventure: 5 items
- Uncategorized: 3 items
- Agrotourism: 2 items
- Culinary Experiences: 1 item
- Hiking & Trekking: 1 item

**Sample Activities:**
- Historical Sightseeing, Sailing, Paragliding, Rafting, Mountain Biking

### Attractions (68 items)

**Top Categories:**
- Museums: 14 items
- Historical Sites: 12 items
- Uncategorized: 12 items
- Natural Wonders: 8 items
- Castles & Fortresses: 6 items

**Sample Attractions:**
- Saint Theodore's Monastery, House of Leaves, Lake Bovilla, Gjirokastra Castle Museum, Green Coast

## Technical Notes

### Why REST API Instead of GraphQL?

The custom post types (destinations, activities, attractions) were **not exposed** in WPGraphQL queries. Attempted query names:
- `allDestination`, `destinations`, `allDestinations` ❌
- `allActivity`, `activities`, `allActivities` ❌
- `allAttraction`, `attractions`, `allAttractions` ❌

The WordPress REST API successfully provided access to these custom post types via:
- `/wp-json/wp/v2/destinations`
- `/wp-json/wp/v2/activities`
- `/wp-json/wp/v2/attractions`

### Language Detection Note

All extracted items show **language: en** (0 Albanian items detected). This suggests:

1. **Albanian versions may use different post type names** (e.g., "destinacione-sq" instead of "destinations")
2. **WPML/Polylang may store translations differently** (as separate posts or as metadata)
3. **Albanian content might be in standard posts/pages** rather than custom post types

#### Recommendation:
Check the sitemap entries for Albanian versions:
- Albanian destinations: `/sq/destinacionet/[slug]/`
- Albanian activities: `/sq/aktivitetet/[slug]/`
- Albanian attractions: `/sq/atraksionet/[slug]/`

These may need to be queried separately or may be stored as translations linked to the English versions.

## Data Quality

- ✅ All items have valid IDs and slugs
- ✅ 92% have featured images (107/116)
- ✅ All have full content (HTML rendered)
- ✅ All have permalinks to original pages
- ✅ Categories properly mapped
- ✅ Metadata preserved

## Next Steps

1. ✅ **Extract custom post types** - COMPLETE
2. ⏭️ **Investigate Albanian translations** - Check WPML/Polylang configuration
3. ⏭️ **Convert to Markdown** - Use `generate-markdown.js` script
4. ⏭️ **Download images** - Use `download-images.js` for featured images
5. ⏭️ **Create Astro content collections** - Define schemas for each type
6. ⏭️ **Build dynamic routes** - Create `[slug].astro` pages for each type

## Script Usage

To re-run extraction:
```bash
cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"
node scripts/extract-custom-post-types.js
```

The script:
- Uses axios for REST API calls
- Implements automatic pagination (100 items per page)
- Includes `_embed` parameter for featured images and taxonomies
- Handles errors gracefully
- Provides progress feedback
- Saves individual JSON files per content type

## Comparison with Previous Extraction

From `data/content-inventory.json`:
- Posts: 31
- Pages: 23
- Accommodation: 6,906 ⚠️ (huge!)
- Destinations: 0 → **37** ✅
- Activities: 0 → **11** ✅
- Attractions: 0 → **68** ✅
- Tours: 0

**Total WordPress content:**
- Standard content: 54 (posts + pages)
- Custom post types: **7,022** (accommodation + destinations + activities + attractions)
- **Grand Total: 7,076 pieces of content**

---

**Status:** ✅ EXTRACTION COMPLETE  
**Generated:** 2025-10-13T14:50:18.435Z
