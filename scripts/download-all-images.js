/**
 * Complete Image Download Script
 * Downloads ALL images: featured images + inline content images
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const DATA_DIR = './data';
const IMAGES_DIR = './public/images';
const CONTENT_DIR = './public/images/content'; // For inline images

/**
 * Download a single image
 */
async function downloadImage(url, filepath) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000,
    });

    await pipeline(response.data, createWriteStream(filepath));
    return true;
  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`);
    return false;
  }
}

/**
 * Get filename from URL
 */
function getFilenameFromURL(url) {
  try {
    const urlPath = new URL(url).pathname;
    return path.basename(urlPath);
  } catch {
    // If URL parsing fails, generate a safe filename
    return url.split('/').pop().split('?')[0] || 'image.jpg';
  }
}

/**
 * Extract all image URLs from HTML content
 */
function extractInlineImages(content) {
  if (!content) return [];

  const images = new Set(); // Use Set to avoid duplicates

  // Match <img> tags
  const imgRegex = /<img[^>]+src="([^">]+)"/gi;
  let match;

  while ((match = imgRegex.exec(content)) !== null) {
    images.add(match[1]);
  }

  // Also match background images in style attributes
  const bgRegex = /background-image:\s*url\(['"]?([^'"]+)['"]?\)/gi;
  while ((match = bgRegex.exec(content)) !== null) {
    images.add(match[1]);
  }

  // Match WordPress attachment URLs
  const wpRegex = /https?:\/\/[^\s"'>]+\/wp-content\/uploads\/[^\s"'>]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
  while ((match = wpRegex.exec(content)) !== null) {
    images.add(match[0]);
  }

  return Array.from(images);
}

/**
 * Process all images (featured + inline) for content type
 */
async function processAllImages(contentType, items) {
  console.log(`\n📸 Processing ${contentType} images...`);

  const imageDir = path.join(IMAGES_DIR, contentType);
  await fs.mkdir(imageDir, { recursive: true });

  const manifest = [];
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let totalImages = 0;

  for (const item of items) {
    const itemImages = new Set();

    // 1. Featured image
    if (item.featuredImage?.node?.sourceUrl) {
      itemImages.add(item.featuredImage.node.sourceUrl);
    }

    // 2. Extract inline images from content
    if (item.content) {
      const inlineImages = extractInlineImages(item.content);
      inlineImages.forEach(img => itemImages.add(img));
    }

    // 3. Extract from excerpt if available
    if (item.excerpt) {
      const excerptImages = extractInlineImages(item.excerpt);
      excerptImages.forEach(img => itemImages.add(img));
    }

    // Download all images for this item
    for (const imageUrl of itemImages) {
      totalImages++;

      try {
        const filename = getFilenameFromURL(imageUrl);
        const filepath = path.join(imageDir, filename);

        // Check if already exists
        try {
          await fs.access(filepath);
          skipped++;
        } catch {
          // File doesn't exist, download it
          const success = await downloadImage(imageUrl, filepath);
          if (success) {
            downloaded++;
          } else {
            failed++;
          }
        }

        // Add to manifest
        manifest.push({
          postId: item.id,
          postSlug: item.slug,
          originalUrl: imageUrl,
          localPath: `/images/${contentType}/${filename}`,
          type: imageUrl === item.featuredImage?.node?.sourceUrl ? 'featured' : 'inline',
        });
      } catch (error) {
        console.error(`  ⚠️  Error processing ${imageUrl}: ${error.message}`);
        failed++;
      }
    }

    // Progress indicator
    if (manifest.length % 50 === 0) {
      console.log(`  📊 Processed ${manifest.length} images...`);
    }
  }

  console.log(`\n  ✅ ${contentType} complete:`);
  console.log(`     Total images found: ${totalImages}`);
  console.log(`     Downloaded: ${downloaded}`);
  console.log(`     Skipped (exists): ${skipped}`);
  console.log(`     Failed: ${failed}`);

  return manifest;
}

/**
 * Main function
 */
async function downloadAllImages() {
  console.log('🚀 Starting COMPLETE image download (featured + inline)...\n');
  console.log('⚠️  This will take longer than featured-only download\n');

  // Load content inventory
  let contentData;
  try {
    const inventoryPath = path.join(DATA_DIR, 'content-inventory.json');
    const inventoryContent = await fs.readFile(inventoryPath, 'utf-8');
    contentData = JSON.parse(inventoryContent);
  } catch (error) {
    console.error('❌ Could not load content-inventory.json');
    console.error('   Run: npm run migrate:extract first');
    process.exit(1);
  }

  // Ensure directories exist
  await fs.mkdir(IMAGES_DIR, { recursive: true });
  await fs.mkdir(CONTENT_DIR, { recursive: true });

  const allManifests = {};
  const stats = {
    totalContentItems: 0,
    totalImagesFound: 0,
    totalDownloaded: 0,
    totalSkipped: 0,
    totalFailed: 0,
  };

  // Process each content type
  const contentTypes = [
    { key: 'posts', data: contentData.posts },
    { key: 'pages', data: contentData.pages },
    { key: 'accommodation', data: contentData.accommodation },
    { key: 'destinations', data: contentData.destinations },
    { key: 'activities', data: contentData.activities },
    { key: 'attractions', data: contentData.attractions },
    { key: 'tours', data: contentData.tours },
  ];

  for (const type of contentTypes) {
    if (type.data?.length > 0) {
      stats.totalContentItems += type.data.length;
      allManifests[type.key] = await processAllImages(type.key, type.data);

      // Calculate stats
      const manifest = allManifests[type.key];
      stats.totalImagesFound += manifest.length;
    }
  }

  // Save comprehensive manifest
  const manifestPath = path.join(DATA_DIR, 'complete-media-inventory.json');
  await fs.writeFile(manifestPath, JSON.stringify(allManifests, null, 2), 'utf-8');
  console.log(`\n💾 Saved complete image manifest to ${manifestPath}`);

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPLETE DOWNLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`Content items processed: ${stats.totalContentItems}`);
  console.log(`Total images found: ${stats.totalImagesFound}`);
  console.log(`Images downloaded: ${stats.totalDownloaded}`);
  console.log(`Images skipped (exist): ${stats.totalSkipped}`);
  console.log(`Failed downloads: ${stats.totalFailed}`);
  console.log('='.repeat(60));

  console.log('\n✅ Complete image download finished!');
  console.log('\nNext steps:');
  console.log('  1. Review: data/complete-media-inventory.json');
  console.log('  2. Run: npm run migrate:markdown');
}

// Run
downloadAllImages().catch(error => {
  console.error('❌ Complete image download failed:', error);
  process.exit(1);
});
