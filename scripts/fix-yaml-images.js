import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');

/**
 * Fix YAML frontmatter images arrays by removing improperly formatted alt text
 *
 * BAD:  - "/images/destinations/Himare.jpeg "Himare""
 * GOOD: - "/images/destinations/Himare.jpeg"
 */
async function fixYAMLImages() {
  const collections = ['destinations', 'accommodation', 'attractions', 'activities', 'posts', 'pages'];
  let totalFixed = 0;
  let filesModified = 0;

  for (const collection of collections) {
    const collectionPath = path.join(CONTENT_DIR, collection);

    try {
      const files = await fs.readdir(collectionPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      for (const file of mdFiles) {
        const filePath = path.join(collectionPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        // Check if file has YAML frontmatter
        if (!content.startsWith('---')) continue;

        const lines = content.split('\n');
        let modified = false;
        let fixedCount = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Match lines like:  - "/path/to/image.jpg "Alt Text""
          // Pattern: - "PATH "ALT""
          // The entire thing is ONE quoted string containing the path, space, and alt text
          const imageLinePattern = /^(\s*-\s+)"([^"]+)\s+"([^"]+)""$/;
          const match = line.match(imageLinePattern);

          if (match) {
            const indent = match[1]; // "  - "
            const imagePath = match[2]; // "/images/destinations/Himare.jpeg"
            // match[3] is the alt text we're removing

            // Replace with just the image path
            lines[i] = `${indent}"${imagePath}"`;
            modified = true;
            fixedCount++;

            console.log(`  Fixed: ${file} (line ${i + 1})`);
            console.log(`    Before: ${line}`);
            console.log(`    After:  ${lines[i]}`);
          }
        }

        if (modified) {
          const newContent = lines.join('\n');
          await fs.writeFile(filePath, newContent, 'utf-8');
          filesModified++;
          totalFixed += fixedCount;
          console.log(`✓ Modified ${file} (${fixedCount} lines fixed)\n`);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`Error processing ${collection}:`, error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`YAML Images Fix Complete`);
  console.log('='.repeat(60));
  console.log(`Files modified: ${filesModified}`);
  console.log(`Total lines fixed: ${totalFixed}`);
  console.log('='.repeat(60));
}

// Run the script
fixYAMLImages().catch(console.error);
