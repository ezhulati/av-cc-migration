import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../Destinations-Export-2025-October-17-0420.csv');
const destMdDir = path.join(__dirname, '../src/content/destinations');
const imagesDir = path.join(__dirname, '../public/images/destinations');

// Ensure images directory exists
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Download file function
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const file = fs.createWriteStream(destPath);

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      reject(err);
    });
  });
}

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Read CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

console.log('='.repeat(80));
console.log('DOWNLOADING MISSING DESTINATION IMAGES');
console.log('='.repeat(80));
console.log();

let totalDownloaded = 0;
let totalFailed = 0;
let totalSkipped = 0;

// Process each destination
for (const record of records) {
  const slug = record.Slug;
  const title = record.Title;

  if (!slug) continue;

  // Get images from CSV
  const csvImageUrls = record['Image URL'] ? record['Image URL'].split('|').filter(Boolean) : [];

  if (csvImageUrls.length === 0) continue;

  console.log(`\n📍 ${title} (${slug})`);
  console.log(`   Total images in CSV: ${csvImageUrls.length}`);

  const downloadedImages = [];
  const failedImages = [];

  for (let i = 0; i < csvImageUrls.length; i++) {
    const url = csvImageUrls[i].trim();
    const filename = url.split('/').pop();
    const destPath = path.join(imagesDir, filename);

    // Skip if already exists
    if (fs.existsSync(destPath)) {
      totalSkipped++;
      continue;
    }

    process.stdout.write(`   [${i + 1}/${csvImageUrls.length}] Downloading ${filename}...`);

    try {
      await downloadFile(url, destPath);

      // Verify file was downloaded and has content
      const stats = fs.statSync(destPath);
      if (stats.size === 0) {
        fs.unlinkSync(destPath);
        throw new Error('Downloaded file is empty');
      }

      downloadedImages.push(filename);
      totalDownloaded++;
      console.log(' ✓');

      // Small delay to avoid overwhelming the server
      await sleep(100);
    } catch (error) {
      failedImages.push({ filename, error: error.message });
      totalFailed++;
      console.log(` ✗ (${error.message})`);
    }
  }

  if (downloadedImages.length > 0) {
    console.log(`   ✅ Downloaded: ${downloadedImages.length} images`);
  }
  if (failedImages.length > 0) {
    console.log(`   ❌ Failed: ${failedImages.length} images`);
  }
}

console.log();
console.log('='.repeat(80));
console.log('DOWNLOAD SUMMARY');
console.log('='.repeat(80));
console.log(`✓ Downloaded: ${totalDownloaded} images`);
console.log(`⊘ Skipped (already exist): ${totalSkipped} images`);
console.log(`✗ Failed: ${totalFailed} images`);
console.log();

if (totalDownloaded > 0) {
  console.log('✅ Image download complete! Run update script to add them to markdown files.');
} else if (totalFailed > 0) {
  console.log('⚠️  Some images failed to download. Check the errors above.');
} else {
  console.log('✅ All images already downloaded!');
}
