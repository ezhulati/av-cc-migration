#!/usr/bin/env node
/**
 * Download hero slider images from WordPress CDN
 */

import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const OUTPUT_DIR = path.join(projectRoot, 'public', 'images', 'hero');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const heroImages = [
  'https://eia476h758b.exactdn.com/wp-content/uploads/2023/12/VisitAlbania.jpeg',
  'https://eia476h758b.exactdn.com/wp-content/uploads/2021/09/ksamil-1-scaled.jpeg',
  'https://eia476h758b.exactdn.com/wp-content/uploads/2021/09/Gjipe-copy-scaled.jpeg',
  'https://eia476h758b.exactdn.com/wp-content/uploads/2021/10/Himare-scaled.jpg',
  'https://eia476h758b.exactdn.com/wp-content/uploads/2020/03/Qeparo-Albanian-Riviera-scaled.jpeg',
  'https://eia476h758b.exactdn.com/wp-content/uploads/2020/03/Palase_DJI_0280.jpg',
  'https://eia476h758b.exactdn.com/wp-content/uploads/2021/09/Apollonia.jpg'
];

function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, { timeout: 30000 }, (response) => {
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

async function downloadHeroImages() {
  console.log('Downloading hero slider images...\n');

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const url of heroImages) {
    const filename = path.basename(new URL(url).pathname);
    const filePath = path.join(OUTPUT_DIR, filename);

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      console.log(`✓ Skipped (exists): ${filename}`);
      skipped++;
      continue;
    }

    try {
      console.log(`⬇ Downloading: ${filename}`);
      await downloadImage(url, filePath);

      // Verify file size
      const stats = fs.statSync(filePath);
      if (stats.size < 1000) {
        console.log(`✗ Failed (corrupt): ${filename} (${stats.size} bytes)`);
        fs.unlinkSync(filePath);
        failed++;
      } else {
        console.log(`✓ Downloaded: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        downloaded++;
      }
    } catch (err) {
      console.error(`✗ Failed: ${filename} - ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total images: ${heroImages.length}`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nImages saved to: ${OUTPUT_DIR}`);
}

downloadHeroImages().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
