import fs from 'fs';
import path from 'path';

console.log('🔧 Fixing malformed quote patterns in descriptions...\n');

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
let total = 0;

contentDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }

  const files = getAllMarkdownFiles(dirPath);
  console.log(`📁 Processing ${files.length} files in ${dir}...`);

  files.forEach((filePath, index) => {
    total++;
    try {
      let content = fs.readFileSync(filePath, 'utf8');

      if (!content.startsWith('---')) return;

      const parts = content.split('---');
      if (parts.length < 3) return;

      let frontmatter = parts[1];
      const body = parts.slice(2).join('---');

      // Match descriptions with malformed patterns like ..."s or ..."re or ..."m
      const malformedMatch = frontmatter.match(/description:\s*"([^"]*\.\.\.")([a-z]+)/);

      if (malformedMatch) {
        const fullDescription = malformedMatch[1] + malformedMatch[2];

        // Try to find complete sentence in body
        const bodyText = body.trim().split('\n').filter(line => line.trim() && !line.startsWith('#')).join(' ');

        // Extract first sentence or first 150 chars
        let newDescription = '';
        const firstSentence = bodyText.match(/^[^.!?]+[.!?]/);
        if (firstSentence) {
          newDescription = firstSentence[0].trim();
        } else {
          // Take first 150 chars and add ellipsis
          newDescription = bodyText.substring(0, 150).trim();
          if (newDescription.length === 150) {
            newDescription = newDescription.substring(0, newDescription.lastIndexOf(' ')) + '...';
          }
        }

        // Clean markdown
        newDescription = newDescription.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        newDescription = newDescription.replace(/\*\*([^*]+)\*\*/g, '$1');
        newDescription = newDescription.replace(/\*([^*]+)\*/g, '$1');

        // Replace in frontmatter
        frontmatter = frontmatter.replace(
          /description:\s*"[^"]*\.\.\."[a-z]+/,
          `description: "${newDescription}"`
        );

        const newContent = `---${frontmatter}---${body}`;
        fs.writeFileSync(filePath, newContent, 'utf8');
        fixed++;
      }

      if ((index + 1) % 1000 === 0) {
        console.log(`  ✓ Processed ${index + 1}/${files.length}...`);
      }
    } catch (err) {
      console.log(`  ⚠️  Error in ${path.basename(filePath)}: ${err.message}`);
    }
  });

  console.log(`  ✅ Completed ${dir}\n`);
});

console.log(`\n✅ Malformed quote fix complete!`);
console.log(`   Total files: ${total}`);
console.log(`   Fixed: ${fixed}`);
console.log(`\n🎉 Run: npm run dev`);
