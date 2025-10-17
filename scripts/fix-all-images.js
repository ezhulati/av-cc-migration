import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const stats = {
  extensionFixed: 0,
  caseFixed: 0,
  renamedFiles: 0,
  updatedReferences: 0,
  errors: []
};

// Load QC report
function loadQCReport() {
  const reportPath = path.join(projectRoot, 'data', 'image-qc-report.json');
  if (!fs.existsSync(reportPath)) {
    console.error('❌ QC report not found. Run: node scripts/qc-broken-images.js');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
}

// 1. Fix simple extension mismatches
function fixExtensionMismatches(report, dryRun) {
  console.log('\n🔧 Step 1: Fixing extension mismatches...\n');

  const knownMismatches = [
    { wrong: 'agrotourism.jpg', correct: 'agrotourism.jpeg', dir: 'activities' },
    { wrong: 'hikingtrekking.jpg', correct: 'hiking-trekking.jpeg', dir: 'activities' },
    { wrong: 'winetasting.jpg', correct: 'wine-tasting.jpeg', dir: 'activities' },
    { wrong: 'cyclealbania.jpg', correct: 'cycle-albania.jpeg', dir: 'activities' },
    { wrong: 'mountainbiking.jpg', correct: 'mountain-biking.jpeg', dir: 'activities' },
    { wrong: 'bunkart1.jpg', correct: 'bunkart1.jpeg', dir: 'attractions' },
  ];

  knownMismatches.forEach(({ wrong, correct, dir }) => {
    const wrongPath = path.join(projectRoot, 'public', 'images', dir, wrong);
    const correctPath = path.join(projectRoot, 'public', 'images', dir, correct);

    if (fs.existsSync(correctPath) && !fs.existsSync(wrongPath)) {
      if (dryRun) {
        console.log(`   🔍 Would rename: ${dir}/${correct} → ${wrong}`);
      } else {
        try {
          fs.renameSync(correctPath, wrongPath);
          console.log(`   ✅ Renamed: ${dir}/${correct} → ${wrong}`);
          stats.extensionFixed++;
        } catch (err) {
          stats.errors.push(`Failed to rename ${correct}: ${err.message}`);
        }
      }
    }
  });
}

// 2. Fix case sensitivity issues by updating content files
function fixCaseSensitivity(report, dryRun) {
  console.log('\n🔧 Step 2: Fixing case sensitivity issues...\n');

  const caseFixes = [
    {
      ref: '/images/accommodation/ZoeHoraDhermi.jpg',
      actual: '/images/accommodation/Zoe-Hora-Dhermi.jpg'
    },
    {
      ref: '/images/accommodation/GreatMosqueofDurresorGrandMosqueofDurresFatihMosquescaled.jpeg',
      actual: '/images/accommodation/Great-Mosque-of-Durres-or-Grand-Mosque-of-Durres-Fatih-Mosque--scaled.jpeg'
    },
    {
      ref: '/images/attractions/AlbanianAlps.jpeg',
      actual: '/images/attractions/Albanian-Alps.jpeg'
    },
    {
      ref: '/images/destinations/TiranaAlbania.jpeg',
      actual: '/images/destinations/Tirana-Albania.jpeg'
    }
  ];

  caseFixes.forEach(({ ref, actual }) => {
    // Find files that reference the wrong case
    const brokenRefs = report.brokenReferences.filter(br => br.imagePath === ref);

    brokenRefs.forEach(broken => {
      const filePath = path.join(projectRoot, broken.file);

      if (!fs.existsSync(filePath)) return;

      let content = fs.readFileSync(filePath, 'utf-8');

      if (content.includes(ref)) {
        if (dryRun) {
          console.log(`   🔍 Would fix: ${broken.file}`);
          console.log(`      ${path.basename(ref)} → ${path.basename(actual)}`);
        } else {
          content = content.replace(new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), actual);
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`   ✅ Fixed: ${broken.file}`);
          stats.caseFixed++;
        }
      }
    });
  });
}

// 3. Apply high-confidence manual review matches
function applyManualReviewMatches(dryRun) {
  console.log('\n🔧 Step 3: Applying high-confidence manual review matches...\n');

  const csvPath = path.join(projectRoot, 'data', 'manual-review-images.csv');

  if (!fs.existsSync(csvPath)) {
    console.log('   ⚠️  No manual review CSV found, skipping...');
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1); // Skip header

  let appliedCount = 0;

  lines.forEach(line => {
    if (!line.trim()) return;

    // Parse CSV line
    const match = line.match(/"([^"]+)","([^"]+)","([^"]+)","([^"]+)"/);
    if (!match) return;

    const [, file, brokenPath, suggestedPath, reason] = match;

    // Only apply exact matches automatically
    if (reason !== 'orphan_match_exact') return;

    const filePath = path.join(projectRoot, file);

    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes(brokenPath)) {
      if (dryRun) {
        console.log(`   🔍 Would fix: ${path.basename(file)}`);
        console.log(`      ${path.basename(brokenPath)} → ${path.basename(suggestedPath)}`);
      } else {
        content = content.replace(
          new RegExp(brokenPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          suggestedPath
        );
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`   ✅ Fixed: ${path.basename(file)}`);
        appliedCount++;
        stats.updatedReferences++;
      }
    }
  });

  if (appliedCount === 0 && !dryRun) {
    console.log('   ℹ️  No exact matches found (this is expected - most need manual review)');
  }
}

// 4. Find and rename orphaned images that match broken references
function matchOrphanedImages(report, dryRun) {
  console.log('\n🔧 Step 4: Matching orphaned images to broken references...\n');

  // Common patterns where orphaned images exist with slightly different names
  const patterns = [
    // Activities with hyphens vs no hyphens
    { broken: 'hikingtrekking', orphan: 'hiking-trekking', dir: 'activities' },
    { broken: 'winetasting', orphan: 'wine-tasting', dir: 'activities' },
    { broken: 'agrotourism', orphan: 'agrotourism', dir: 'activities' },

    // Attractions with simplified names
    { broken: 'albanianriviera', orphan: 'albanian-riviera', dir: 'attractions' },
    { broken: 'beratcastle', orphan: 'berat-castle', dir: 'attractions' },
    { broken: 'blueeyespring', orphan: 'blue-eye-spring', dir: 'attractions' },
  ];

  let matchedCount = 0;

  report.brokenReferences.forEach(broken => {
    const filename = path.basename(broken.imagePath);
    const filenameNoExt = filename.replace(/\.[^.]+$/, '').toLowerCase();
    const dir = broken.imagePath.split('/')[2]; // Extract directory (activities, attractions, etc.)

    // Look for orphaned images that might match
    report.orphanedImages.forEach(orphan => {
      if (!orphan.includes(`/${dir}/`)) return; // Must be in same directory

      const orphanFilename = path.basename(orphan);
      const orphanNoExt = orphanFilename.replace(/\.[^.]+$/, '').toLowerCase();

      // Check for similar names (with/without hyphens, underscores)
      const normalizedBroken = filenameNoExt.replace(/[-_]/g, '');
      const normalizedOrphan = orphanNoExt.replace(/[-_]/g, '');

      if (normalizedBroken === normalizedOrphan && filename !== orphanFilename) {
        if (dryRun) {
          console.log(`   🔍 Would match: ${orphanFilename} → ${filename}`);
        } else {
          const orphanPath = path.join(projectRoot, 'public', orphan.slice(1));
          const targetPath = path.join(projectRoot, 'public', broken.imagePath.slice(1));

          if (fs.existsSync(orphanPath) && !fs.existsSync(targetPath)) {
            try {
              // Copy instead of move to be safe
              fs.copyFileSync(orphanPath, targetPath);
              console.log(`   ✅ Matched: ${orphanFilename} → ${filename}`);
              matchedCount++;
              stats.renamedFiles++;
            } catch (err) {
              stats.errors.push(`Failed to copy ${orphanFilename}: ${err.message}`);
            }
          }
        }
      }
    });
  });

  if (matchedCount === 0 && !dryRun) {
    console.log('   ℹ️  No additional orphan matches found');
  }
}

// 5. Generate report of remaining issues
function generateRemainingIssuesReport(report) {
  console.log('\n📊 Generating remaining issues report...\n');

  // Re-run QC to get updated numbers
  console.log('   Running fresh QC scan...');

  const { execSync } = require('child_process');
  try {
    execSync('node scripts/qc-broken-images.js', {
      cwd: projectRoot,
      stdio: 'pipe'
    });

    // Reload report
    const updatedReport = loadQCReport();

    console.log('\n   📈 Updated Statistics:');
    console.log(`      Total image references: ${updatedReport.stats.totalImageReferences}`);
    console.log(`      Valid references: ${updatedReport.stats.validCount} ✅`);
    console.log(`      Broken references: ${updatedReport.stats.brokenCount} ❌`);
    console.log(`      Orphaned images: ${updatedReport.orphanedImages.length} 🔍`);

    // Categorize remaining issues
    const remainingIssues = {
      googleHashes: [],
      genericNames: [],
      missingFiles: [],
      other: []
    };

    updatedReport.brokenReferences.forEach(broken => {
      const filename = path.basename(broken.imagePath);

      if (filename.match(/^[A-Z0-9_-]{40,}/)) {
        remainingIssues.googleHashes.push(broken);
      } else if (filename.match(/^(picture|photo|image)\d+/i)) {
        remainingIssues.genericNames.push(broken);
      } else if (broken.issue === 'file_not_found') {
        remainingIssues.missingFiles.push(broken);
      } else {
        remainingIssues.other.push(broken);
      }
    });

    // Save categorized issues
    const issuesPath = path.join(projectRoot, 'data', 'remaining-image-issues.json');
    fs.writeFileSync(issuesPath, JSON.stringify(remainingIssues, null, 2));

    console.log('\n   📁 Remaining Issues by Category:');
    console.log(`      Google hash filenames: ${remainingIssues.googleHashes.length}`);
    console.log(`      Generic placeholder names: ${remainingIssues.genericNames.length}`);
    console.log(`      Missing files: ${remainingIssues.missingFiles.length}`);
    console.log(`      Other issues: ${remainingIssues.other.length}`);

    console.log(`\n   Saved to: data/remaining-image-issues.json`);

  } catch (err) {
    console.log('   ⚠️  Could not re-run QC:', err.message);
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  console.log('🎯 COMPREHENSIVE IMAGE FIX SCRIPT');
  console.log('='.repeat(80));

  if (dryRun) {
    console.log('\nℹ️  Running in DRY RUN mode. Use --apply to make actual changes.');
  } else {
    console.log('\n⚠️  APPLYING ALL FIXES! This will modify files.');
  }

  const report = loadQCReport();

  console.log(`\n📊 Starting with ${report.stats.brokenCount} broken references\n`);

  // Execute all fix steps
  fixExtensionMismatches(report, dryRun);
  fixCaseSensitivity(report, dryRun);
  applyManualReviewMatches(dryRun);
  matchOrphanedImages(report, dryRun);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  if (dryRun) {
    console.log('\nThis was a dry run. Fixes would include:');
  } else {
    console.log('\n✅ Fixes applied:');
  }

  console.log(`   Extension mismatches fixed: ${stats.extensionFixed}`);
  console.log(`   Case sensitivity fixes: ${stats.caseFixed}`);
  console.log(`   Files renamed/matched: ${stats.renamedFiles}`);
  console.log(`   References updated: ${stats.updatedReferences}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(err => console.log(`   - ${err}`));
  }

  if (!dryRun) {
    // Generate fresh report of remaining issues
    generateRemainingIssuesReport(report);
  }

  console.log('\n' + '='.repeat(80));

  if (dryRun) {
    console.log('\n💡 To apply all fixes, run: node scripts/fix-all-images.js --apply');
  } else {
    console.log('\n✅ All automated fixes have been applied!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review data/remaining-image-issues.json');
    console.log('   2. Source missing images from WordPress backup');
    console.log('   3. Run: node scripts/qc-broken-images.js to verify');
  }

  console.log('='.repeat(80) + '\n');
}

main();
