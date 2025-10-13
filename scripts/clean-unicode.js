import fs from 'fs';
import path from 'path';

console.log('🧹 Cleaning Unicode characters from markdown files...\n');

// Unicode character mappings using escape codes
const replacements = [
  // Smart quotes
  ['\u2018', "'"],  // left single quote
  ['\u2019', "'"],  // right single quote
  ['\u201C', '"'],  // left double quote
  ['\u201D', '"'],  // right double quote
  ['\u201E', '"'],  // double low-9 quote
  ['\u201F', '"'],  // double high-reversed-9 quote

  // Dashes
  ['\u2014', '-'],  // em dash
  ['\u2013', '-'],  // en dash
  ['\u2015', '-'],  // horizontal bar

  // Spaces
  ['\u00A0', ' '],  // non-breaking space
  ['\u2002', ' '],  // en space
  ['\u2003', ' '],  // em space
  ['\u2009', ' '],  // thin space
  ['\u200B', ''],   // zero-width space
  ['\u200C', ''],   // zero-width non-joiner
  ['\u200D', ''],   // zero-width joiner
  ['\uFEFF', ''],   // zero-width no-break space

  // Other problematic characters
  ['\u2026', '...'], // ellipsis
  ['\u2032', "'"],   // prime
  ['\u2033', '"'],   // double prime
  ['\u2039', '<'],   // single left angle quote
  ['\u203A', '>'],   // single right angle quote
  ['\u00AB', '"'],   // left-pointing double angle quote
  ['\u00BB', '"'],   // right-pointing double angle quote
];

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

function cleanUnicode(text) {
  let cleaned = text;

  // Apply all replacements
  for (const [unicode, replacement] of replacements) {
    cleaned = cleaned.split(unicode).join(replacement);
  }

  return cleaned;
}

const contentDirs = [
  'src/content/posts',
  'src/content/pages',
  'src/content/accommodation'
];

let totalCleaned = 0;
let totalChanges = 0;
let errors = 0;

contentDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);

  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }

  const files = getAllMarkdownFiles(dirPath);
  console.log(`📁 Processing ${files.length} files in ${dir}...`);

  let dirCleaned = 0;
  let dirChanges = 0;

  files.forEach((filePath, index) => {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      const cleanedContent = cleanUnicode(originalContent);

      if (originalContent !== cleanedContent) {
        fs.writeFileSync(filePath, cleanedContent, 'utf8');
        dirCleaned++;

        // Count how many characters changed
        const changes = originalContent.length - cleanedContent.length +
                       (cleanedContent.match(/['"]/g) || []).length;
        dirChanges += changes;
      }

      // Progress indicator every 500 files
      if ((index + 1) % 500 === 0) {
        console.log(`  ✓ Processed ${index + 1}/${files.length} files...`);
      }

    } catch (err) {
      console.error(`  ❌ Error: ${path.basename(filePath)} - ${err.message}`);
      errors++;
    }
  });

  totalCleaned += dirCleaned;
  totalChanges += dirChanges;

  console.log(`  ✅ Cleaned ${dirCleaned} files with ${dirChanges} character replacements\n`);
});

console.log(`\n✅ Unicode cleaning complete!`);
console.log(`   Total files processed: ${totalCleaned}`);
console.log(`   Total character replacements: ${totalChanges}`);
console.log(`   Errors: ${errors}`);

if (errors === 0 && totalCleaned > 0) {
  console.log(`\n🎉 All Unicode characters cleaned!`);
  console.log(`   Try running: npm run dev`);
} else if (totalCleaned === 0) {
  console.log(`\n✨ No Unicode issues found - files were already clean!`);
  console.log(`   The YAML parsing error may be caused by something else.`);
}
