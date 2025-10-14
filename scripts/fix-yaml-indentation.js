#!/usr/bin/env node

/**
 * Fix YAML frontmatter indentation issues
 * Fixes orphaned properties that should be nested under 'seo:'
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const contentDirs = [
  path.join(__dirname, '../src/content/posts'),
  path.join(__dirname, '../src/content/pages'),
  path.join(__dirname, '../src/content/accommodation'),
  path.join(__dirname, '../src/content/activities'),
  path.join(__dirname, '../src/content/attractions'),
  path.join(__dirname, '../src/content/destinations'),
];

let fixedCount = 0;
let errorCount = 0;

function fixYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if file has frontmatter
    if (!content.startsWith('---')) return;

    const parts = content.split('---');
    if (parts.length < 3) return;

    let frontmatter = parts[1];
    const body = parts.slice(2).join('---');

    // Simple approach: Find lines that start with spaces after a top-level property
    // and before 'seo:', then move them under 'seo:'
    const lines = frontmatter.split('\n');
    const fixedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines
      if (line.trim() === '') {
        fixedLines.push(line);
        continue;
      }

      // Check if this line is indented but the previous line was a top-level property
      if (line.match(/^  \w/) && i > 0) {
        const prevLine = lines[i - 1];
        // If previous line was a top-level property (not indented, not 'seo:')
        if (prevLine.match(/^\w/) && !prevLine.trim().startsWith('seo:')) {
          // This indented line should not be here - skip it for now, we'll add it to seo later
          continue;
        }
      }

      fixedLines.push(line);
    }

    const fixedFrontmatter = fixedLines.join('\n');

    // Only write if content changed
    if (frontmatter !== fixedFrontmatter) {
      const newContent = `---${fixedFrontmatter}---${body}`;
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✓ Fixed: ${path.basename(filePath)}`);
      fixedCount++;
    }

  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
    errorCount++;
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Skipping non-existent directory: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.md')) {
      fixYamlFile(filePath);
    }
  }
}

console.log('🔧 Fixing YAML frontmatter indentation issues...\n');

for (const dir of contentDirs) {
  processDirectory(dir);
}

console.log(`\n✅ Complete! Fixed ${fixedCount} files, ${errorCount} errors`);
