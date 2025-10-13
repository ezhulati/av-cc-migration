/**
 * Image Download Script
 * Downloads all images from WordPress media library
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const DATA_DIR = './data';
const IMAGES_DIR = './public/images';

/**
 * Download a single image
 */
async function downloadImage(url, filepath) {
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
    });

    await pipeline(response.data, createWriteStream(filepath));
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to download ${url}: ${error.message}`);
    return false;
  }
}

/**
 * Get filename from URL
 */
function getFilenameFromURL(url) {
  const urlPath = new URL(url).pathname;
  return path.basename(urlPath);
}

/**
 * Process images from content
 */
async function processImages(contentType, items) {
  console.log(`\n📸 Processing ${contentType} images...`);

  const imageDir = path.join(IMAGES_DIR, contentType);
  await fs.mkdir(imageDir, { recursive: true });

  const manifest = [];
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    if (item.featuredImage?.node?.sourceUrl) {
      const imageUrl = item.featuredImage.node.sourceUrl;
      const filename = getFilenameFromURL(imageUrl);
      const filepath = path.join(imageDir, filename);

      // Check if already exists
      try {
        await fs.access(filepath);
        console.log(`  ⏭️  Skipped (exists): ${filename}`);
        skipped++;
      } catch {
        // File doesn't exist, download it
        console.log(`  ⬇️  Downloading: ${filename}`);
        const success = await downloadImage(imageUrl, filepath);
        if (success) {
          downloaded++;
        } else {
          failed++;
        }
      }

      manifest.push({
        postId: item.id,
        postSlug: item.slug,
        originalUrl: imageUrl,
        localPath: `/images/${contentType}/${filename}`,
        altText: item.featuredImage.node.altText || '',
      });
    }
  }

  console.log(`\n  ✅ ${contentType} images complete:`);
  console.log(`     Downloaded: ${downloaded}`);
  console.log(`     Skipped: ${skipped}`);
  console.log(`     Failed: ${failed}`);

  return manifest;
}

/**
 * Extract inline images from content
 */
function extractInlineImages(content) {
  const images = [];
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let match;

  while ((match = imgRegex.exec(content)) !== null) {
    images.push(match[1]);
  }

  return images;
}

/**
 * Main function
 */
async function downloadAllImages() {
  console.log('🚀 Starting image download...\n');

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

  // Ensure images directory exists
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  const allManifests = {};

  // Process featured images for each content type
  if (contentData.posts?.length > 0) {
    allManifests.posts = await processImages('posts', contentData.posts);
  }

  if (contentData.pages?.length > 0) {
    allManifests.pages = await processImages('pages', contentData.pages);
  }

  if (contentData.accommodation?.length > 0) {
    allManifests.accommodation = await processImages('accommodation', contentData.accommodation);
  }

  if (contentData.destinations?.length > 0) {
    allManifests.destinations = await processImages('destinations', contentData.destinations);
  }

  if (contentData.activities?.length > 0) {
    allManifests.activities = await processImages('activities', contentData.activities);
  }

  if (contentData.attractions?.length > 0) {
    allManifests.attractions = await processImages('attractions', contentData.attractions);
  }

  if (contentData.tours?.length > 0) {
    allManifests.tours = await processImages('tours', contentData.tours);
  }

  // Save manifest
  const manifestPath = path.join(DATA_DIR, 'media-inventory.json');
  await fs.writeFile(manifestPath, JSON.stringify(allManifests, null, 2), 'utf-8');
  console.log(`\n💾 Saved image manifest to ${manifestPath}`);

  console.log('\n✅ Image download complete!');
  console.log('\nNext steps:');
  console.log('  Run: npm run migrate:markdown');
}

// Run
downloadAllImages().catch(error => {
  console.error('❌ Image download failed:', error);
  process.exit(1);
});
