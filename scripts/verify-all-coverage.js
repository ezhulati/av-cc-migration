#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const contentTypes = ['attractions', 'activities', 'destinations'];

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

function checkImageExists(imagePath) {
  const fullPath = path.join(projectRoot, 'public', imagePath);
  return fs.existsSync(fullPath);
}

console.log('📊 Complete Image Coverage Report\n');
console.log('='.repeat(80));

let totalFiles = 0;
let totalImagesOnDisk = 0;
let totalImagesMissing = 0;

for (const contentType of contentTypes) {
  const contentDir = path.join(projectRoot, 'src', 'content', contentType);
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));

  let onDisk = 0;
  let missing = 0;

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) continue;

    const imageMatch = frontmatter.match(/featuredImage:\s*(.+)/);
    if (!imageMatch) continue;

    let imagePath = imageMatch[1].trim().replace(/['"]/g, '');

    if (imagePath.startsWith('http')) continue;
    if (!imagePath) continue;

    totalFiles++;

    if (checkImageExists(imagePath)) {
      onDisk++;
      totalImagesOnDisk++;
    } else {
      missing++;
      totalImagesMissing++;
      console.log(`❌ ${contentType}/${file}: ${imagePath} (MISSING)`);
    }
  }

  const coverage = totalFiles > 0 ? ((onDisk / (onDisk + missing)) * 100).toFixed(1) : 0;
  console.log(`\n${contentType.toUpperCase()}:`);
  console.log(`  Files: ${files.length}`);
  console.log(`  Images on disk: ${onDisk}`);
  console.log(`  Missing: ${missing}`);
  console.log(`  Coverage: ${coverage}%`);
}

console.log('\n' + '='.repeat(80));
console.log('OVERALL SUMMARY:');
console.log(`  Total files checked: ${totalFiles}`);
console.log(`  Images on disk: ${totalImagesOnDisk}`);
console.log(`  Missing: ${totalImagesMissing}`);
console.log(`  Overall coverage: ${((totalImagesOnDisk / totalFiles) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

if (totalImagesMissing === 0) {
  console.log('\n✅ 100% COVERAGE ACHIEVED! All images exist on disk!');
} else {
  console.log(`\n⚠️  ${totalImagesMissing} images still missing`);
}
