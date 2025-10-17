import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load QC report
const reportPath = path.join(projectRoot, 'data', 'image-qc-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('❌ Run: node scripts/qc-broken-images.js first');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

console.log('🗄️  ARCHIVE ORPHANED IMAGES');
console.log('='.repeat(80));
console.log(`\n⚠️  WARNING: This will move ${report.orphanedImages.length} unused images to archive\n`);

const dryRun = !process.argv.includes('--apply');

if (dryRun) {
  console.log('ℹ️  Running in DRY RUN mode. Use --apply to actually move files.\n');
} else {
  console.log('🔴 LIVE MODE - Files will be moved!\n');
}

// Create archive directory structure
const archiveDir = path.join(projectRoot, 'public', 'images', '_archive');

if (!dryRun) {
  fs.mkdirSync(archiveDir, { recursive: true });

  ['accommodation', 'activities', 'attractions', 'destinations', 'posts', 'pages'].forEach(dir => {
    fs.mkdirSync(path.join(archiveDir, dir), { recursive: true });
  });
}

// Statistics
const stats = {
  moved: 0,
  skipped: 0,
  errors: [],
  sizeFreed: 0
};

// Process orphaned images
console.log('📦 Processing orphaned images...\n');

report.orphanedImages.forEach((imagePath, idx) => {
  const fullPath = path.join(projectRoot, 'public', imagePath.slice(1));

  if (!fs.existsSync(fullPath)) {
    stats.skipped++;
    return;
  }

  // Get file size
  const fileStats = fs.statSync(fullPath);
  stats.sizeFreed += fileStats.size;

  // Determine archive path
  const relativePath = imagePath.slice('/images/'.length);
  const archivePath = path.join(archiveDir, relativePath);

  if (dryRun) {
    if (idx < 20) {
      console.log(`   Would archive: ${path.basename(imagePath)}`);
    }
  } else {
    try {
      // Ensure directory exists
      fs.mkdirSync(path.dirname(archivePath), { recursive: true });

      // Move file
      fs.renameSync(fullPath, archivePath);

      if (idx < 20) {
        console.log(`   ✅ Archived: ${path.basename(imagePath)}`);
      }

      stats.moved++;
    } catch (err) {
      stats.errors.push(`Failed to archive ${imagePath}: ${err.message}`);
    }
  }
});

// Summary
console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY');
console.log('='.repeat(80));

if (dryRun) {
  console.log(`\nWould archive: ${report.orphanedImages.length} images`);
} else {
  console.log(`\n✅ Archived: ${stats.moved} images`);
  console.log(`⏭️  Skipped: ${stats.skipped} images`);
}

console.log(`💾 Space freed: ${(stats.sizeFreed / 1024 / 1024).toFixed(1)} MB`);

if (stats.errors.length > 0) {
  console.log(`\n⚠️  Errors: ${stats.errors.length}`);
  stats.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
}

console.log('\n📁 Archive location: public/images/_archive/');

if (dryRun) {
  console.log('\n💡 To actually archive files, run: node scripts/archive-orphaned-images.js --apply');
}

console.log('='.repeat(80) + '\n');

// Generate restore script
if (!dryRun && stats.moved > 0) {
  const restoreScript = `#!/bin/bash
# Restore archived images if needed
# Generated: ${new Date().toISOString()}

echo "🔄 Restoring archived images..."

cp -r "${archiveDir}/"* "${path.join(projectRoot, 'public', 'images')}/"

echo "✅ Restored all archived images"
`;

  const restorePath = path.join(projectRoot, 'scripts', 'restore-archived-images.sh');
  fs.writeFileSync(restorePath, restoreScript);
  fs.chmodSync(restorePath, '755');

  console.log(`📝 Created restore script: scripts/restore-archived-images.sh`);
  console.log(`   (In case you need to undo this operation)\n`);
}
