import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, '../Destinations-Export-2025-October-17-0420.csv');
const destMdDir = path.join(__dirname, '../src/content/destinations');
const imagesDir = path.join(__dirname, '../public/images/destinations');

// Read CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

// Get all destination markdown files
const mdFiles = fs.readdirSync(destMdDir).filter(f => f.endsWith('.md'));

console.log('='.repeat(80));
console.log('DESTINATION IMAGES AUDIT');
console.log('='.repeat(80));
console.log();

let totalDestinations = 0;
let totalImagesInCsv = 0;
let totalImagesDownloaded = 0;
let totalImagesInMarkdown = 0;
let issuesFound = 0;

mdFiles.forEach(mdFile => {
  const slug = mdFile.replace('.md', '');
  totalDestinations++;

  // Find matching CSV record
  const csvRecord = records.find(r => r.Slug === slug);
  if (!csvRecord) {
    console.log(`⚠️  ${slug}: No matching CSV record found`);
    issuesFound++;
    console.log();
    return;
  }

  const title = csvRecord.Title;

  // Get images from CSV
  const csvImageUrls = csvRecord['Image URL'] ? csvRecord['Image URL'].split('|').filter(Boolean) : [];
  totalImagesInCsv += csvImageUrls.length;

  // Extract filenames from URLs
  const csvImageFilenames = csvImageUrls.map(url => {
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  });

  // Read markdown file
  const mdPath = path.join(destMdDir, mdFile);
  const mdContent = fs.readFileSync(mdPath, 'utf-8');

  // Extract images from frontmatter
  const imagesMatch = mdContent.match(/images:\s*\n((?:\s+-\s+"[^"]+"\s*\n)+)/);
  let mdImages = [];
  if (imagesMatch) {
    mdImages = imagesMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('- "'))
      .map(line => {
        const match = line.match(/- "([^"]+)"/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
  }
  totalImagesInMarkdown += mdImages.length;

  // Extract filenames from markdown image paths
  const mdImageFilenames = mdImages.map(img => {
    return path.basename(img);
  });

  // Check which CSV images exist locally
  const existingImages = csvImageFilenames.filter(filename => {
    const filePath = path.join(imagesDir, filename);
    return fs.existsSync(filePath);
  });
  totalImagesDownloaded += existingImages.length;

  // Find missing images
  const missingImages = csvImageFilenames.filter(filename => !existingImages.includes(filename));

  // Find images in CSV but not in markdown
  const notInMarkdown = existingImages.filter(filename => !mdImageFilenames.includes(filename));

  // Report
  if (missingImages.length > 0 || notInMarkdown.length > 0) {
    console.log(`📍 ${title} (${slug})`);
    console.log(`   CSV Images: ${csvImageFilenames.length}`);
    console.log(`   Downloaded: ${existingImages.length}`);
    console.log(`   In Markdown: ${mdImages.length}`);

    if (missingImages.length > 0) {
      console.log(`   ❌ Missing (${missingImages.length}):`);
      missingImages.slice(0, 5).forEach(img => {
        console.log(`      - ${img}`);
      });
      if (missingImages.length > 5) {
        console.log(`      ... and ${missingImages.length - 5} more`);
      }
      issuesFound++;
    }

    if (notInMarkdown.length > 0) {
      console.log(`   ⚠️  Downloaded but not in markdown (${notInMarkdown.length}):`);
      notInMarkdown.slice(0, 5).forEach(img => {
        console.log(`      - ${img}`);
      });
      if (notInMarkdown.length > 5) {
        console.log(`      ... and ${notInMarkdown.length - 5} more`);
      }
      issuesFound++;
    }

    console.log();
  }
});

console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total Destinations: ${totalDestinations}`);
console.log(`Total Images in CSV: ${totalImagesInCsv}`);
console.log(`Total Images Downloaded: ${totalImagesDownloaded}`);
console.log(`Total Images in Markdown: ${totalImagesInMarkdown}`);
console.log(`Issues Found: ${issuesFound}`);
console.log();

if (issuesFound === 0) {
  console.log('✅ All destination images are properly imported and referenced!');
} else {
  console.log(`⚠️  Found ${issuesFound} destinations with image issues`);
}
