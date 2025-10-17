/**
 * Cleanup Image URLs
 * Removes old Booking.com URLs from markdown files, keeping only local paths
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../src/content/accommodation');

function cleanupImageUrls(content) {
  let updatedContent = content;

  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return content;

  let frontmatter = frontmatterMatch[1];
  const body = content.substring(frontmatterMatch[0].length);

  // Fix featuredImage - replace Booking.com URL with local path if available
  const featuredImageMatch = frontmatter.match(/featuredImage:\s*"([^"]+)"/);
  if (featuredImageMatch) {
    const currentFeaturedImage = featuredImageMatch[1];

    // If it's a Booking.com URL, try to find corresponding local image
    if (currentFeaturedImage.includes('bstatic.com') || currentFeaturedImage.includes('booking.com')) {
      // Look for local images in the images array
      const imagesArrayMatch = frontmatter.match(/images:\s*\n((?:\s*-\s*"[^"]+"\n)+)/);
      if (imagesArrayMatch) {
        const imageLines = imagesArrayMatch[1].match(/"([^"]+)"/g);
        if (imageLines) {
          const localImages = imageLines
            .map(img => img.replace(/"/g, ''))
            .filter(url => url.startsWith('/images/accommodation/'));

          // Use the first local image as featured image
          if (localImages.length > 0) {
            frontmatter = frontmatter.replace(
              /featuredImage:\s*"[^"]+"/,
              `featuredImage: "${localImages[0]}"`
            );
          }
        }
      }
    }
  }

  // Fix images array - remove Booking.com URLs
  const imagesMatch = frontmatter.match(/images:\s*\n((?:\s*-\s*"[^"]+"\n)+)/);
  if (imagesMatch) {
    const imageLines = imagesMatch[1];
    const allImages = imageLines.match(/"([^"]+)"/g);

    if (allImages) {
      // Keep only local paths
      const localImages = allImages
        .map(img => img.replace(/"/g, ''))
        .filter(url => url.startsWith('/images/accommodation/'));

      if (localImages.length > 0) {
        // Replace images array with only local paths
        const newImagesArray = 'images:\n' + localImages.map(url => `  - "${url}"`).join('\n');
        frontmatter = frontmatter.replace(/images:\s*\n(?:\s*-\s*"[^"]+"\n)+/, newImagesArray + '\n');
      }
    }
  }

  updatedContent = `---\n${frontmatter}\n---${body}`;
  return updatedContent;
}

async function cleanupAllFiles() {
  console.log('🧹 Starting image URL cleanup...\n');

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} accommodation files\n`);

  let processedCount = 0;
  let cleanedCount = 0;

  for (const filename of files) {
    const filepath = path.join(CONTENT_DIR, filename);

    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const cleanedContent = cleanupImageUrls(content);

      if (cleanedContent !== content) {
        fs.writeFileSync(filepath, cleanedContent, 'utf-8');
        cleanedCount++;
      }

      processedCount++;

      if (processedCount % 500 === 0) {
        console.log(`Progress: ${processedCount}/${files.length} files processed (${cleanedCount} cleaned)`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${filename}:`, error.message);
    }
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Total processed: ${processedCount}`);
  console.log(`   Files cleaned: ${cleanedCount}`);
  console.log(`   No changes needed: ${processedCount - cleanedCount}`);
}

cleanupAllFiles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
