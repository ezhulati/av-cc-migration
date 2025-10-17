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
  'src/content/pages',
  'src/content/accommodation'
];

const PUBLIC_DIR = path.join(__dirname, '../public');

/**
 * Check if a file exists (case-sensitive)
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
 * Find actual file with case-insensitive search
 */
async function findActualFile(imagePath) {
  // Remove leading slash and split path
  const relativePath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  const parts = relativePath.split('/');

  let currentPath = PUBLIC_DIR;
  let actualParts = [];

  for (const part of parts) {
    try {
      const items = await fs.readdir(currentPath);
      // Case-insensitive search
      const actualItem = items.find(item => item.toLowerCase() === part.toLowerCase());

      if (!actualItem) {
        return null;
      }

      actualParts.push(actualItem);
      currentPath = path.join(currentPath, actualItem);
    } catch {
      return null;
    }
  }

  return '/' + actualParts.join('/');
}

/**
 * Extract all image paths from content
 */
function extractImagePaths(content) {
  const images = [];

  const patterns = [
    {
      pattern: /featuredImage:\s*["']?([^"'\n]+)["']?/g,
      type: 'frontmatter',
      field: 'featuredImage'
    },
    {
      pattern: /heroImage:\s*["']?([^"'\n]+)["']?/g,
      type: 'frontmatter',
      field: 'heroImage'
    },
    {
      pattern: /image:\s*["']?([^"'\n]+)["']?/g,
      type: 'frontmatter',
      field: 'image'
    },
    {
      pattern: /!\[.*?\]\(([^)]+)\)/g,
      type: 'markdown'
    },
    {
      pattern: /<img[^>]+src=["']([^"']+)["']/g,
      type: 'html'
    }
  ];

  patterns.forEach(({ pattern, type, field }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      let imagePath = match[1].trim();

      // Remove quotes and alt text
      imagePath = imagePath.split(/["'\s]/)[0];

      // Only process local paths starting with /images/
      if (imagePath.startsWith('/images/')) {
        images.push({
          original: match[0],
          path: imagePath,
          type,
          field
        });
      }
    }
  });

  return images;
}

/**
 * Fix image paths in content
 */
function fixImagePaths(content, fixes) {
  let newContent = content;

  // Sort by length (longest first) to avoid partial replacements
  fixes.sort((a, b) => b.original.length - a.original.length);

  for (const fix of fixes) {
    const replacement = fix.original.replace(fix.oldPath, fix.newPath);
    newContent = newContent.replace(fix.original, replacement);
  }

  return newContent;
}

/**
 * Process a single file
 */
async function processFile(filepath) {
  const content = await fs.readFile(filepath, 'utf-8');
  const images = extractImagePaths(content);

  const fixes = [];
  const errors = [];

  for (const image of images) {
    const publicPath = path.join(PUBLIC_DIR, image.path.substring(1));
    const exists = await fileExists(publicPath);

    if (!exists) {
      // Try to find the actual file with case-insensitive search
      const actualPath = await findActualFile(image.path);

      if (actualPath && actualPath !== image.path) {
        fixes.push({
          original: image.original,
          oldPath: image.path,
          newPath: actualPath,
          type: image.type,
          field: image.field
        });
      } else {
        errors.push({
          path: image.path,
          reason: 'File not found (even with case-insensitive search)'
        });
      }
    }
  }

  return { content, fixes, errors };
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Analyzing image paths for case sensitivity issues...\n');

  const results = {
    filesScanned: 0,
    filesFixed: 0,
    pathsFixed: 0,
    errors: []
  };

  for (const dir of CONTENT_DIRS) {
    const fullPath = path.join(__dirname, '..', dir);

    try {
      const files = await fs.readdir(fullPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      console.log(`📁 Processing ${dir}...`);

      for (const file of mdFiles) {
        const filepath = path.join(fullPath, file);
        results.filesScanned++;

        const { content, fixes, errors } = await processFile(filepath);

        if (fixes.length > 0) {
          const newContent = fixImagePaths(content, fixes);
          await fs.writeFile(filepath, newContent, 'utf-8');

          results.filesFixed++;
          results.pathsFixed += fixes.length;

          console.log(`  ✓ ${file}: Fixed ${fixes.length} path(s)`);
          fixes.forEach(fix => {
            console.log(`    ${fix.oldPath} → ${fix.newPath}`);
          });
        }

        if (errors.length > 0) {
          results.errors.push({ file, errors });
        }
      }

      console.log();
    } catch (error) {
      console.error(`  ✗ Error processing ${dir}:`, error.message);
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files scanned: ${results.filesScanned}`);
  console.log(`Files fixed: ${results.filesFixed}`);
  console.log(`Image paths fixed: ${results.pathsFixed}`);
  console.log(`Files with missing images: ${results.errors.length}`);
  console.log('='.repeat(60));

  if (results.errors.length > 0) {
    console.log('\n⚠️  FILES WITH MISSING IMAGES (first 10):');
    console.log('-'.repeat(60));
    results.errors.slice(0, 10).forEach(({ file, errors }) => {
      console.log(`  ${file}:`);
      errors.forEach(error => {
        console.log(`    ✗ ${error.path} - ${error.reason}`);
      });
    });

    if (results.errors.length > 10) {
      console.log(`\n  ... and ${results.errors.length - 10} more files with errors`);
    }
  }

  if (results.filesFixed > 0) {
    console.log('\n✅ Case sensitivity issues have been fixed!');
    console.log('💡 Run the dev server to verify the changes.');
  } else {
    console.log('\n✅ No case sensitivity issues found!');
  }
}

main().catch(console.error);
