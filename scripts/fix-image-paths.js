import fs from 'fs';
import path from 'path';

console.log('🖼️  Fixing image paths in markdown files...\n');

const mediaInventoryData = JSON.parse(
  fs.readFileSync('data/complete-media-inventory.json', 'utf8')
);

// Create URL to local path mapping
const urlMap = new Map();

// Process all media types (posts, pages, accommodation)
Object.keys(mediaInventoryData).forEach(key => {
  const items = mediaInventoryData[key];
  if (Array.isArray(items)) {
    items.forEach(item => {
      if (item.originalUrl && item.localPath) {
        // Clean URLs (remove query params)
        const cleanUrl = item.originalUrl.split('?')[0];
        urlMap.set(cleanUrl, item.localPath);
        // Also map the full URL with query params
        urlMap.set(item.originalUrl, item.localPath);
      }
    });
  }
});

console.log(`📚 Found ${urlMap.size} image mappings\n`);

function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
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

const contentDirs = [
  'src/content/posts',
  'src/content/pages',
  'src/content/accommodation'
];

let totalFixed = 0;
let totalFiles = 0;

contentDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }

  const files = getAllMarkdownFiles(dirPath);
  console.log(`📁 Processing ${files.length} files in ${dir}...`);

  let dirFixed = 0;

  files.forEach(filePath => {
    totalFiles++;
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix featuredImage in frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      let frontmatter = frontmatterMatch[1];

      // Check if featuredImage is empty or has external URL
      const featuredImageMatch = frontmatter.match(/featuredImage:\s*["']?(https?:\/\/[^"'\n]+)?["']?/);
      if (featuredImageMatch) {
        const externalUrl = featuredImageMatch[1];
        if (externalUrl) {
          const cleanUrl = externalUrl.split('?')[0];
          const localPath = urlMap.get(cleanUrl) || urlMap.get(externalUrl);
          if (localPath) {
            frontmatter = frontmatter.replace(
              /featuredImage:\s*["']?https?:\/\/[^"'\n]+["']?/,
              `featuredImage: "${localPath}"`
            );
            modified = true;
          }
        } else if (featuredImageMatch[0].includes('""') || featuredImageMatch[0].includes("''")) {
          // Try to find a featured image for this post from inventory
          const fileName = path.basename(filePath, '.md');
          let featuredImage = null;

          // Search through all content types
          Object.keys(mediaInventoryData).forEach(key => {
            const items = mediaInventoryData[key];
            if (Array.isArray(items)) {
              const found = items.find(
                item => item.postSlug === fileName && item.type === 'featured'
              );
              if (found) featuredImage = found;
            }
          });

          if (featuredImage && featuredImage.localPath) {
            frontmatter = frontmatter.replace(
              /featuredImage:\s*["']?["']?/,
              `featuredImage: "${featuredImage.localPath}"`
            );
            modified = true;
          }
        }
      }

      if (modified) {
        content = content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
      }
    }

    // Fix inline images in markdown body
    const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
    let matches;
    while ((matches = imageRegex.exec(content)) !== null) {
      const fullMatch = matches[0];
      const altText = matches[1];
      const externalUrl = matches[2];
      const cleanUrl = externalUrl.split('?')[0];

      const localPath = urlMap.get(cleanUrl) || urlMap.get(externalUrl);
      if (localPath) {
        content = content.replace(fullMatch, `![${altText}](${localPath})`);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      dirFixed++;
      totalFixed++;
    }
  });

  console.log(`  ✅ Fixed ${dirFixed} files in ${dir}\n`);
});

console.log(`\n✅ Image path fix complete!`);
console.log(`   Total files processed: ${totalFiles}`);
console.log(`   Files with fixed images: ${totalFixed}`);
console.log(`\n🚀 Images should now display correctly!`);
console.log(`   Run: npm run dev`);
