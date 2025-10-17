import fs from 'fs';
import path from 'path';

console.log('🔧 Applying manual image mappings...\n');

// Manual mappings for files that couldn't be auto-matched
const manualMappings = {
  'src/content/destinations/qeparo.md': {
    from: '/images/destinations/qeparo.jpg',
    to: '/images/destinations/Traditional-houses-Qeparo-village-Albanian-Riviera.jpeg'
  },
  'src/content/destinations/vlora.md': {
    from: '/images/destinations/vlora.jpg',
    to: '/images/destinations/Vlore.jpeg'
  },
  'src/content/activities/karaburun-peninsula-hidden-beaches-bays-caves.md': {
    from: '/images/attractions/karaburun-peninsula-hidden-beaches-bays-caves.jpg',
    to: '/images/activities/Karaburun-Peninsula-Albania.jpg'
  }
};

let updated = 0;

Object.entries(manualMappings).forEach(([filePath, { from, to }]) => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Replace the image path
  content = content.replace(
    new RegExp(`featuredImage:\\s*["']${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'g'),
    `featuredImage: "${to}"`
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    updated++;
    console.log(`✅ Updated: ${path.basename(filePath, '.md')}`);
    console.log(`   ${from} → ${to}\n`);
  }
});

console.log(`\n✅ Manual mapping complete!`);
console.log(`   Files updated: ${updated}`);
console.log(`\n🚀 Images should now display correctly!`);
