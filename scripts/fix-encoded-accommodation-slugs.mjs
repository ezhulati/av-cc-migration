#!/usr/bin/env node

/**
 * Fix URL-Encoded Accommodation Slugs
 *
 * Creates markdown files for the 14 accommodations with special characters
 * in their slugs that weren't properly migrated
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AUDIT_REPORT_PATH = path.join(PROJECT_ROOT, 'data/accommodation-audit-report.json');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/accommodation');

/**
 * Create a clean slug from title
 */
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single
    .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
}

/**
 * Decode URL-encoded slug
 */
function decodeSlug(slug) {
  try {
    return decodeURIComponent(slug);
  } catch (e) {
    return slug;
  }
}

/**
 * Create accommodation markdown file
 */
function createAccommodationFile(accommodation) {
  const { title, slug: originalSlug, images } = accommodation;

  // Try to create a clean English slug
  const cleanSlug = createSlug(title);

  // If cleanSlug is empty or very short, use a hash of the original
  const finalSlug = cleanSlug.length > 3 ? cleanSlug : `accommodation-${originalSlug.substring(0, 10)}`;

  const filePath = path.join(CONTENT_DIR, `${finalSlug}.md`);

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`   ⏭️  Skipped: ${title} (file already exists)`);
    return { status: 'skipped', slug: finalSlug };
  }

  // Prepare image URLs
  const imageUrls = images && images.length > 0
    ? images.map(img => `  - "${img}"`).join('\n')
    : '';

  const featuredImage = images && images.length > 0 ? images[0] : '';

  // Create frontmatter
  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: ""
featuredImage: "${featuredImage}"
language: en
slug: ${finalSlug}
location: ""
accommodationType: "hotel"
starRating: 0
rating: 0
ratingWords: ""
numberOfReviews: 0
ratings:
  overall: 0
  location: 0
  cleanliness: 0
  facilities: 0
  value: 0
  comfort: 0
  staff: 0
  wifi: 0
${imageUrls ? `images:\n${imageUrls}\n` : ''}bookingURL: ""
---

`;

  fs.writeFileSync(filePath, frontmatter);

  console.log(`   ✅ Created: ${title} → ${finalSlug}.md`);
  return { status: 'created', slug: finalSlug, originalSlug };
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Fixing URL-Encoded Accommodation Slugs\n');
  console.log('='.repeat(60));

  // Read audit report
  if (!fs.existsSync(AUDIT_REPORT_PATH)) {
    console.error('❌ Audit report not found. Run audit-accommodation-data.mjs first.');
    process.exit(1);
  }

  const auditReport = JSON.parse(fs.readFileSync(AUDIT_REPORT_PATH, 'utf-8'));

  const missingAccommodations = auditReport.missingAccommodations || [];

  if (missingAccommodations.length === 0) {
    console.log('✅ No missing accommodations found!');
    return;
  }

  console.log(`\n📦 Found ${missingAccommodations.length} missing accommodations\n`);

  const results = {
    created: [],
    skipped: [],
    errors: []
  };

  for (const accommodation of missingAccommodations) {
    try {
      const decodedSlug = decodeSlug(accommodation.slug);
      console.log(`Processing: ${accommodation.title}`);
      console.log(`  Original slug: ${accommodation.slug}`);
      console.log(`  Decoded: ${decodedSlug}`);

      const result = createAccommodationFile(accommodation);

      if (result.status === 'created') {
        results.created.push(result);
      } else {
        results.skipped.push(result);
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      results.errors.push({ accommodation, error: err.message });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Created: ${results.created.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.created.length > 0) {
    console.log('\n✅ New accommodations created:');
    results.created.forEach(({ slug, originalSlug }) => {
      console.log(`   ${originalSlug} → ${slug}.md`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

main();
