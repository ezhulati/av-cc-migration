import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let fixCount = 0;

// Function to fix markdown image syntax with embedded alt text
function fixMarkdownImages(content, filePath) {
  let fixed = content;
  let fileChanged = false;

  // Pattern: ![alt](/path/to/image.jpg "Description with spaces")
  // Should be: ![Description with spaces](/path/to/image.jpg)
  const pattern = /!\[([^\]]*)\]\(([^)"\s]+)\s+"([^"]+)"\)/g;

  fixed = fixed.replace(pattern, (match, alt, imagePath, description) => {
    fileChanged = true;
    // Use description as alt text if alt is empty
    const newAlt = alt || description;
    return `![${newAlt}](${imagePath})`;
  });

  // Pattern: Markdown images with space + description but no quotes
  // ![alt](/path/to/image.jpg Description)
  // This is less common but happens
  const pattern2 = /!\[([^\]]*)\]\(([^\s)]+)\s+([^)]+)\)/g;

  fixed = fixed.replace(pattern2, (match, alt, imagePath, description) => {
    // Only fix if description doesn't look like a URL
    if (!description.startsWith('http') && !description.startsWith('/')) {
      fileChanged = true;
      const newAlt = alt || description;
      return `![${newAlt}](${imagePath})`;
    }
    return match;
  });

  return { fixed, changed: fileChanged };
}

// Get all markdown files
function getAllMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  console.log('🔧 MARKDOWN IMAGE PATH FIXER');
  console.log('='.repeat(80) + '\n');

  if (dryRun) {
    console.log('ℹ️  Running in DRY RUN mode. Use --apply to make actual changes.\n');
  } else {
    console.log('⚠️  APPLYING CHANGES to files!\n');
  }

  const contentDir = path.join(projectRoot, 'src', 'content');
  const markdownFiles = getAllMarkdownFiles(contentDir);

  console.log(`📄 Processing ${markdownFiles.length} markdown files...\n`);

  markdownFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { fixed, changed } = fixMarkdownImages(content, filePath);

    if (changed) {
      fixCount++;
      const relPath = path.relative(projectRoot, filePath);

      if (dryRun) {
        console.log(`   🔍 Would fix: ${relPath}`);
      } else {
        fs.writeFileSync(filePath, fixed, 'utf-8');
        console.log(`   ✅ Fixed: ${relPath}`);
      }
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`✅ ${fixCount} files ${dryRun ? 'would be' : 'were'} fixed`);

  if (dryRun) {
    console.log('\nTo apply fixes, run: node scripts/fix-markdown-image-paths.js --apply');
  }

  console.log('='.repeat(80) + '\n');
}

main();
