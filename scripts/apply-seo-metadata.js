#!/usr/bin/env node

/**
 * Apply SEO Metadata from Rank Math Export
 * Reads Rank Math CSV and updates frontmatter in content files
 */

import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

const CSV_FILE = './visitalbania_rank-math-2025-10-14_02-47-36.csv';
const CONTENT_DIRS = [
  './src/content/posts',
  './src/content/pages',
  './src/content/accommodation',
  './src/content/destinations',
  './src/content/activities',
  './src/content/attractions'
];

async function loadSEOData() {
  console.log('📖 Loading Rank Math SEO data...\n');

  const csvContent = await fs.readFile(CSV_FILE, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  console.log(`✅ Loaded ${records.length} SEO records\n`);

  // Create a map of slug -> SEO data
  const seoMap = new Map();

  for (const record of records) {
    if (record.slug) {
      seoMap.set(record.slug, {
        seoTitle: record.seo_title || '',
        seoDescription: record.seo_description || '',
        focusKeyword: record.focus_keyword || '',
        seoScore: record.seo_score || '',
        isPillarContent: record.is_pillar_content === 'yes',
        robots: record.robots || '',
        canonicalUrl: record.canonical_url || '',
        facebookTitle: record.social_facebook_title || '',
        facebookDescription: record.social_facebook_description || '',
        facebookImage: record.social_facebook_thumbnail || '',
        twitterTitle: record.social_twitter_title || '',
        twitterDescription: record.social_twitter_description || '',
        twitterImage: record.social_twitter_thumbnail || '',
        schemaData: record.schema_data || ''
      });
    }
  }

  return seoMap;
}

async function updateContentFile(filePath, seoData) {
  const content = await fs.readFile(filePath, 'utf-8');

  // Split frontmatter and body
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    console.log(`⚠️  No frontmatter found in ${path.basename(filePath)}`);
    return false;
  }

  const [, frontmatter, body] = frontmatterMatch;
  const lines = frontmatter.split('\n');

  // Parse existing frontmatter
  const existingData = {};
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      existingData[match[1]] = match[2];
    }
  }

  // Build updated frontmatter
  const updatedLines = [];
  let seoSectionAdded = false;

  for (const line of lines) {
    // Skip if we're going to add SEO section
    if (line.startsWith('seo:') || line.startsWith('  metaTitle:') || line.startsWith('  metaDescription:')) {
      continue;
    }
    updatedLines.push(line);
  }

  // Add SEO section at the end of frontmatter
  if (seoData.seoTitle || seoData.seoDescription) {
    updatedLines.push('seo:');

    if (seoData.seoTitle) {
      updatedLines.push(`  metaTitle: "${seoData.seoTitle.replace(/"/g, '\\"')}"`);
    }

    if (seoData.seoDescription) {
      updatedLines.push(`  metaDescription: "${seoData.seoDescription.replace(/"/g, '\\"')}"`);
    }

    if (seoData.canonicalUrl) {
      updatedLines.push(`  canonicalURL: "${seoData.canonicalUrl}"`);
    }

    if (seoData.focusKeyword) {
      updatedLines.push(`  focusKeyword: "${seoData.focusKeyword}"`);
    }

    if (seoData.robots) {
      updatedLines.push(`  robots: "${seoData.robots}"`);
    }
  }

  // Add OpenGraph/Twitter data if available
  if (seoData.facebookTitle || seoData.twitterTitle) {
    updatedLines.push('openGraph:');

    if (seoData.facebookTitle) {
      updatedLines.push(`  title: "${seoData.facebookTitle.replace(/"/g, '\\"')}"`);
    }

    if (seoData.facebookDescription) {
      updatedLines.push(`  description: "${seoData.facebookDescription.replace(/"/g, '\\"')}"`);
    }

    if (seoData.facebookImage) {
      updatedLines.push(`  image: "${seoData.facebookImage}"`);
    }
  }

  // Reconstruct file
  const newContent = `---\n${updatedLines.join('\n')}\n---\n${body}`;
  await fs.writeFile(filePath, newContent, 'utf-8');

  return true;
}

async function processDirectory(dir, seoMap) {
  console.log(`\n📁 Processing ${dir}...`);

  let processed = 0;
  let updated = 0;
  let notFound = 0;

  try {
    const files = await fs.readdir(dir);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(dir, file);
      const slug = file.replace('.md', '');

      processed++;

      if (seoMap.has(slug)) {
        const seoData = seoMap.get(slug);

        // Only update if there's meaningful SEO data
        if (seoData.seoTitle || seoData.seoDescription) {
          try {
            await updateContentFile(filePath, seoData);
            updated++;
            console.log(`  ✅ ${file} - Added SEO metadata`);
          } catch (err) {
            console.log(`  ❌ ${file} - Error: ${err.message}`);
          }
        } else {
          console.log(`  ⚪ ${file} - No SEO data to add`);
        }
      } else {
        notFound++;
        console.log(`  ⚠️  ${file} - Not found in SEO export`);
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`  ⚠️  Directory not found: ${dir}`);
    } else {
      console.error(`  ❌ Error: ${err.message}`);
    }
  }

  console.log(`\n  Summary: ${processed} files processed, ${updated} updated, ${notFound} not in SEO export`);
  return { processed, updated, notFound };
}

async function main() {
  console.log('🚀 Rank Math SEO Metadata Application Tool\n');
  console.log('=' .repeat(60) + '\n');

  const seoMap = await loadSEOData();

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalNotFound = 0;

  for (const dir of CONTENT_DIRS) {
    const stats = await processDirectory(dir, seoMap);
    totalProcessed += stats.processed;
    totalUpdated += stats.updated;
    totalNotFound += stats.notFound;
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Final Summary:');
  console.log(`  Total files processed: ${totalProcessed}`);
  console.log(`  Files updated with SEO: ${totalUpdated}`);
  console.log(`  Files not in SEO export: ${totalNotFound}`);
  console.log(`\n✅ SEO metadata application complete!`);

  if (totalUpdated > 0) {
    console.log('\n💡 Next steps:');
    console.log('  1. Review the updated files');
    console.log('  2. Check that SEO metadata appears correctly');
    console.log('  3. Commit the changes to git');
    console.log('  4. Deploy to see SEO improvements!');
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
