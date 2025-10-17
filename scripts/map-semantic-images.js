import fs from 'fs';
import path from 'path';

console.log('🔗 Mapping semantic image names to actual downloaded files...\n');

// Content type directories to process
const contentDirs = [
  { content: 'src/content/destinations', images: 'public/images/destinations' },
  { content: 'src/content/activities', images: 'public/images/activities' },
  { content: 'src/content/attractions', images: 'public/images/attractions' }
];

/**
 * Extract keywords from a filename for fuzzy matching
 */
function extractKeywords(filename) {
  return filename
    .toLowerCase()
    .replace(/\.(jpg|jpeg|png|webp|gif)$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/adobestock/g, '')
    .replace(/\d+/g, '') // Remove numbers
    .split(/\s+/)
    .filter(word => word.length > 2) // Only words > 2 chars
    .filter(word => !['the', 'and', 'for', 'with', 'from'].includes(word));
}

/**
 * Calculate similarity score between two filenames
 */
function calculateSimilarity(semanticName, actualFile) {
  const semanticKeywords = extractKeywords(semanticName);
  const actualKeywords = extractKeywords(actualFile);

  if (semanticKeywords.length === 0 || actualKeywords.length === 0) {
    return 0;
  }

  let matches = 0;
  for (const keyword of semanticKeywords) {
    for (const actual of actualKeywords) {
      if (actual.includes(keyword) || keyword.includes(actual)) {
        matches++;
      }
    }
  }

  return matches / Math.max(semanticKeywords.length, actualKeywords.length);
}

/**
 * Find best matching actual file for a semantic filename
 */
function findBestMatch(semanticName, availableFiles) {
  let bestMatch = null;
  let bestScore = 0;

  for (const file of availableFiles) {
    const score = calculateSimilarity(semanticName, file);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = file;
    }
  }

  // Lower threshold for better matching, and also try first file if nothing matches
  if (bestScore > 0.2) return bestMatch;
  // If no good match, try to match by collection type (e.g., any destination image for a destination)
  if (availableFiles.length > 0 && bestScore > 0.1) return bestMatch;
  return null;
}

/**
 * Get all markdown files in a directory
 */
function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;

  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllMarkdownFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.md')) {
      arrayOfFiles.push(filePath);
    }
  });
  return arrayOfFiles;
}

let totalUpdated = 0;
let totalUnmatched = 0;
const unmatchedList = [];

// Process each content type
contentDirs.forEach(({ content, images }) => {
  console.log(`\n📁 Processing ${content}...`);

  const contentPath = path.join(process.cwd(), content);
  const imagesPath = path.join(process.cwd(), images);

  if (!fs.existsSync(contentPath)) {
    console.log(`  ⚠️  Content directory not found: ${content}`);
    return;
  }

  if (!fs.existsSync(imagesPath)) {
    console.log(`  ⚠️  Images directory not found: ${images}`);
    return;
  }

  // Get all available image files
  const availableFiles = fs.readdirSync(imagesPath)
    .filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));

  console.log(`  📷 Found ${availableFiles.length} image files`);

  // Get all markdown files
  const markdownFiles = getAllMarkdownFiles(contentPath);
  console.log(`  📄 Found ${markdownFiles.length} markdown files`);

  let dirUpdated = 0;
  let dirUnmatched = 0;

  // Process each markdown file
  markdownFiles.forEach(mdFile => {
    let content = fs.readFileSync(mdFile, 'utf8');
    const originalContent = content;

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return;

    let frontmatter = frontmatterMatch[1];

    // Check for featuredImage
    const featuredImageMatch = frontmatter.match(/featuredImage:\s*"?([^"\n]+)"?/);
    if (!featuredImageMatch) return;

    const featuredImagePath = featuredImageMatch[1].trim();

    // Skip if empty or already points to an existing file
    if (!featuredImagePath || featuredImagePath === '""' || featuredImagePath === "''") {
      return;
    }

    // Extract just the filename from the path
    const semanticFilename = path.basename(featuredImagePath);

    // Check if file already exists
    const fullPath = path.join(process.cwd(), 'public', featuredImagePath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      return; // File exists, no need to update
    }

    // Find best matching actual file
    const bestMatch = findBestMatch(semanticFilename, availableFiles);

    if (bestMatch) {
      // Update the path in frontmatter
      const imageDir = path.dirname(featuredImagePath);
      const newPath = `${imageDir}/${bestMatch}`;

      frontmatter = frontmatter.replace(
        /featuredImage:\s*"?[^"\n]+"?/,
        `featuredImage: "${newPath}"`
      );

      content = content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);

      if (content !== originalContent) {
        fs.writeFileSync(mdFile, content, 'utf8');
        dirUpdated++;
        totalUpdated++;
      }
    } else {
      dirUnmatched++;
      totalUnmatched++;
      unmatchedList.push({
        file: path.basename(mdFile, '.md'),
        semantic: semanticFilename,
        path: featuredImagePath
      });
    }
  });

  console.log(`  ✅ Updated ${dirUpdated} files`);
  if (dirUnmatched > 0) {
    console.log(`  ⚠️  ${dirUnmatched} unmatched images`);
  }
});

console.log(`\n✅ Image mapping complete!`);
console.log(`   Total files updated: ${totalUpdated}`);
console.log(`   Total unmatched: ${totalUnmatched}`);

if (unmatchedList.length > 0) {
  console.log(`\n⚠️  Unmatched images:`);
  unmatchedList.slice(0, 20).forEach(({ file, semantic }) => {
    console.log(`   - ${file}: ${semantic}`);
  });
  if (unmatchedList.length > 20) {
    console.log(`   ... and ${unmatchedList.length - 20} more`);
  }

  // Save full unmatched list
  fs.writeFileSync(
    'data/unmatched-images.json',
    JSON.stringify(unmatchedList, null, 2),
    'utf8'
  );
  console.log(`\n📄 Full list saved to data/unmatched-images.json`);
}

console.log(`\n🚀 Run 'npm run dev' to see the updated images!`);
