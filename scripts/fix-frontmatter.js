import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

console.log('🔧 Fixing frontmatter YAML formatting...\n');

// Recursive function to get all .md files
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

let fixed = 0;
let errors = 0;

contentDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);

  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }

  const files = getAllMarkdownFiles(dirPath);
  console.log(`📁 Processing ${files.length} files in ${dir}...`);

  files.forEach(filePath => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');

      // Parse frontmatter
      const parsed = matter(fileContent);

      // Ensure slug exists
      if (!parsed.data.slug) {
        const filename = path.basename(filePath, '.md');
        parsed.data.slug = filename;
        console.log(`  ✓ Added missing slug: ${filename}`);
      }

      // Clean up description - ensure it's a single-line string
      if (parsed.data.description) {
        parsed.data.description = parsed.data.description
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Ensure empty strings are proper empty strings, not undefined
      if (parsed.data.featuredImage === undefined) {
        parsed.data.featuredImage = '';
      }

      // Rebuild the file with proper frontmatter
      const newContent = matter.stringify(parsed.content, parsed.data);

      fs.writeFileSync(filePath, newContent, 'utf8');
      fixed++;

    } catch (err) {
      console.error(`  ❌ Error processing ${filePath}:`, err.message);
      errors++;
    }
  });

  console.log(`  ✅ Fixed ${files.length} files in ${dir}\n`);
});

console.log(`\n✅ Frontmatter fixing complete!`);
console.log(`   Fixed: ${fixed} files`);
console.log(`   Errors: ${errors} files`);

if (errors === 0) {
  console.log(`\n🎉 All files processed successfully!`);
  console.log(`   Run: npm run dev`);
}
