#!/usr/bin/env node

/**
 * Download Missing Images from CDN
 *
 * This script:
 * 1. Finds all CDN image URLs still in markdown files
 * 2. Downloads images that don't exist locally
 * 3. Organizes them in the appropriate public/images/ subdirectories
 * 4. Reports progress and results
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CDN_PATTERN = /https:\/\/eia476h758b\.exactdn\.com\/wp-content\/uploads\/[^"'\s)]+/g;

// Statistics
let stats = {
  imagesDownloaded: 0,
  imagesFailed: 0,
  imagesSkipped: 0,
  failedUrls: [],
};

/**
 * Extract filename from CDN URL
 */
function extractFilename(url) {
  const urlWithoutQuery = url.split('?')[0];
  const parts = urlWithoutQuery.split('/');
  return parts[parts.length - 1];
}

/**
 * Determine image subdirectory based on content path
 */
function getImageSubdir(contentPath) {
  if (contentPath.includes('/accommodation/')) return 'accommodation';
  if (contentPath.includes('/destinations/')) return 'destinations';
  if (contentPath.includes('/activities/')) return 'activities';
  if (contentPath.includes('/attractions/')) return 'attractions';
  if (contentPath.includes('/pages/')) return 'pages';
  return 'posts'; // default
}

/**
 * Check if image exists locally
 */
function imageExists(filename) {
  const subdirs = ['posts', 'accommodation', 'destinations', 'activities', 'attractions', 'pages'];
  for (const subdir of subdirs) {
    const localPath = path.join(__dirname, '..', 'public', 'images', subdir, filename);
    if (fs.existsSync(localPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Download image from URL
 */
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(destPath, () => {}); // Delete partial file
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Process all markdown files and download missing images
 */
async function downloadMissingImages() {
  console.log('🔍 Scanning for missing images...\n');

  // Find all markdown files
  const markdownFiles = await glob('src/content/**/*.md', {
    cwd: path.join(__dirname, '..'),
    absolute: true,
  });

  // Collect all unique CDN URLs
  const cdnUrls = new Set();
  const urlToContentPath = new Map();

  for (const file of markdownFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(CDN_PATTERN);

    if (matches) {
      matches.forEach(url => {
        cdnUrls.add(url);
        if (!urlToContentPath.has(url)) {
          urlToContentPath.set(url, file);
        }
      });
    }
  }

  console.log(`📦 Found ${cdnUrls.size} unique CDN image URLs\n`);

  // Process each URL
  let processed = 0;
  for (const url of cdnUrls) {
    const filename = extractFilename(url);
    processed++;

    // Check if image already exists
    if (imageExists(filename)) {
      stats.imagesSkipped++;
      continue;
    }

    // Determine destination directory
    const contentPath = urlToContentPath.get(url);
    const subdir = getImageSubdir(contentPath);
    const destDir = path.join(__dirname, '..', 'public', 'images', subdir);
    const destPath = path.join(destDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Download image
    try {
      await downloadImage(url, destPath);
      stats.imagesDownloaded++;
      process.stdout.write(`\r✓ Downloaded [${processed}/${cdnUrls.size}]: ${filename}`.padEnd(100));
    } catch (error) {
      stats.imagesFailed++;
      stats.failedUrls.push({ url, filename, error: error.message });
      process.stdout.write(`\r✗ Failed [${processed}/${cdnUrls.size}]: ${filename}`.padEnd(100));
    }

    // Rate limiting - wait 100ms between downloads
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n');
}

/**
 * Main function
 */
async function main() {
  console.log('📥 Starting image download process...\n');

  try {
    await downloadMissingImages();

    // Report statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 DOWNLOAD STATISTICS');
    console.log('='.repeat(60));
    console.log(`Images downloaded:     ${stats.imagesDownloaded}`);
    console.log(`Images skipped:        ${stats.imagesSkipped} (already exist)`);
    console.log(`Images failed:         ${stats.imagesFailed}`);
    console.log('='.repeat(60));

    if (stats.failedUrls.length > 0) {
      console.log('\n⚠️  Failed downloads:');
      stats.failedUrls.slice(0, 10).forEach(({ filename, error }) => {
        console.log(`   - ${filename}: ${error}`);
      });
      if (stats.failedUrls.length > 10) {
        console.log(`   ... and ${stats.failedUrls.length - 10} more`);
      }
    }

    console.log('\n✅ Image download complete!');
    console.log('💡 Next step: Run replace-cdn-urls.js again to update markdown files\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
