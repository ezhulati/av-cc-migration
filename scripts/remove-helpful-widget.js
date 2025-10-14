#!/usr/bin/env node

/**
 * Remove "Was this helpful?" widget from all markdown files
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

function removeHelpfulWidget(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if file contains the widget
    if (!content.includes('Was this helpful?')) {
      return;
    }

    // Remove everything from "Was this helpful?" onwards
    let newContent = content;

    // Pattern 1: Starts with "#### Was this helpful?" and ends with the CSS block
    const widgetPattern = /#### Was this helpful\?[\s\S]*?\.hlpful-submit-button\{border:2px solid #1e73be\}/g;
    newContent = newContent.replace(widgetPattern, '');

    // Pattern 2: Without markdown header
    const altPattern = /Was this helpful\?[\s\S]*?\.hlpful-submit-button\{border:2px solid #1e73be\}/g;
    newContent = newContent.replace(altPattern, '');

    // Pattern 3: Simpler version without CSS (just the form)
    const simplePattern = /#### Was this helpful\?[\s\S]*?Please Help us\./g;
    newContent = newContent.replace(simplePattern, '');

    // Pattern 4: Just the text without header
    const textPattern = /Was this helpful\?[\s\S]*?Please Help us\./g;
    newContent = newContent.replace(textPattern, '');

    // Clean up any extra blank lines at the end
    newContent = newContent.replace(/\n{3,}$/, '\n');

    // Only write if content changed
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✓ Removed widget from: ${path.basename(filePath)}`);
      fixedCount++;
    }

  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
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
      removeHelpfulWidget(filePath);
    }
  }
}

console.log('🧹 Removing "Was this helpful?" widgets from all content...\n');

for (const dir of contentDirs) {
  processDirectory(dir);
}

console.log(`\n✅ Complete! Removed widget from ${fixedCount} files, ${errorCount} errors`);
