#!/usr/bin/env node

/**
 * Fix Image Extension Mismatches
 *
 * This script fixes the systematic issue where markdown files reference .jpg
 * but actual downloaded images have .jpeg extension.
 *
 * Strategy:
 * 1. Find all .md files with .jpg featuredImage references
 * 2. For each file, check if corresponding .jpeg file exists
 * 3. If .jpeg exists but .jpg doesn't, update the markdown reference
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = '/Users/ez/Desktop/AI Library/Apps/AV-CC';
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

let stats = {
  totalChecked: 0,
  fixed: 0,
  skipped: 0,
  errors: 0,
  collections: {}
};

function log(message, level = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function extractFeaturedImagePath(content) {
  // Match featuredImage: /path/to/image.jpg or featuredImage: "/path/to/image.jpg"
  const match = content.match(/featuredImage:\s*["']?([^"'\n]+\.jpg)["']?/i);
  return match ? match[1] : null;
}

function fixImageExtension(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const featuredImagePath = extractFeaturedImagePath(content);

    if (!featuredImagePath) {
      stats.skipped++;
      return false;
    }

    stats.totalChecked++;

    // Convert /images/... to public/images/...
    const relativeImagePath = featuredImagePath.startsWith('/')
      ? featuredImagePath.substring(1)
      : featuredImagePath;

    const jpgPath = path.join(PUBLIC_DIR, relativeImagePath);
    const jpegPath = jpgPath.replace(/\.jpg$/i, '.jpeg');

    // Check if .jpeg exists but .jpg doesn't
    const jpegExists = fs.existsSync(jpegPath);
    const jpgExists = fs.existsSync(jpgPath);

    if (jpegExists && !jpgExists) {
      // Update the markdown file
      const newImagePath = featuredImagePath.replace(/\.jpg$/i, '.jpeg');
      const newContent = content.replace(
        /featuredImage:\s*["']?[^"'\n]+\.jpg["']?/i,
        `featuredImage: ${newImagePath}`
      );

      fs.writeFileSync(filePath, newContent, 'utf8');

      const collection = path.basename(path.dirname(filePath));
      stats.collections[collection] = (stats.collections[collection] || 0) + 1;
      stats.fixed++;

      log(`Fixed: ${path.basename(filePath)} → ${newImagePath}`, 'success');
      return true;
    } else if (jpgExists) {
      // .jpg file actually exists, no change needed
      stats.skipped++;
      return false;
    } else if (!jpegExists && !jpgExists) {
      // Neither exists - this is a missing image issue
      log(`Missing image: ${path.basename(filePath)} → ${featuredImagePath}`, 'error');
      stats.errors++;
      return false;
    }

    stats.skipped++;
    return false;

  } catch (error) {
    log(`Error processing ${filePath}: ${error.message}`, 'error');
    stats.errors++;
    return false;
  }
}

function findAndFixFiles() {
  log('Starting image extension fix...');
  log(`Scanning directory: ${CONTENT_DIR}`);

  // Find all markdown files with .jpg references
  const cmd = `find "${CONTENT_DIR}" -name "*.md" -exec grep -l "featuredImage:.*\\.jpg" {} \\;`;

  try {
    const output = execSync(cmd, { encoding: 'utf8' });
    const files = output.trim().split('\n').filter(Boolean);

    log(`Found ${files.length} files with .jpg references`);

    // Process each file
    files.forEach((file, index) => {
      if ((index + 1) % 500 === 0) {
        log(`Progress: ${index + 1}/${files.length} files processed...`);
      }
      fixImageExtension(file);
    });

  } catch (error) {
    log(`Error finding files: ${error.message}`, 'error');
    process.exit(1);
  }
}

function printStats() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files checked:     ${stats.totalChecked}`);
  console.log(`✅ Successfully fixed:   ${stats.fixed}`);
  console.log(`⏭️  Skipped (no change): ${stats.skipped}`);
  console.log(`❌ Errors/Missing:       ${stats.errors}`);
  console.log('='.repeat(60));

  if (Object.keys(stats.collections).length > 0) {
    console.log('\n📁 Fixed by Collection:');
    Object.entries(stats.collections)
      .sort((a, b) => b[1] - a[1])
      .forEach(([collection, count]) => {
        console.log(`   ${collection.padEnd(20)} ${count}`);
      });
  }

  console.log('\n✨ Done!\n');
}

// Run the script
findAndFixFiles();
printStats();
