#!/usr/bin/env node

/**
 * Download WordPress Accommodation Images
 *
 * Downloads ONLY the WordPress images (albaniavisit.com/wp-content)
 * found in accommodation files and updates paths to local storage
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/accommodation');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public/images/accommodation');

// Stats
const stats = {
  filesScanned: 0,
  filesWithWPImages: 0,
  totalWPImages: 0,
  downloaded: 0,
  skipped: 0,
  failed: 0,
  filesUpdated: 0,
  errors: []
};

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Download a single image
 */
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      stats.skipped++;
      resolve({ status: 'skipped', url, path: outputPath });
      return;
    }

    const file = fs.createWriteStream(outputPath);

    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        downloadImage(redirectUrl, outputPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        stats.failed++;
        reject(new Error(`Failed: ${url} (${response.statusCode})`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        stats.downloaded++;
        resolve({ status: 'downloaded', url, path: outputPath });
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      stats.failed++;
      stats.errors.push({ url, error: err.message });
      reject(err);
    });

    file.on('error', (err) => {
      fs.unlink(outputPath, () => {});
      stats.failed++;
      stats.errors.push({ url, error: err.message });
      reject(err);
    });
  });
}

/**
 * Parse frontmatter
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArray = [];

  for (const line of lines) {
    if (line.startsWith('  - ')) {
      currentArray.push(line.substring(4).replace(/^"|"$/g, ''));
    } else if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim().replace(/^"|"$/g, '');
      currentKey = key.trim();

      if (value === '') {
        currentArray = [];
        frontmatter[currentKey] = currentArray;
      } else {
        frontmatter[currentKey] = value;
        currentArray = [];
      }
    }
  }

  return frontmatter;
}

/**
 * Extract filename from URL
 */
function getFilenameFromURL(url) {
  const match = url.match(/\/([^\/\?]+)(\?|$)/);
  return match ? match[1] : null;
}

/**
 * Process a single accommodation file
 */
async function processFile(file) {
  const filePath = path.join(CONTENT_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  if (!frontmatter) return;

  stats.filesScanned++;

  const wpImages = [];
  const imageMapping = new Map(); // WP URL -> local path

  // Check featured image
  let featuredImage = frontmatter.featuredImage;
  if (Array.isArray(featuredImage)) {
    featuredImage = featuredImage[0] || '';
  }
  featuredImage = String(featuredImage || '');

  if (featuredImage && featuredImage.includes('albaniavisit.com/wp-content')) {
    wpImages.push({ type: 'featured', url: featuredImage });
  }

  // Check gallery images
  const images = frontmatter.images || [];
  for (const img of images) {
    if (img && img.includes('albaniavisit.com/wp-content')) {
      wpImages.push({ type: 'gallery', url: img });
    }
  }

  if (wpImages.length === 0) return;

  stats.filesWithWPImages++;
  stats.totalWPImages += wpImages.length;

  console.log(`\n📦 ${file} (${wpImages.length} WordPress images)`);

  // Download each image
  for (const { type, url } of wpImages) {
    const filename = getFilenameFromURL(url);
    if (!filename) continue;

    const outputPath = path.join(IMAGES_DIR, filename);
    const localPath = `/images/accommodation/${filename}`;

    try {
      const result = await downloadImage(url, outputPath);
      imageMapping.set(url, localPath);

      if (result.status === 'downloaded') {
        console.log(`   ✅ Downloaded: ${filename}`);
      } else {
        console.log(`   ⏭️  Skipped: ${filename} (exists)`);
      }
    } catch (err) {
      console.log(`   ❌ Failed: ${filename} - ${err.message}`);
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Update the file with local paths
  let updated = false;

  // Update featured image
  if (featuredImage && imageMapping.has(featuredImage)) {
    const newPath = imageMapping.get(featuredImage);
    content = content.replace(
      new RegExp(`featuredImage: "${featuredImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
      `featuredImage: "${newPath}"`
    );
    updated = true;
  }

  // Update gallery images
  for (const [wpUrl, localPath] of imageMapping) {
    content = content.replace(
      new RegExp(`"${wpUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
      `"${localPath}"`
    );
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content);
    stats.filesUpdated++;
    console.log(`   📝 Updated paths in ${file}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🖼️  WordPress Accommodation Image Downloader\n');
  console.log('='.repeat(60));

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  console.log(`\n📁 Found ${files.length} accommodation files`);
  console.log('🔍 Scanning for WordPress images...\n');

  // Process each file
  for (const file of files) {
    await processFile(file);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DOWNLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files scanned: ${stats.filesScanned}`);
  console.log(`Files with WordPress images: ${stats.filesWithWPImages}`);
  console.log(`Total WordPress images found: ${stats.totalWPImages}`);
  console.log(`Downloaded: ${stats.downloaded}`);
  console.log(`Skipped (already exist): ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Files updated: ${stats.filesUpdated}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors (${stats.errors.length}):`);
    stats.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.url}`);
      console.log(`      ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
