#!/usr/bin/env node
/**
 * Verify and fix broken image references across all content types
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const contentTypes = ['attractions', 'activities', 'destinations'];

const stats = {
  total: 0,
  working: 0,
  broken: 0,
  fixed: 0,
  errors: []
};

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = match[1];
  const body = content.slice(match[0].length);

  return { frontmatter, body, fullMatch: match[0] };
}

function findAvailableImages(contentType) {
  const imagesDir = path.join(projectRoot, 'public', 'images', contentType);
  if (!fs.existsSync(imagesDir)) return [];

  const files = fs.readdirSync(imagesDir);
  return files.filter(f => f.match(/\.(jpg|jpeg|png|webp)$/i));
}

function findBestMatch(brokenPath, availableImages) {
  // Extract filename from broken path
  const brokenFilename = path.basename(brokenPath, path.extname(brokenPath));

  // Try exact match first
  for (const img of availableImages) {
    const imgBasename = path.basename(img, path.extname(img));
    if (imgBasename === brokenFilename) {
      return img;
    }
  }

  // Try case-insensitive match
  const brokenLower = brokenFilename.toLowerCase();
  for (const img of availableImages) {
    const imgBasename = path.basename(img, path.extname(img));
    if (imgBasename.toLowerCase() === brokenLower) {
      return img;
    }
  }

  // Try partial match
  for (const img of availableImages) {
    const imgBasename = path.basename(img, path.extname(img));
    if (imgBasename.toLowerCase().includes(brokenLower) ||
        brokenLower.includes(imgBasename.toLowerCase())) {
      return img;
    }
  }

  return null;
}

function processContentType(contentType) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Processing ${contentType}...`);
  console.log('='.repeat(80));

  const contentDir = path.join(projectRoot, 'src', 'content', contentType);
  const availableImages = findAvailableImages(contentType);

  console.log(`Available images: ${availableImages.length}`);

  if (!fs.existsSync(contentDir)) {
    console.log(`❌ Directory not found: ${contentDir}`);
    return;
  }

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
  console.log(`Content files: ${files.length}\n`);

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = extractFrontmatter(content);

    if (!parsed) continue;

    stats.total++;

    // Extract featuredImage
    const imageMatch = parsed.frontmatter.match(/featuredImage:\s*(.+)/);
    if (!imageMatch) continue;

    let imagePath = imageMatch[1].trim().replace(/['"]/g, '');

    // Skip external URLs
    if (imagePath.startsWith('http')) continue;

    // Check if image exists
    const fullImagePath = path.join(projectRoot, 'public', imagePath);

    if (fs.existsSync(fullImagePath)) {
      stats.working++;
      console.log(`✅ ${file}: ${imagePath}`);
    } else {
      stats.broken++;
      console.log(`❌ ${file}: ${imagePath} (missing)`);

      // Try to find a replacement
      const bestMatch = findBestMatch(imagePath, availableImages);
      if (bestMatch) {
        const newPath = `/images/${contentType}/${bestMatch}`;
        console.log(`   → Found match: ${newPath}`);

        // Update the file
        const updatedFrontmatter = parsed.frontmatter.replace(
          /featuredImage:\s*.+/,
          `featuredImage: ${newPath}`
        );

        const updatedContent = `---\n${updatedFrontmatter}\n---${parsed.body}`;
        fs.writeFileSync(filePath, updatedContent);

        stats.fixed++;
        console.log(`   ✓ Fixed!`);
      } else {
        console.log(`   ⚠️  No match found`);
        stats.errors.push({ file, imagePath });
      }
    }
  }
}

console.log('🖼️  Image Verification and Fixer');
console.log('='.repeat(80));

for (const contentType of contentTypes) {
  processContentType(contentType);
}

console.log(`\n${'='.repeat(80)}`);
console.log('📊 SUMMARY');
console.log('='.repeat(80));
console.log(`Total files checked: ${stats.total}`);
console.log(`Working images: ${stats.working}`);
console.log(`Broken images: ${stats.broken}`);
console.log(`Fixed automatically: ${stats.fixed}`);
console.log(`Still broken: ${stats.broken - stats.fixed}`);

if (stats.errors.length > 0) {
  console.log(`\n⚠️  Files still needing attention:`);
  stats.errors.forEach(e => {
    console.log(`   ${e.file}: ${e.imagePath}`);
  });
}

console.log('='.repeat(80));
