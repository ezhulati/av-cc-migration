import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const accommodationDir = path.join(rootDir, 'src', 'content', 'accommodation');
const imagesDir = path.join(rootDir, 'public', 'images', 'accommodation');

console.log('🔍 Finding images without proper extensions...\n');

// Find all accommodation files
const files = fs.readdirSync(accommodationDir).filter(f => f.endsWith('.md'));

let fixedCount = 0;
let skippedCount = 0;

for (const file of files) {
  const filePath = path.join(accommodationDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find featuredImage lines that don't end with common image extensions
  const featuredImageMatch = content.match(/featuredImage:\s*["']\/images\/accommodation\/([^"']+)["']/);

  if (featuredImageMatch) {
    const imagePath = featuredImageMatch[1];

    // Check if it already has an extension
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(imagePath)) {
      continue;
    }

    // Check if this is a CDN URL (skip those)
    if (imagePath.includes('http://') || imagePath.includes('https://')) {
      continue;
    }

    const fullImagePath = path.join(imagesDir, imagePath);

    // Check if file exists
    if (!fs.existsSync(fullImagePath)) {
      console.log(`⚠️  Image not found: ${imagePath}`);
      skippedCount++;
      continue;
    }

    // Detect file type
    try {
      const fileType = execSync(`file -b --mime-type "${fullImagePath}"`, { encoding: 'utf-8' }).trim();

      let extension = '';
      if (fileType === 'image/jpeg') {
        extension = '.jpg';
      } else if (fileType === 'image/png') {
        extension = '.png';
      } else if (fileType === 'image/webp') {
        extension = '.webp';
      } else if (fileType === 'image/gif') {
        extension = '.gif';
      } else {
        console.log(`⚠️  Unknown file type for ${imagePath}: ${fileType}`);
        skippedCount++;
        continue;
      }

      const newImagePath = imagePath + extension;
      const newFullImagePath = fullImagePath + extension;

      // Rename the file
      fs.renameSync(fullImagePath, newFullImagePath);
      console.log(`✅ Renamed: ${imagePath} → ${newImagePath}`);

      // Update the markdown file
      const newContent = content.replace(
        `featuredImage: "/images/accommodation/${imagePath}"`,
        `featuredImage: "/images/accommodation/${newImagePath}"`
      );

      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`   Updated: ${file}\n`);

      fixedCount++;
    } catch (error) {
      console.error(`❌ Error processing ${imagePath}:`, error.message);
      skippedCount++;
    }
  }
}

console.log('\n✨ Summary:');
console.log(`   Fixed: ${fixedCount} images`);
console.log(`   Skipped: ${skippedCount} images`);
