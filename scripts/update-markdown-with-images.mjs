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

console.log('='.repeat(80));
console.log('UPDATING MARKDOWN FILES WITH DOWNLOADED IMAGES');
console.log('='.repeat(80));
console.log();

let totalUpdated = 0;
let totalSkipped = 0;

// Process each destination
records.forEach(record => {
  const slug = record.Slug;
  const title = record.Title;

  if (!slug) return;

  const mdPath = path.join(destMdDir, `${slug}.md`);

  // Skip if markdown file doesn't exist
  if (!fs.existsSync(mdPath)) {
    return;
  }

  // Get images from CSV
  const csvImageUrls = record['Image URL'] ? record['Image URL'].split('|').filter(Boolean) : [];

  if (csvImageUrls.length === 0) return;

  // Get filenames and check which ones exist locally
  const availableImages = [];
  csvImageUrls.forEach(url => {
    const filename = url.split('/').pop();
    const filePath = path.join(imagesDir, filename);

    if (fs.existsSync(filePath)) {
      availableImages.push(`/images/destinations/${filename}`);
    }
  });

  if (availableImages.length === 0) return;

  // Read current markdown file
  const mdContent = fs.readFileSync(mdPath, 'utf-8');

  // Extract current images array from frontmatter
  const imagesMatch = mdContent.match(/images:\s*\n((?:\s+-\s+"[^"]+"\s*\n)+)/);

  let currentImages = [];
  if (imagesMatch) {
    currentImages = imagesMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('- "'))
      .map(line => {
        const match = line.match(/- "([^"]+)"/);
        return match ? match[1] : null;
      })
      .filter(Boolean);
  }

  // Add new images that aren't already in the list
  const imagesToAdd = availableImages.filter(img => !currentImages.includes(img));

  if (imagesToAdd.length === 0) {
    totalSkipped++;
    return;
  }

  // Combine current and new images (remove duplicates)
  const allImages = [...new Set([...currentImages, ...imagesToAdd])];

  // Build new images array string
  const newImagesString = 'images:\n' + allImages.map(img => `  - "${img}"`).join('\n');

  // Replace images section in frontmatter
  let updatedContent;
  if (imagesMatch) {
    // Replace existing images array
    updatedContent = mdContent.replace(
      /images:\s*\n(?:\s+-\s+"[^"]+"\s*\n)+/,
      newImagesString + '\n'
    );
  } else {
    // Add images array after featuredImage
    updatedContent = mdContent.replace(
      /(featuredImage:\s*"[^"]*"\s*\n)/,
      `$1${newImagesString}\n`
    );
  }

  // Write updated content back to file
  fs.writeFileSync(mdPath, updatedContent, 'utf-8');

  console.log(`✓ ${title} (${slug})`);
  console.log(`  Added ${imagesToAdd.length} new images (Total: ${allImages.length})`);
  totalUpdated++;
});

console.log();
console.log('='.repeat(80));
console.log('UPDATE SUMMARY');
console.log('='.repeat(80));
console.log(`✓ Updated: ${totalUpdated} destinations`);
console.log(`⊘ Skipped: ${totalSkipped} destinations (no new images)`);
console.log();

if (totalUpdated > 0) {
  console.log('✅ Markdown files updated! Image sliders will now show all available images.');
} else {
  console.log('✅ All markdown files already up to date!');
}
