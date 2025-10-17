#!/usr/bin/env node

/**
 * Download Missing Accommodation Images
 *
 * Downloads all missing images identified in the audit report
 * and updates accommodation markdown files with local image paths
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AUDIT_REPORT_PATH = path.join(PROJECT_ROOT, 'data/accommodation-audit-report.json');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public/images/accommodation');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/accommodation');
const LOG_PATH = path.join(PROJECT_ROOT, 'data/accommodation-image-download-log.txt');

// Ensure directories exist
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Rate limiting
const CONCURRENT_DOWNLOADS = 5;
const DELAY_BETWEEN_BATCHES = 1000; // 1 second

// Statistics
let stats = {
  total: 0,
  downloaded: 0,
  skipped: 0,
  failed: 0,
  errors: []
};

/**
 * Download a single image
 */
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    // Check if file already exists
    if (fs.existsSync(outputPath)) {
      stats.skipped++;
      resolve({ status: 'skipped', url, path: outputPath });
      return;
    }

    const file = fs.createWriteStream(outputPath);

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        downloadImage(redirectUrl, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        stats.failed++;
        reject(new Error(`Failed to download: ${url} (Status: ${response.statusCode})`));
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
 * Process images in batches
 */
async function downloadImagesInBatches(images) {
  const batches = [];
  for (let i = 0; i < images.length; i += CONCURRENT_DOWNLOADS) {
    batches.push(images.slice(i, i + CONCURRENT_DOWNLOADS));
  }

  console.log(`📦 Processing ${batches.length} batches of ${CONCURRENT_DOWNLOADS} images each\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNum = i + 1;

    console.log(`⏳ Batch ${batchNum}/${batches.length}...`);

    await Promise.allSettled(
      batch.map(async (imageInfo) => {
        try {
          const filename = imageInfo.filename;
          const outputPath = path.join(IMAGES_DIR, filename);
          await downloadImage(imageInfo.imageUrl, outputPath);

          // Log progress every 50 images
          if ((stats.downloaded + stats.skipped + stats.failed) % 50 === 0) {
            console.log(`   Progress: ${stats.downloaded} downloaded, ${stats.skipped} skipped, ${stats.failed} failed`);
          }
        } catch (err) {
          // Error already tracked in stats
        }
      })
    );

    // Delay between batches to avoid overwhelming the server
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }
}

/**
 * Update accommodation markdown with local image paths
 */
function updateAccommodationImages() {
  console.log('\n📝 Updating accommodation markdown files...');

  const auditReport = JSON.parse(fs.readFileSync(AUDIT_REPORT_PATH, 'utf-8'));
  const imagesBySlug = new Map();

  // Group images by slug
  for (const imageInfo of auditReport.missingImages) {
    if (!imagesBySlug.has(imageInfo.slug)) {
      imagesBySlug.set(imageInfo.slug, []);
    }
    imagesBySlug.get(imageInfo.slug).push({
      filename: imageInfo.filename,
      isFeatured: imageInfo.isFeatured || false
    });
  }

  let updatedCount = 0;

  for (const [slug, images] of imagesBySlug) {
    const mdPath = path.join(CONTENT_DIR, `${slug}.md`);

    if (!fs.existsSync(mdPath)) {
      console.log(`   ⚠️  File not found: ${slug}.md`);
      continue;
    }

    let content = fs.readFileSync(mdPath, 'utf-8');

    // Check if images actually exist
    const existingImages = images.filter(img =>
      fs.existsSync(path.join(IMAGES_DIR, img.filename))
    );

    if (existingImages.length === 0) {
      continue;
    }

    // Update featured image if needed
    const featuredImage = existingImages.find(img => img.isFeatured);
    if (featuredImage && content.includes('featuredImage: ""')) {
      const localPath = `/images/accommodation/${featuredImage.filename}`;
      content = content.replace(
        'featuredImage: ""',
        `featuredImage: "${localPath}"`
      );
    }

    // Update or add images array
    const galleryImages = existingImages
      .filter(img => !img.isFeatured)
      .map(img => `/images/accommodation/${img.filename}`);

    if (galleryImages.length > 0) {
      // Check if images array exists
      if (content.includes('images:')) {
        // Images array exists but might be empty - append to it
        const imagesRegex = /images:\s*\n(\s*-\s*"[^"]*"\s*\n)*/;
        const match = content.match(imagesRegex);

        if (match) {
          const existingImagesBlock = match[0];
          const indent = '  ';
          const newImagesStr = galleryImages
            .map(img => `${indent}- "${img}"`)
            .join('\n');

          // Only add if not already present
          if (!existingImagesBlock.includes(galleryImages[0])) {
            const replacement = `images:\n${newImagesStr}\n`;
            content = content.replace(imagesRegex, replacement);
          }
        }
      } else {
        // Add images array before the closing ---
        const indent = '';
        const imagesBlock = `images:\n${galleryImages.map(img => `  - "${img}"`).join('\n')}\n`;
        content = content.replace(/^---$/m, `${imagesBlock}---`);
      }
    }

    fs.writeFileSync(mdPath, content);
    updatedCount++;
  }

  console.log(`   ✅ Updated ${updatedCount} accommodation files`);
}

/**
 * Main function
 */
async function main() {
  console.log('🖼️  Accommodation Image Download Script\n');
  console.log('='.repeat(60));

  // Read audit report
  if (!fs.existsSync(AUDIT_REPORT_PATH)) {
    console.error('❌ Audit report not found. Run audit-accommodation-data.mjs first.');
    process.exit(1);
  }

  const auditReport = JSON.parse(fs.readFileSync(AUDIT_REPORT_PATH, 'utf-8'));

  if (!auditReport.missingImages || auditReport.missingImages.length === 0) {
    console.log('✅ No missing images found in audit report!');
    return;
  }

  stats.total = auditReport.missingImages.length;

  console.log(`\n📊 Found ${stats.total} missing images to download`);
  console.log(`📁 Output directory: ${IMAGES_DIR}\n`);

  // Start download
  const startTime = Date.now();

  await downloadImagesInBatches(auditReport.missingImages);

  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DOWNLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total images: ${stats.total}`);
  console.log(`Downloaded: ${stats.downloaded}`);
  console.log(`Skipped (already exist): ${stats.skipped}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Duration: ${duration} minutes`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ${stats.errors.length} errors occurred:`);
    stats.errors.slice(0, 10).forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.url}`);
      console.log(`      Error: ${err.error}`);
    });

    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`);
    }
  }

  // Save log
  const logContent = JSON.stringify({
    timestamp: new Date().toISOString(),
    stats,
    errors: stats.errors
  }, null, 2);

  fs.writeFileSync(LOG_PATH, logContent);
  console.log(`\n📄 Log saved to: ${LOG_PATH}`);

  // Update markdown files
  if (stats.downloaded > 0 || stats.skipped > 0) {
    updateAccommodationImages();
  }

  console.log('\n✅ Image download complete!');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
