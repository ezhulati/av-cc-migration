#!/usr/bin/env node

/**
 * Replace External CDN URLs with Local Image Paths
 *
 * This script:
 * 1. Finds all CDN image URLs in markdown files
 * 2. Extracts the filename from the CDN URL
 * 3. Checks if the image exists locally in public/images/
 * 4. Replaces the CDN URL with the local path
 * 5. Reports statistics on replacements and missing images
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CDN_DOMAIN = 'https://eia476h758b.exactdn.com';
const CDN_PATTERN = /https:\/\/eia476h758b\.exactdn\.com\/wp-content\/uploads\/[^"'\s)]+/g;

// Statistics
let stats = {
  filesProcessed: 0,
  replacementsMade: 0,
  imagesNotFound: 0,
  missingImages: new Set(),
};

/**
 * Extract filename from CDN URL
 */
function extractFilename(url) {
  // Remove query parameters
  const urlWithoutQuery = url.split('?')[0];

  // Get the last part of the path
  const parts = urlWithoutQuery.split('/');
  return parts[parts.length - 1];
}

/**
 * Find local image path for a given filename
 */
function findLocalImage(filename, contentDir) {
  // Determine the content type from the directory path
  let imageSubdir = 'posts'; // default

  if (contentDir.includes('/accommodation/')) {
    imageSubdir = 'accommodation';
  } else if (contentDir.includes('/destinations/')) {
    imageSubdir = 'destinations';
  } else if (contentDir.includes('/activities/')) {
    imageSubdir = 'activities';
  } else if (contentDir.includes('/attractions/')) {
    imageSubdir = 'attractions';
  } else if (contentDir.includes('/pages/')) {
    imageSubdir = 'pages';
  }

  // Check if image exists in the appropriate subdirectory
  const localPath = path.join(__dirname, '..', 'public', 'images', imageSubdir, filename);

  if (fs.existsSync(localPath)) {
    return `/images/${imageSubdir}/${filename}`;
  }

  // Try other directories as fallback
  const subdirs = ['posts', 'accommodation', 'destinations', 'activities', 'attractions', 'pages'];
  for (const subdir of subdirs) {
    const fallbackPath = path.join(__dirname, '..', 'public', 'images', subdir, filename);
    if (fs.existsSync(fallbackPath)) {
      return `/images/${subdir}/${filename}`;
    }
  }

  return null;
}

/**
 * Process a single markdown file
 */
function processMarkdownFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Find all CDN URLs
  const matches = content.match(CDN_PATTERN);

  if (!matches) {
    return;
  }

  stats.filesProcessed++;

  // Replace each CDN URL
  for (const cdnUrl of matches) {
    const filename = extractFilename(cdnUrl);
    const localPath = findLocalImage(filename, filePath);

    if (localPath) {
      // Replace the CDN URL with local path
      content = content.replace(new RegExp(cdnUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), localPath);
      modified = true;
      stats.replacementsMade++;
    } else {
      // Image not found locally
      stats.imagesNotFound++;
      stats.missingImages.add(filename);
      console.log(`  ⚠️  Image not found locally: ${filename}`);
    }
  }

  // Write back if modified
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Processed: ${path.relative(process.cwd(), filePath)} (${matches.length} replacements)`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔄 Starting CDN URL replacement...\n');

  try {
    // Find all markdown files in src/content
    const markdownFiles = await glob('src/content/**/*.md', {
      cwd: path.join(__dirname, '..'),
      absolute: true,
    });

    console.log(`📁 Found ${markdownFiles.length} markdown files\n`);

    // Process each file
    for (const file of markdownFiles) {
      processMarkdownFile(file);
    }

    // Report statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPLACEMENT STATISTICS');
    console.log('='.repeat(60));
    console.log(`Files processed:       ${stats.filesProcessed}`);
    console.log(`Replacements made:     ${stats.replacementsMade}`);
    console.log(`Images not found:      ${stats.imagesNotFound}`);
    console.log('='.repeat(60));

    if (stats.missingImages.size > 0) {
      console.log('\n⚠️  Missing images:');
      const missing = Array.from(stats.missingImages).sort();
      missing.slice(0, 20).forEach(img => console.log(`   - ${img}`));
      if (missing.length > 20) {
        console.log(`   ... and ${missing.length - 20} more`);
      }
    }

    console.log('\n✅ CDN URL replacement complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
