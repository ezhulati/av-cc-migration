import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const accommodationDir = path.join(rootDir, 'src', 'content', 'accommodation');
const imagesDir = path.join(rootDir, 'public', 'images', 'accommodation');

console.log('🔍 Finding images with query parameters in filenames...\n');

// Find all image files with ? in their names
const imageFiles = fs.readdirSync(imagesDir);
const queryParamImages = imageFiles.filter(f => f.includes('?'));

console.log(`Found ${queryParamImages.length} images with query parameters\n`);

let renamedCount = 0;
let updatedFilesCount = 0;

for (const oldFilename of queryParamImages) {
  // Remove query parameters from filename
  const newFilename = oldFilename.replace(/\?.*$/, '');

  // Skip if the name doesn't change
  if (oldFilename === newFilename) continue;

  const oldPath = path.join(imagesDir, oldFilename);
  const newPath = path.join(imagesDir, newFilename);

  try {
    // Check if new filename already exists
    if (fs.existsSync(newPath)) {
      console.log(`⚠️  Skipping ${oldFilename} - ${newFilename} already exists`);
      continue;
    }

    // Rename the file
    fs.renameSync(oldPath, newPath);
    console.log(`✅ Renamed: ${oldFilename} → ${newFilename}`);
    renamedCount++;

    // Now update any markdown files that reference this image
    const mdFiles = fs.readdirSync(accommodationDir).filter(f => f.endsWith('.md'));

    for (const mdFile of mdFiles) {
      const mdPath = path.join(accommodationDir, mdFile);
      let content = fs.readFileSync(mdPath, 'utf-8');

      // Check if this file references the old image path
      const oldImageRef = `/images/accommodation/${oldFilename}`;
      const newImageRef = `/images/accommodation/${newFilename}`;

      if (content.includes(oldImageRef)) {
        content = content.replaceAll(oldImageRef, newImageRef);
        fs.writeFileSync(mdPath, content, 'utf-8');
        console.log(`   Updated: ${mdFile}`);
        updatedFilesCount++;
      }
    }

    console.log('');
  } catch (error) {
    console.error(`❌ Error processing ${oldFilename}:`, error.message);
  }
}

console.log('\n✨ Summary:');
console.log(`   Renamed images: ${renamedCount}`);
console.log(`   Updated markdown files: ${updatedFilesCount}`);
