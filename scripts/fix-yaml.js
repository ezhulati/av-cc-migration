import fs from 'fs';
import path from 'path';

console.log('🔧 Fixing YAML frontmatter in markdown files...\n');

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
      let content = fs.readFileSync(filePath, 'utf8');

      // Check if file starts with frontmatter
      if (!content.startsWith('---')) {
        console.log(`  ⚠️  No frontmatter: ${path.basename(filePath)}`);
        return;
      }

      // Split into frontmatter and body
      const parts = content.split('---');
      if (parts.length < 3) {
        console.log(`  ⚠️  Invalid frontmatter: ${path.basename(filePath)}`);
        return;
      }

      let frontmatter = parts[1];
      const body = parts.slice(2).join('---');

      // Fix multi-line descriptions
      frontmatter = frontmatter.replace(/description:\s*\|-?\n([\s\S]*?)(?=\n\w+:|$)/g, (match, desc) => {
        const cleaned = desc.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
        return `description: "${cleaned.replace(/"/g, '\\"')}"\n`;
      });

      // Fix empty featuredImage if missing
      if (!frontmatter.includes('featuredImage:')) {
        const filename = path.basename(filePath, '.md');
        frontmatter += `\nslug: ${filename}`;
      }

      // Ensure slug exists
      if (!frontmatter.includes('slug:')) {
        const filename = path.basename(filePath, '.md');
        frontmatter += `\nslug: ${filename}`;
      }

      // Rebuild file
      const newContent = `---${frontmatter}---${body}`;
      fs.writeFileSync(filePath, newContent, 'utf8');
      fixed++;

    } catch (err) {
      console.error(`  ❌ Error: ${path.basename(filePath)} - ${err.message}`);
      errors++;
    }
  });

  console.log(`  ✅ Processed ${files.length} files\n`);
});

console.log(`\n✅ Frontmatter fixing complete!`);
console.log(`   Fixed: ${fixed} files`);
console.log(`   Errors: ${errors} files`);

if (errors === 0) {
  console.log(`\n🎉 Try running: npm run dev`);
}
