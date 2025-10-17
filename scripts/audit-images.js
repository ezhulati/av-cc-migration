import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIRS = [
  'src/content/posts',
  'src/content/destinations',
  'src/content/attractions',
  'src/content/activities',
  'src/content/pages'
];

const PUBLIC_IMAGES = 'public/images';

/**
 * Extract image paths from markdown frontmatter and content
 */
function extractImagePaths(content) {
  const images = new Set();

  // Match image paths in frontmatter and content
  const patterns = [
    /featuredImage:\s*["']([^"']+)["']/g,
    /heroImage:\s*["']([^"']+)["']/g,
    /image:\s*["']([^"']+)["']/g,
    /!\[.*?\]\(([^)]+)\)/g,  // Markdown images
    /<img[^>]+src=["']([^"']+)["']/g  // HTML images
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let imagePath = match[1];
      // Only process local paths starting with /images/
      if (imagePath.startsWith('/images/')) {
        // Remove alt text if present (e.g., "/image.jpg "alt text"" -> "/image.jpg")
        imagePath = imagePath.split(/["'\s]/)[0];
        images.add(imagePath);
      }
    }
  });

  return Array.from(images);
}

/**
 * Check if a file exists
 */
async function fileExists(filepath) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Process all markdown files in a directory
 */
async function processDirectory(dirPath) {
  const results = {
    totalFiles: 0,
    totalImages: 0,
    missingImages: [],
    existingImages: []
  };

  try {
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    results.totalFiles = mdFiles.length;

    for (const file of mdFiles) {
      const filepath = path.join(dirPath, file);
      const content = await fs.readFile(filepath, 'utf-8');
      const imagePaths = extractImagePaths(content);

      for (const imagePath of imagePaths) {
        results.totalImages++;
        const publicPath = path.join(__dirname, '..', 'public', imagePath.substring(1));
        const exists = await fileExists(publicPath);

        if (exists) {
          results.existingImages.push({ file, imagePath });
        } else {
          results.missingImages.push({ file, imagePath });
        }
      }
    }
  } catch (error) {
    console.error(`Error processing ${dirPath}:`, error.message);
  }

  return results;
}

/**
 * Main audit function
 */
async function main() {
  console.log('🔍 Starting image audit...\n');

  const allResults = {
    totalFiles: 0,
    totalImages: 0,
    missingImages: [],
    existingImages: []
  };

  // Process each content directory
  for (const dir of CONTENT_DIRS) {
    const fullPath = path.join(__dirname, '..', dir);
    console.log(`📁 Auditing ${dir}...`);

    const results = await processDirectory(fullPath);

    allResults.totalFiles += results.totalFiles;
    allResults.totalImages += results.totalImages;
    allResults.missingImages.push(...results.missingImages);
    allResults.existingImages.push(...results.existingImages);

    console.log(`   Files: ${results.totalFiles}`);
    console.log(`   Images referenced: ${results.totalImages}`);
    console.log(`   Missing: ${results.missingImages.length}`);
    console.log(`   Existing: ${results.existingImages.length}`);
    console.log();
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total content files: ${allResults.totalFiles}`);
  console.log(`Total images referenced: ${allResults.totalImages}`);
  console.log(`Existing images: ${allResults.existingImages.length}`);
  console.log(`Missing images: ${allResults.missingImages.length}`);

  if (allResults.missingImages.length > 0) {
    const percentage = ((allResults.missingImages.length / allResults.totalImages) * 100).toFixed(1);
    console.log(`Missing rate: ${percentage}%`);
  }
  console.log('='.repeat(60));

  // Show sample of missing images
  if (allResults.missingImages.length > 0) {
    console.log('\n⚠️  MISSING IMAGES (first 20):');
    console.log('-'.repeat(60));
    allResults.missingImages.slice(0, 20).forEach(({ file, imagePath }) => {
      console.log(`  ${file}`);
      console.log(`    → ${imagePath}`);
    });

    if (allResults.missingImages.length > 20) {
      console.log(`\n  ... and ${allResults.missingImages.length - 20} more`);
    }
  }

  // Save detailed report
  const reportPath = path.join(__dirname, '../data/image-audit-report.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
}

main().catch(console.error);
