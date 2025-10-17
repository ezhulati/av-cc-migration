#!/usr/bin/env node
/**
 * Download attraction images from CSV export
 */

import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CSV_FILE = path.join(projectRoot, 'Attractions-Export-2025-October-17-0423.csv');
const OUTPUT_DIR = path.join(projectRoot, 'public', 'images', 'attractions');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadImage(response.headers.location, filePath).then(resolve).catch(reject);
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

function generateFilename(url, slug, id) {
  const ext = path.extname(url).split('?')[0] || '.jpg';
  if (slug && slug !== '0' && slug !== '') {
    return `${slug}${ext}`;
  }
  return `attraction-${id}${ext}`;
}

async function processCSV() {
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = content.split('\n');

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const idIndex = headers.indexOf('ID');
  const titleIndex = headers.indexOf('Title');
  const imageUrlIndex = headers.indexOf('Image URL');
  const attachmentUrlIndex = headers.indexOf('Attachment URL');
  const slugIndex = headers.indexOf('Slug');

  console.log('🏛️  Attraction Image Downloader');
  console.log('='.repeat(80));
  console.log(`Processing ${lines.length - 1} attractions...\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = parseCSVLine(lines[i]);
    const id = row[idIndex];
    const title = row[titleIndex];
    const imageUrl = row[imageUrlIndex];
    const attachmentUrl = row[attachmentUrlIndex];
    const slug = row[slugIndex];

    // Use Image URL first, fall back to Attachment URL
    const url = imageUrl || attachmentUrl;

    if (!url || !url.startsWith('http')) {
      skipped++;
      continue;
    }

    const filename = generateFilename(url, slug, id);
    const filePath = path.join(OUTPUT_DIR, filename);

    // Skip if already downloaded
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  ${filename} (already exists)`);
      skipped++;
      continue;
    }

    try {
      await downloadImage(url, filePath);
      console.log(`✅ ${filename}`);
      downloaded++;

      // Add delay to avoid overwhelming the server
      if (downloaded % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.log(`❌ ${filename}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${downloaded + skipped + failed}`);
  console.log('='.repeat(80));
}

processCSV().catch(console.error);
