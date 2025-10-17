#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';

const PROJECT_ROOT = '/Users/ez/Desktop/AI Library/Apps/AV-CC';
const ATTRACTIONS_IMG_DIR = path.join(PROJECT_ROOT, 'public/images/attractions');
const ATTRACTIONS_CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/attractions');
const SIZE_THRESHOLD = 100 * 1024; // 100KB

// Stats tracking
const stats = {
  brokenFound: 0,
  downloadSuccess: 0,
  downloadFailed: 0,
  notFoundInWordPress: 0,
  skippedExternalCDN: 0,
  errors: []
};

// Function to get file size
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (err) {
    return 0;
  }
}

// Function to find all broken images (< 100KB)
function findBrokenImages() {
  const images = [];
  const files = fs.readdirSync(ATTRACTIONS_IMG_DIR);

  for (const file of files) {
    const filePath = path.join(ATTRACTIONS_IMG_DIR, file);
    const size = getFileSize(filePath);

    if (size < SIZE_THRESHOLD && size > 0) {
      images.push({
        filename: file,
        path: filePath,
        size: size
      });
    }
  }

  return images;
}

// Function to find the markdown file that references this image
function findMarkdownForImage(imageFilename) {
  const mdFiles = fs.readdirSync(ATTRACTIONS_CONTENT_DIR);

  for (const mdFile of mdFiles) {
    const mdPath = path.join(ATTRACTIONS_CONTENT_DIR, mdFile);
    const content = fs.readFileSync(mdPath, 'utf8');

    // Check if this markdown file references the image
    if (content.includes(imageFilename)) {
      return {
        filename: mdFile,
        path: mdPath,
        slug: mdFile.replace('.md', '')
      };
    }
  }

  return null;
}

// Function to extract WordPress URL from markdown frontmatter or find alternatives
function findWordPressImageURL(imageFilename, markdownFile) {
  // Strategy 1: Try to construct the WordPress URL based on common patterns
  const baseFilename = path.parse(imageFilename).name;
  const ext = path.parse(imageFilename).ext;

  // Common WordPress image URL patterns
  const possibleURLs = [
    `https://albaniavisit.com/wp-content/uploads/${baseFilename}${ext}`,
    `https://eia476h758b.exactdn.com/wp-content/uploads/${baseFilename}${ext}`,
    // Try with different years
    `https://albaniavisit.com/wp-content/uploads/2023/07/${baseFilename}${ext}`,
    `https://albaniavisit.com/wp-content/uploads/2024/01/${baseFilename}${ext}`,
    `https://albaniavisit.com/wp-content/uploads/2025/10/${baseFilename}${ext}`,
    `https://eia476h758b.exactdn.com/wp-content/uploads/2023/07/${baseFilename}${ext}`,
    `https://eia476h758b.exactdn.com/wp-content/uploads/2024/01/${baseFilename}${ext}`,
    `https://eia476h758b.exactdn.com/wp-content/uploads/2025/10/${baseFilename}${ext}`,
  ];

  return possibleURLs;
}

// Function to download image from URL
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        const size = getFileSize(outputPath);
        if (size > SIZE_THRESHOLD) {
          resolve({ success: true, size: size, url: url });
        } else {
          fs.unlinkSync(outputPath); // Delete the small file
          reject(new Error(`Downloaded file still too small (${size} bytes)`));
        }
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Function to try downloading from multiple possible URLs
async function tryDownloadFromMultipleURLs(urls, outputPath) {
  for (const url of urls) {
    try {
      console.log(`  Trying: ${url}`);
      const result = await downloadImage(url, outputPath);
      return result;
    } catch (err) {
      // Continue to next URL
      continue;
    }
  }
  throw new Error('All URLs failed');
}

// Main function
async function main() {
  console.log('🔍 Finding broken attraction images (< 100KB)...\n');

  const brokenImages = findBrokenImages();
  stats.brokenFound = brokenImages.length;

  console.log(`Found ${brokenImages.length} broken images\n`);
  console.log('=' .repeat(80));

  for (let i = 0; i < brokenImages.length; i++) {
    const img = brokenImages[i];
    console.log(`\n[${i + 1}/${brokenImages.length}] Processing: ${img.filename}`);
    console.log(`  Current size: ${(img.size / 1024).toFixed(2)} KB`);

    // Find the markdown file that references this image
    const mdFile = findMarkdownForImage(img.filename);

    if (!mdFile) {
      console.log(`  ⚠️  No markdown file found referencing this image`);
      stats.errors.push({
        image: img.filename,
        error: 'No markdown reference found'
      });
      continue;
    }

    console.log(`  Found in: ${mdFile.filename}`);

    // Skip external CDN images (Booking.com, etc.)
    if (img.filename.includes('cf.bstatic.com') || img.filename.includes('booking.com')) {
      console.log(`  ⏭️  Skipping external CDN image`);
      stats.skippedExternalCDN++;
      continue;
    }

    // Find possible WordPress URLs
    const possibleURLs = findWordPressImageURL(img.filename, mdFile);

    try {
      // Backup the broken file first
      const backupPath = img.path + '.broken';
      fs.copyFileSync(img.path, backupPath);

      // Try to download from possible URLs
      const result = await tryDownloadFromMultipleURLs(possibleURLs, img.path);

      console.log(`  ✅ Downloaded successfully!`);
      console.log(`     Source: ${result.url}`);
      console.log(`     New size: ${(result.size / 1024).toFixed(2)} KB`);

      // Remove backup
      fs.unlinkSync(backupPath);
      stats.downloadSuccess++;

    } catch (err) {
      console.log(`  ❌ Failed to download: ${err.message}`);
      stats.downloadFailed++;
      stats.errors.push({
        image: img.filename,
        markdown: mdFile.filename,
        error: err.message
      });

      // Restore backup if exists
      const backupPath = img.path + '.broken';
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, img.path);
        fs.unlinkSync(backupPath);
      }
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`Total broken images found:     ${stats.brokenFound}`);
  console.log(`Successfully downloaded:       ${stats.downloadSuccess}`);
  console.log(`Failed to download:            ${stats.downloadFailed}`);
  console.log(`Skipped (external CDN):        ${stats.skippedExternalCDN}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.image}`);
      if (err.markdown) console.log(`   Markdown: ${err.markdown}`);
      console.log(`   Error: ${err.error}`);
    });
  }

  console.log('\n✨ Done!\n');
}

// Run the script
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
