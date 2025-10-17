#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/accommodation');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public/images/accommodation');

// Parse frontmatter
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

console.log('🔍 COMPREHENSIVE IMAGE AUDIT\n');
console.log('='.repeat(60));

// Get all accommodation files
const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
console.log(`\n📁 Found ${files.length} accommodation files`);

const imageStats = {
  totalFiles: files.length,
  filesWithFeaturedImage: 0,
  filesWithGalleryImages: 0,
  filesWithNoImages: 0,

  localFeaturedImages: 0,
  externalFeaturedImages: 0,
  missingFeaturedImages: 0,
  emptyFeaturedImages: 0,

  totalGalleryImages: 0,
  localGalleryImages: 0,
  externalGalleryImages: 0,
  missingGalleryImages: 0,

  localImagesMissing: [],
  externalImageDomains: {},

  wordPressImages: 0,
  bookingImages: 0,
  googleImages: 0,
  facebookImages: 0,
  otherImages: 0
};

console.log('\n📊 Analyzing all accommodation files...\n');

for (const file of files) {
  const filePath = path.join(CONTENT_DIR, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = parseFrontmatter(content);

  if (!frontmatter) continue;

  // Check featured image
  let featuredImage = frontmatter.featuredImage;
  // Handle if it's an array (parsing issue)
  if (Array.isArray(featuredImage)) {
    featuredImage = featuredImage[0] || '';
  }
  featuredImage = String(featuredImage || '');

  if (featuredImage && featuredImage !== '') {
    imageStats.filesWithFeaturedImage++;

    if (featuredImage.startsWith('http://') || featuredImage.startsWith('https://')) {
      // External URL
      imageStats.externalFeaturedImages++;

      try {
        const url = new URL(featuredImage);
        const domain = url.hostname;
        imageStats.externalImageDomains[domain] = (imageStats.externalImageDomains[domain] || 0) + 1;

        // Categorize by source
        if (domain.includes('albaniavisit.com')) imageStats.wordPressImages++;
        else if (domain.includes('bstatic.com')) imageStats.bookingImages++;
        else if (domain.includes('googleusercontent.com')) imageStats.googleImages++;
        else if (domain.includes('facebook.com') || domain.includes('fbcdn.net')) imageStats.facebookImages++;
        else imageStats.otherImages++;
      } catch (e) {
        // Invalid URL
      }
    } else if (featuredImage.startsWith('/images/')) {
      // Local path
      imageStats.localFeaturedImages++;
      const localPath = path.join(PROJECT_ROOT, 'public', featuredImage);
      if (!fs.existsSync(localPath)) {
        imageStats.missingFeaturedImages++;
        imageStats.localImagesMissing.push({
          file: file,
          type: 'featured',
          path: featuredImage
        });
      }
    }
  } else {
    imageStats.emptyFeaturedImages++;
  }

  // Check gallery images
  const images = frontmatter.images || [];
  if (images.length > 0) {
    imageStats.filesWithGalleryImages++;
    imageStats.totalGalleryImages += images.length;

    for (const img of images) {
      if (img.startsWith('http://') || img.startsWith('https://')) {
        imageStats.externalGalleryImages++;

        try {
          const url = new URL(img);
          const domain = url.hostname;
          imageStats.externalImageDomains[domain] = (imageStats.externalImageDomains[domain] || 0) + 1;

          // Categorize
          if (domain.includes('albaniavisit.com')) imageStats.wordPressImages++;
          else if (domain.includes('bstatic.com')) imageStats.bookingImages++;
          else if (domain.includes('googleusercontent.com')) imageStats.googleImages++;
          else if (domain.includes('facebook.com') || domain.includes('fbcdn.net')) imageStats.facebookImages++;
          else imageStats.otherImages++;
        } catch (e) {
          // Invalid URL
        }
      } else if (img.startsWith('/images/')) {
        imageStats.localGalleryImages++;
        const localPath = path.join(PROJECT_ROOT, 'public', img);
        if (!fs.existsSync(localPath)) {
          imageStats.missingGalleryImages++;
          imageStats.localImagesMissing.push({
            file: file,
            type: 'gallery',
            path: img
          });
        }
      }
    }
  }

  // Files with no images at all
  if ((!featuredImage || featuredImage === '') && (!images || images.length === 0)) {
    imageStats.filesWithNoImages++;
  }
}

// Check what images exist in the images directory
const localImagesExist = fs.existsSync(IMAGES_DIR)
  ? fs.readdirSync(IMAGES_DIR).filter(f => !f.startsWith('.')).length
  : 0;

console.log('='.repeat(60));
console.log('📊 IMAGE AUDIT RESULTS');
console.log('='.repeat(60));

console.log('\n📁 File Statistics:');
console.log(`   Total accommodation files: ${imageStats.totalFiles}`);
console.log(`   Files with featured images: ${imageStats.filesWithFeaturedImage}`);
console.log(`   Files with gallery images: ${imageStats.filesWithGalleryImages}`);
console.log(`   Files with NO images: ${imageStats.filesWithNoImages}`);
console.log(`   Files with empty featured image field: ${imageStats.emptyFeaturedImages}`);

console.log('\n🖼️  Featured Image Breakdown:');
console.log(`   Local (in /images/): ${imageStats.localFeaturedImages}`);
console.log(`   External (CDN): ${imageStats.externalFeaturedImages}`);
console.log(`   Empty/Missing: ${imageStats.emptyFeaturedImages}`);
console.log(`   Local but file missing: ${imageStats.missingFeaturedImages}`);

console.log('\n📸 Gallery Images Breakdown:');
console.log(`   Total gallery images: ${imageStats.totalGalleryImages}`);
console.log(`   Local (in /images/): ${imageStats.localGalleryImages}`);
console.log(`   External (CDN): ${imageStats.externalGalleryImages}`);
console.log(`   Local but file missing: ${imageStats.missingGalleryImages}`);

console.log('\n🌍 External Image Sources:');
console.log(`   WordPress (albaniavisit.com): ${imageStats.wordPressImages}`);
console.log(`   Booking.com CDN: ${imageStats.bookingImages}`);
console.log(`   Google: ${imageStats.googleImages}`);
console.log(`   Facebook: ${imageStats.facebookImages}`);
console.log(`   Other: ${imageStats.otherImages}`);

console.log('\n💾 Local Storage:');
console.log(`   Images in /public/images/accommodation/: ${localImagesExist}`);

console.log('\n⚠️  Missing Local Images:');
console.log(`   Total local images referenced but missing: ${imageStats.localImagesMissing.length}`);

if (imageStats.localImagesMissing.length > 0) {
  console.log('\n🔴 Files with missing local images (first 20):');
  imageStats.localImagesMissing.slice(0, 20).forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.file}`);
    console.log(`      Type: ${item.type}`);
    console.log(`      Path: ${item.path}`);
  });

  if (imageStats.localImagesMissing.length > 20) {
    console.log(`   ... and ${imageStats.localImagesMissing.length - 20} more`);
  }
}

console.log('\n📊 External Domain Breakdown:');
const sortedDomains = Object.entries(imageStats.externalImageDomains)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

sortedDomains.forEach(([domain, count]) => {
  console.log(`   ${domain}: ${count} images`);
});

console.log('\n' + '='.repeat(60));

// Save detailed report
const report = {
  timestamp: new Date().toISOString(),
  statistics: imageStats,
  missingLocalImages: imageStats.localImagesMissing
};

const dataDir = path.join(PROJECT_ROOT, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(
  path.join(dataDir, 'comprehensive-image-audit.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Detailed report saved to: data/comprehensive-image-audit.json');
console.log('='.repeat(60));
