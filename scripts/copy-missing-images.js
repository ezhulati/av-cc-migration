#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = '/Users/ez/Desktop/AI Library/Apps/AV-CC';

// Manual mapping of missing images to existing images in posts folder
const imageMappings = [
  {
    name: 'ancient-illyrian-tombs-of-selca',
    source: '/images/posts/Selca_e_Poshtme_Tomb4_Facade2.jpg',
    dest: '/images/attractions/ancient-illyrian-tombs-of-selca.jpg'
  },
  {
    name: 'blloku',
    source: '/images/posts/Blloku-Enver-Hoxha.jpg',
    dest: '/images/attractions/blloku.jpg'
  },
  {
    name: 'house-of-leaves',
    // Will use placeholder - CDN blocked this
    source: null,
    dest: '/images/attractions/House-of-Leaves.webp'
  },
  {
    name: 'medaur-winery',
    // Will use placeholder - CDN blocked this
    source: null,
    dest: '/images/attractions/medaur-winery.jpg'
  }
];

async function copyImages() {
  console.log('📋 Copying missing images from posts to attractions...\n');

  for (const mapping of imageMappings) {
    console.log(`Processing: ${mapping.name}`);

    if (!mapping.source) {
      console.log('  ⏭️  No source mapping defined, skipping\n');
      continue;
    }

    const sourcePath = path.join(PROJECT_ROOT, 'public', mapping.source);
    const destPath = path.join(PROJECT_ROOT, 'public', mapping.dest);

    try {
      // Check if source exists
      if (!fs.existsSync(sourcePath)) {
        console.log(`  ❌ Source not found: ${sourcePath}\n`);
        continue;
      }

      // Read and write the file
      const data = fs.readFileSync(sourcePath);
      fs.writeFileSync(destPath, data);

      const sourceSize = fs.statSync(sourcePath).size;
      const destSize = fs.statSync(destPath).size;

      console.log(`  ✅ Copied successfully`);
      console.log(`     Source: ${(sourceSize / 1024).toFixed(2)} KB`);
      console.log(`     Dest: ${(destSize / 1024).toFixed(2)} KB\n`);

    } catch (err) {
      console.log(`  ❌ Error: ${err.message}\n`);
    }
  }
}

copyImages();
