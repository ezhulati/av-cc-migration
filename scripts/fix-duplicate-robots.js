const fs = require('fs');
const path = require('path');
const glob = require('glob');

let fixedCount = 0;

function fixDuplicateRobots(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if file has frontmatter with seo section
    if (!content.includes('seo:') || !content.includes('robots:')) {
      return;
    }

    // Split into lines for easier processing
    const lines = content.split('\n');
    const newLines = [];
    let inSeoSection = false;
    let foundFirstRobots = false;
    let skipNextLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (skipNextLine) {
        skipNextLine = false;
        continue;
      }

      // Track when we enter/exit seo section
      if (line.match(/^seo:\s*$/)) {
        inSeoSection = true;
        foundFirstRobots = false;
        newLines.push(line);
        continue;
      }

      // Exit seo section when we hit non-indented line or ---
      if (inSeoSection && (line.match(/^[a-zA-Z]/) || line.match(/^---/))) {
        inSeoSection = false;
        foundFirstRobots = false;
      }

      // If we're in seo section and find robots field
      if (inSeoSection && line.match(/^\s+robots:/)) {
        if (!foundFirstRobots) {
          // Keep the first occurrence
          foundFirstRobots = true;
          newLines.push(line);
        } else {
          // Skip duplicate robots field
          console.log(`  Removing duplicate robots from: ${path.basename(filePath)}`);
          fixedCount++;
          continue;
        }
      } else {
        newLines.push(line);
      }
    }

    const newContent = newLines.join('\n');

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✓ Fixed: ${path.basename(filePath)}`);
    }

  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
}

// Process all markdown files in posts directory
const postsDir = path.join(__dirname, '../src/content/posts');
const files = glob.sync(`${postsDir}/*.md`);

console.log(`\nFound ${files.length} post files\n`);

files.forEach(file => {
  fixDuplicateRobots(file);
});

console.log(`\n✅ Fixed ${fixedCount} duplicate robots fields\n`);
