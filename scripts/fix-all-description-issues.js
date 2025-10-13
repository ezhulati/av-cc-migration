import fs from 'fs';
import path from 'path';

console.log('🔧 Fixing ALL description issues comprehensively...\n');

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

function extractCleanDescription(bodyText) {
  // Get first meaningful sentence from body
  const lines = bodyText.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('![');
  });

  const text = lines.join(' ').trim();

  // Find first complete sentence
  const firstSentence = text.match(/^[^.!?]+[.!?]/);
  if (firstSentence) {
    let desc = firstSentence[0].trim();
    // Add second sentence if first is too short
    if (desc.length < 100) {
      const remaining = text.substring(desc.length).trim();
      const secondSentence = remaining.match(/^[^.!?]+[.!?]/);
      if (secondSentence) {
        desc += ' ' + secondSentence[0].trim();
      }
    }
    return desc;
  }

  // Fallback: take first 150 chars
  let desc = text.substring(0, 150).trim();
  if (desc.length === 150) {
    desc = desc.substring(0, desc.lastIndexOf(' ')) + '...';
  }
  return desc;
}

function cleanDescription(desc) {
  // Remove markdown links
  desc = desc.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove bold
  desc = desc.replace(/\*\*([^*]+)\*\*/g, '$1');
  // Remove italic
  desc = desc.replace(/\*([^*]+)\*/g, '$1');
  // Remove any remaining brackets with attributes
  desc = desc.replace(/\{[^}]+\}/g, '');
  return desc.trim();
}

const contentDirs = [
  'src/content/posts',
  'src/content/pages',
  'src/content/accommodation'
];

let fixed = 0;
let total = 0;
const issues = [];

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

      // Extract current description - look for the full line including any text after quotes
      const descLineMatch = frontmatter.match(/description:\s*"([^"]*)".*/);
      if (!descLineMatch) return;

      const descMatch = frontmatter.match(/description:\s*"([^"]*)"/);
      if (!descMatch) return;

      const currentDesc = descMatch[1];
      const fullDescLine = descLineMatch[0];
      let needsFix = false;
      let reason = '';

      // Check if there's text after the closing quote (malformed)
      if (fullDescLine.match(/description:\s*"[^"]*"[a-z]/i)) {
        needsFix = true;
        reason = 'text after closing quote';
      }

      // Check for various issues
      if (currentDesc.includes('..."')) {
        needsFix = true;
        reason = 'malformed ellipsis quote';
      } else if (currentDesc.split('"').length > 1) {
        // Has embedded quotes beyond the wrapping ones
        needsFix = true;
        reason = 'embedded quotes';
      } else if (!currentDesc.match(/[.!?]$/)) {
        needsFix = true;
        reason = 'missing ending punctuation';
      } else if (currentDesc.length < 30) {
        needsFix = true;
        reason = 'too short';
      } else if (currentDesc.includes('  ')) {
        // Double spaces can indicate malformation
        needsFix = true;
        reason = 'malformed spacing';
      }

      if (needsFix) {
        const bodyText = body.trim();
        let newDesc = extractCleanDescription(bodyText);
        newDesc = cleanDescription(newDesc);

        // Final validation
        if (newDesc.length < 30) {
          // Use title as fallback
          const titleMatch = frontmatter.match(/title:\s*(.+)/);
          if (titleMatch) {
            newDesc = `Learn about ${titleMatch[1].trim()}.`;
          }
        }

        // Escape any quotes in the new description
        newDesc = newDesc.replace(/"/g, '\\"');

        frontmatter = frontmatter.replace(
          /description:\s*"[^"]*"/,
          `description: "${newDesc}"`
        );

        const newContent = `---${frontmatter}---${body}`;
        fs.writeFileSync(filePath, newContent, 'utf8');
        fixed++;
        issues.push({ file: path.basename(filePath), reason, newDesc: newDesc.substring(0, 50) });
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

console.log(`\n✅ Comprehensive description fix complete!`);
console.log(`   Total files: ${total}`);
console.log(`   Fixed: ${fixed}`);

if (issues.length > 0 && issues.length <= 20) {
  console.log(`\n📝 Fixed issues:`);
  issues.forEach(issue => {
    console.log(`   ${issue.file}: ${issue.reason} -> ${issue.newDesc}...`);
  });
}

console.log(`\n🎉 Run: npm run dev`);
