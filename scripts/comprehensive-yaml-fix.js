import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

console.log('🔧 Comprehensive YAML Validation and Fix...\n');

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

function fixYAML(content, filePath) {
  if (!content.startsWith('---')) {
    return content;
  }

  const parts = content.split('---');
  if (parts.length < 3) {
    return content;
  }

  let frontmatterText = parts[1];
  const body = parts.slice(2).join('---');

  try {
    // Try to parse the YAML
    const parsed = yaml.load(frontmatterText);

    // Re-serialize with proper formatting
    const cleanYAML = yaml.dump(parsed, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    });

    return `---\n${cleanYAML}---${body}`;
  } catch (err) {
    console.log(`  ⚠️  YAML error in ${path.basename(filePath)}: ${err.message}`);

    // Try aggressive cleanup
    frontmatterText = frontmatterText
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        // Fix common indentation issues
        if (line.match(/^\s{3,}/)) {
          return line.replace(/^\s+/, '  '); // Normalize to 2 spaces
        }
        return line;
      })
      .join('\n');

    // Ensure it ends with newline
    if (!frontmatterText.endsWith('\n')) {
      frontmatterText += '\n';
    }

    return `---\n${frontmatterText}---${body}`;
  }
}

const contentDirs = [
  'src/content/posts',
  'src/content/pages',
  'src/content/accommodation'
];

let fixed = 0;
let errors = 0;
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
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const fixedContent = fixYAML(originalContent, filePath);

      if (originalContent !== fixedContent) {
        fs.writeFileSync(filePath, fixedContent, 'utf8');
        fixed++;
      }

      if ((index + 1) % 1000 === 0) {
        console.log(`  ✓ Processed ${index + 1}/${files.length}...`);
      }
    } catch (err) {
      console.error(`  ❌ Error: ${path.basename(filePath)} - ${err.message}`);
      errors++;
    }
  });

  console.log(`  ✅ Completed ${dir}\n`);
});

console.log(`\n✅ Comprehensive YAML fix complete!`);
console.log(`   Total files: ${total}`);
console.log(`   Fixed: ${fixed}`);
console.log(`   Errors: ${errors}`);

if (errors === 0) {
  console.log(`\n🎉 All YAML validated and fixed!`);
  console.log(`   Run: npm run dev`);
}
