import fs from 'fs';
import path from 'path';

console.log('🔧 Fixing YAML frontmatter spacing issues...\n');

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

  files.forEach((filePath, index) => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');

      // Check if file starts with frontmatter
      if (!content.startsWith('---')) {
        return;
      }

      // Split into frontmatter and body
      const parts = content.split('---');
      if (parts.length < 3) {
        return;
      }

      let frontmatter = parts[1];
      const body = parts.slice(2).join('---');

      // Remove any blank lines within the frontmatter
      frontmatter = frontmatter
        .split('\n')
        .filter(line => line.trim() !== '')
        .join('\n');

      // Ensure it ends with a newline
      if (!frontmatter.endsWith('\n')) {
        frontmatter += '\n';
      }

      // Rebuild file
      const newContent = `---\n${frontmatter}---${body}`;

      if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        fixed++;
      }

      // Progress indicator every 1000 files
      if ((index + 1) % 1000 === 0) {
        console.log(`  ✓ Processed ${index + 1}/${files.length} files...`);
      }

    } catch (err) {
      console.error(`  ❌ Error: ${path.basename(filePath)} - ${err.message}`);
      errors++;
    }
  });

  console.log(`  ✅ Processed ${files.length} files\n`);
});

console.log(`\n✅ YAML spacing fix complete!`);
console.log(`   Fixed: ${fixed} files`);
console.log(`   Errors: ${errors} files`);

if (errors === 0) {
  console.log(`\n🎉 Try running: npm run dev`);
}
