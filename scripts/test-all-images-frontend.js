#!/usr/bin/env node
/**
 * Test all images are actually loading on the frontend (HTTP 200)
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const DEV_SERVER = 'http://localhost:4321';
const contentTypes = ['attractions', 'activities', 'destinations'];

const stats = {
  total: 0,
  working: 0,
  broken: 0,
  errors: []
};

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

function testImageURL(imageUrl) {
  return new Promise((resolve) => {
    const url = `${DEV_SERVER}${imageUrl}`;

    http.get(url, { timeout: 5000 }, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    }).on('timeout', () => {
      resolve(false);
    });
  });
}

async function checkContentType(contentType) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing ${contentType} images on frontend...`);
  console.log('='.repeat(80));

  const contentDir = path.join(projectRoot, 'src', 'content', contentType);
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));

  console.log(`Files to check: ${files.length}\n`);

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) continue;

    const imageMatch = frontmatter.match(/featuredImage:\s*(.+)/);
    if (!imageMatch) continue;

    let imagePath = imageMatch[1].trim().replace(/['"]/g, '');

    // Skip external URLs
    if (imagePath.startsWith('http')) continue;

    // Skip empty paths
    if (!imagePath) continue;

    stats.total++;
    const isWorking = await testImageURL(imagePath);

    if (isWorking) {
      stats.working++;
      console.log(`✅ ${file}: ${imagePath}`);
    } else {
      stats.broken++;
      stats.errors.push({ file, imagePath });
      console.log(`❌ ${file}: ${imagePath} (HTTP ERROR)`);
    }
  }
}

async function main() {
  console.log('🌐 Frontend Image Loading Test');
  console.log(`Testing against: ${DEV_SERVER}`);
  console.log('='.repeat(80));

  for (const contentType of contentTypes) {
    await checkContentType(contentType);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 FRONTEND LOADING SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total images tested: ${stats.total}`);
  console.log(`Working (HTTP 200): ${stats.working}`);
  console.log(`Broken: ${stats.broken}`);
  console.log(`Success rate: ${((stats.working / stats.total) * 100).toFixed(1)}%`);

  if (stats.errors.length > 0 && stats.errors.length <= 20) {
    console.log(`\n⚠️  Files with broken images:`);
    stats.errors.forEach(e => {
      console.log(`   ${e.file}: ${e.imagePath}`);
    });
  } else if (stats.errors.length > 20) {
    console.log(`\n⚠️  ${stats.errors.length} files with broken images (too many to display)`);
  }

  console.log('='.repeat(80));

  if (stats.broken === 0) {
    console.log('\n🎉 SUCCESS! All images loading perfectly on the frontend!');
  } else {
    console.log(`\n⚠️  ${stats.broken} images need fixing`);
  }
}

main().catch(console.error);
