#!/usr/bin/env node
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const LIST_FILE = process.argv[2];
const OUTPUT_DIR = process.argv[3] || path.join(projectRoot, 'public', 'images', 'attractions');

if (!LIST_FILE) {
  console.error('Usage: node download-from-list.js <list-file> [output-dir]');
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (response) => {
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
    }).on('error', reject).on('timeout', () => {
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  const urls = fs.readFileSync(LIST_FILE, 'utf-8').split('\n').filter(Boolean);

  console.log('🖼️  Downloading images from list');
  console.log('='.repeat(80));
  console.log(`Total URLs: ${urls.length}\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const urlPath of urls) {
    const url = `https://${urlPath}`;
    const filename = path.basename(urlPath);
    const filePath = path.join(OUTPUT_DIR, filename);

    if (fs.existsSync(filePath)) {
      console.log(`⏭️  ${filename}`);
      skipped++;
      continue;
    }

    try {
      await downloadImage(url, filePath);
      console.log(`✅ ${filename}`);
      downloaded++;

      if (downloaded % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.log(`❌ ${filename}: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('Downloaded:', downloaded);
  console.log('Skipped:', skipped);
  console.log('Failed:', failed);
  console.log('='.repeat(80));
}

main().catch(console.error);
