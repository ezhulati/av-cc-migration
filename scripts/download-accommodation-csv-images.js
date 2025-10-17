#!/usr/bin/env node
/**
 * Download accommodation images from CSV export
 * This is the LARGEST dataset - handle carefully
 */

import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CSV_FILE = path.join(projectRoot, 'Accommodation-Export-2025-October-17-0507.csv');
const OUTPUT_DIR = path.join(projectRoot, 'public', 'images', 'accommodation');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let downloaded = 0;
let skipped = 0;
let failed = 0;
let totalImages = 0;

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function generateFilename(url, slug, id, index) {
  const urlObj = new URL(url);
  let filename = path.basename(urlObj.pathname);

  // Remove query parameters
  filename = filename.split('?')[0];

  // If filename is too generic or weird, use slug-index
  if (filename.match(/^photo/i) || filename.match(/^image/i) || filename.length < 5) {
    const ext = path.extname(filename) || '.jpg';
    if (slug && slug !== '0' && slug !== '') {
      return `${slug}-${index}${ext}`;
    }
    return `accommodation-${id}-${index}${ext}`;
  }

  return filename;
}

function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { timeout: 15000 }, (response) => {
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
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, filePath).then(resolve).catch(reject);
        } else {
          reject(new Error(`Redirect without location: ${response.statusCode}`));
        }
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function processCSV() {
  console.log('Reading CSV file...');
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = content.split('\n');

  console.log(`Total lines: ${lines.length}`);

  const headers = parseCSVLine(lines[0]);
  const idIndex = headers.indexOf('ID');
  const imageUrlIndex = headers.indexOf('Image URL');
  const attachmentUrlIndex = headers.indexOf('Attachment URL');
  const slugIndex = headers.indexOf('Slug');

  console.log(`\nColumn indices:`);
  console.log(`  ID: ${idIndex}`);
  console.log(`  Image URL: ${imageUrlIndex}`);
  console.log(`  Attachment URL: ${attachmentUrlIndex}`);
  console.log(`  Slug: ${slugIndex}`);
  console.log('');

  // Process each record
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    if (i % 100 === 0) {
      console.log(`Progress: ${i}/${lines.length} records processed. Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`);
    }

    try {
      const row = parseCSVLine(lines[i]);
      const id = row[idIndex];
      const imageUrls = row[imageUrlIndex];
      const attachmentUrl = row[attachmentUrlIndex];
      const slug = row[slugIndex];

      // Split pipe-separated URLs
      let urls = [];
      if (imageUrls && imageUrls.trim()) {
        urls = imageUrls.split('|').map(u => u.trim()).filter(u => u.startsWith('http'));
      }

      // Add attachment URL as fallback
      if (!urls.length && attachmentUrl && attachmentUrl.startsWith('http')) {
        urls.push(attachmentUrl);
      }

      // Download each image
      for (let imgIndex = 0; imgIndex < urls.length; imgIndex++) {
        const url = urls[imgIndex];
        totalImages++;

        const filename = generateFilename(url, slug, id, imgIndex);
        const filePath = path.join(OUTPUT_DIR, filename);

        // Skip if already exists
        if (fs.existsSync(filePath)) {
          skipped++;
          continue;
        }

        try {
          await downloadImage(url, filePath);
          downloaded++;
        } catch (err) {
          failed++;
          if (failed <= 10) {
            console.error(`Failed to download ${url}: ${err.message}`);
          }
        }

        // Small delay to avoid overwhelming the server
        if (downloaded % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (err) {
      console.error(`Error processing line ${i}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== Final Summary ===');
  console.log(`Total images found: ${totalImages}`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

processCSV().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
