#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = '/Users/ez/Desktop/AI Library/Apps/AV-CC';
const ATTRACTIONS_IMG_DIR = path.join(PROJECT_ROOT, 'public/images/attractions');
const ATTRACTIONS_CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/attractions');
const SIZE_THRESHOLD = 100 * 1024; // 100KB

// Function to get file size
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

// Function to extract featured image from markdown frontmatter
function extractFeaturedImage(mdPath) {
  const content = fs.readFileSync(mdPath, 'utf8');
  const match = content.match(/featuredImage:\s*["']?([^"'\n]+)["']?/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

// Main analysis
function analyzeAttractionsWithBrokenImages() {
  const mdFiles = fs.readdirSync(ATTRACTIONS_CONTENT_DIR).filter(f => f.endsWith('.md'));
  const results = [];

  for (const mdFile of mdFiles) {
    const mdPath = path.join(ATTRACTIONS_CONTENT_DIR, mdFile);
    const featuredImage = extractFeaturedImage(mdPath);

    if (featuredImage) {
      // Convert featuredImage path to absolute filesystem path
      const imagePath = featuredImage.startsWith('/')
        ? path.join(PROJECT_ROOT, 'public', featuredImage)
        : path.join(ATTRACTIONS_IMG_DIR, featuredImage);

      const imageSize = getFileSize(imagePath);

      if (imageSize < SIZE_THRESHOLD && imageSize > 0) {
        const filename = path.basename(featuredImage);
        results.push({
          markdownFile: mdFile,
          slug: mdFile.replace('.md', ''),
          featuredImage: featuredImage,
          imageFilename: filename,
          currentSize: imageSize,
          imagePath: imagePath
        });
      }
    }
  }

  return results;
}

// Run analysis
const brokenFeaturedImages = analyzeAttractionsWithBrokenImages();

console.log('🔍 Attractions with broken featured images (< 100KB):\n');
console.log(`Found ${brokenFeaturedImages.length} attractions with broken featured images\n`);

brokenFeaturedImages.forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.slug}`);
  console.log(`   Markdown: ${item.markdownFile}`);
  console.log(`   Image: ${item.imageFilename}`);
  console.log(`   Size: ${(item.currentSize / 1024).toFixed(2)} KB`);
  console.log(`   Path: ${item.featuredImage}`);
  console.log('');
});

// Save to JSON for use by download script
const outputPath = path.join(PROJECT_ROOT, 'data', 'broken-featured-images.json');
fs.writeFileSync(outputPath, JSON.stringify(brokenFeaturedImages, null, 2));
console.log(`\n💾 Saved results to: ${outputPath}`);
