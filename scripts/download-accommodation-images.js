#!/usr/bin/env node
/**
 * Download external accommodation images and update content files to reference local paths
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const ACCOMMODATION_DIR = path.join(projectRoot, 'src', 'content', 'accommodation');
const IMAGE_DIR = path.join(projectRoot, 'public', 'images', 'accommodation');

// Ensure image directory exists
if (!fs.existsSync(IMAGE_DIR)) {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
}

// Command line args
const dryRun = !process.argv.includes('--apply');
const limit = process.argv.includes('--limit')
  ? parseInt(process.argv[process.argv.indexOf('--limit') + 1])
  : null;

console.log('🏨 Accommodation Image Downloader');
console.log('='.repeat(80));
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
if (limit) console.log(`Limit: ${limit} files`);
console.log('');

// Stats
const stats = {
  total: 0,
  hasExternal: 0,
  downloaded: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

/**
 * Extract frontmatter from markdown file
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = match[1];
  const body = content.slice(match[0].length);

  return { frontmatter, body, fullMatch: match[0] };
}

/**
 * Download image from URL
 */
function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { timeout: 10000 }, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(filePath);
        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });

        file.on('error', (err) => {
          fs.unlink(filePath, () => {});
          reject(err);
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadImage(response.headers.location, filePath)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Generate filename from URL
 */
function generateFilename(url, slug) {
  // Extract image ID from Booking.com URLs
  const bookingMatch = url.match(/\/(\d+)\.jpg/);
  if (bookingMatch) {
    return `${slug}-${bookingMatch[1]}.jpg`;
  }

  // For Google Photos, use slug + hash
  const hash = url.split('/').pop().split('=')[0].slice(0, 12);
  return `${slug}-${hash}.jpg`;
}

/**
 * Process single accommodation file
 */
async function processFile(filePath) {
  stats.total++;

  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = extractFrontmatter(content);

  if (!parsed) {
    stats.skipped++;
    return;
  }

  // Extract featuredImage URL
  const imageMatch = parsed.frontmatter.match(/featuredImage:\s*["']?(https?:\/\/[^"'\n]+)["']?/);

  if (!imageMatch) {
    stats.skipped++;
    return;
  }

  stats.hasExternal++;
  const imageUrl = imageMatch[1];

  // Skip if already local
  if (imageUrl.startsWith('/images')) {
    stats.skipped++;
    return;
  }

  // Extract slug from filename
  const slug = path.basename(filePath, '.md');

  // Generate local filename
  const localFilename = generateFilename(imageUrl, slug);
  const localPath = path.join(IMAGE_DIR, localFilename);
  const localUrl = `/images/accommodation/${localFilename}`;

  // Check if already downloaded
  if (fs.existsSync(localPath)) {
    if (!dryRun) {
      // Update content file to reference local path
      const updatedFrontmatter = parsed.frontmatter.replace(
        /featuredImage:\s*["']?https?:\/\/[^"'\n]+["']?/,
        `featuredImage: "${localUrl}"`
      );

      const updatedContent = `---\n${updatedFrontmatter}\n---${parsed.body}`;
      fs.writeFileSync(filePath, updatedContent);
    }

    console.log(`⏭️  ${slug} (already exists)`);
    stats.skipped++;
    return;
  }

  if (dryRun) {
    console.log(`Would download: ${slug}`);
    console.log(`  From: ${imageUrl.slice(0, 60)}...`);
    console.log(`  To: ${localFilename}`);
    stats.downloaded++;
    return;
  }

  // Download image
  try {
    await downloadImage(imageUrl, localPath);

    // Update content file
    const updatedFrontmatter = parsed.frontmatter.replace(
      /featuredImage:\s*["']?https?:\/\/[^"'\n]+["']?/,
      `featuredImage: "${localUrl}"`
    );

    const updatedContent = `---\n${updatedFrontmatter}\n---${parsed.body}`;
    fs.writeFileSync(filePath, updatedContent);

    console.log(`✅ ${slug}`);
    stats.downloaded++;
  } catch (error) {
    console.log(`❌ ${slug}: ${error.message}`);
    stats.failed++;
    stats.errors.push({ file: slug, url: imageUrl, error: error.message });
  }
}

/**
 * Main execution
 */
async function main() {
  const files = fs.readdirSync(ACCOMMODATION_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(ACCOMMODATION_DIR, f));

  const filesToProcess = limit ? files.slice(0, limit) : files;

  console.log(`Processing ${filesToProcess.length} files...`);
  console.log('');

  // Process in batches of 5 to avoid overwhelming the server
  const batchSize = 5;
  for (let i = 0; i < filesToProcess.length; i += batchSize) {
    const batch = filesToProcess.slice(i, i + batchSize);
    await Promise.all(batch.map(f => processFile(f)));

    // Small delay between batches
    if (i + batchSize < filesToProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total files: ${stats.total}`);
  console.log(`With external URLs: ${stats.hasExternal}`);
  console.log(`${dryRun ? 'Would download' : 'Downloaded'}: ${stats.downloaded}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);

  if (stats.errors.length > 0 && stats.errors.length <= 10) {
    console.log('');
    console.log('Errors:');
    stats.errors.forEach(e => {
      console.log(`  ${e.file}: ${e.error}`);
    });
  } else if (stats.errors.length > 10) {
    console.log(`  (${stats.errors.length} errors - too many to display)`);
  }

  if (dryRun) {
    console.log('');
    console.log('💡 To actually download images, run: node scripts/download-accommodation-images.js --apply');
    console.log('💡 To test on 20 files: node scripts/download-accommodation-images.js --limit 20');
  }

  console.log('='.repeat(80));
}

main().catch(console.error);
