#!/usr/bin/env node
/**
 * Download images from content HTML in CSV exports
 */

import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CSV_FILE = process.argv[2];
const OUTPUT_DIR = process.argv[3] || path.join(projectRoot, 'public', 'images', 'attractions');

if (!CSV_FILE) {
  console.error('Usage: node download-content-images.js <csv-file> [output-dir]');
  process.exit(1);
}

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

function extractImageUrls(html) {
  const urls = [];
  const regex = /src=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|gif|webp)[^"']*)["']/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }

  return urls;
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

function generateFilename(url) {
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1].split('?')[0];
  return filename;
}

async function processCSV() {
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = content.split('\n');

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const contentIndex = headers.indexOf('Content');

  console.log('🖼️  Content Image Extractor');
  console.log('='.repeat(80));
  console.log(`Processing ${lines.length - 1} records...\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const processedUrls = new Set();

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const row = parseCSVLine(lines[i]);
    const contentHtml = row[contentIndex] || '';

    const imageUrls = extractImageUrls(contentHtml);

    for (const url of imageUrls) {
      // Skip if already processed
      if (processedUrls.has(url)) {
        continue;
      }
      processedUrls.add(url);

      const filename = generateFilename(url);
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

        // Add delay
        if (downloaded % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.log(`❌ ${filename}: ${error.message}`);
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total unique images: ${processedUrls.size}`);
  console.log('='.repeat(80));
}

processCSV().catch(console.error);
