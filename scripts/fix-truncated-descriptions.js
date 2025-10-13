import fs from 'fs';
import path from 'path';

console.log('🔧 Fixing truncated descriptions...\n');

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

function isTruncated(description) {
  // Check if description looks truncated
  const trimmed = description.trim();

  // Ends with incomplete word or sentence
  if (trimmed.endsWith("'") && !trimmed.includes("' ")) return true;
  if (trimmed.match(/[a-z]'$/)) return true; // ends with possessive
  if (!trimmed.match(/[.!?]$/)) return true; // doesn't end with punctuation
  if (trimmed.split(' ').pop().length < 3) return true; // last word too short

  return false;
}

function cleanDescription(description) {
  let cleaned = description.trim();

  // If truncated, find last complete sentence
  const sentences = cleaned.split(/([.!?]+\s+)/);
  let result = '';

  for (let i = 0; i < sentences.length; i++) {
    const part = sentences[i];
    if (part.match(/[.!?]+\s*$/)) {
      result += part;
      // Check if we have enough content (at least 50 chars)
      if (result.length >= 50) {
        break;
      }
    } else {
      result += part;
    }
  }

  // Clean up
  result = result.trim();

  // If still too short or looks bad, use first sentence only
  if (result.length < 50 || !result.match(/[.!?]$/)) {
    const firstSentence = cleaned.match(/^[^.!?]+[.!?]/);
    result = firstSentence ? firstSentence[0] : cleaned.substring(0, 150).trim() + '...';
  }

  // Remove markdown links and bold
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
  result = result.replace(/\*([^*]+)\*/g, '$1');

  return result;
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

      // Extract description
      const descMatch = frontmatter.match(/description:\s*["']([^"']+)["']/);
      if (!descMatch) return;

      const description = descMatch[1];

      // Check if truncated
      if (isTruncated(description)) {
        const cleaned = cleanDescription(description);
        frontmatter = frontmatter.replace(
          /description:\s*["'][^"']+["']/,
          `description: "${cleaned}"`
        );

        const newContent = `---${frontmatter}---${body}`;
        fs.writeFileSync(filePath, newContent, 'utf8');
        fixed++;
      }

      if ((index + 1) % 1000 === 0) {
        console.log(`  ✓ Processed ${index + 1}/${files.length}...`);
      }
    } catch (err) {
      // Silent fail, move on
    }
  });

  console.log(`  ✅ Completed ${dir}\n`);
});

console.log(`\n✅ Truncation fix complete!`);
console.log(`   Total files: ${total}`);
console.log(`   Fixed: ${fixed}`);
console.log(`\n🎉 Run: npm run dev`);
