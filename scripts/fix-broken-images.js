import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load the QC report
const reportPath = path.join(projectRoot, 'data', 'image-qc-report.json');
if (!fs.existsSync(reportPath)) {
  console.error('❌ QC report not found. Run qc-broken-images.js first.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Statistics
const stats = {
  caseFixed: 0,
  manualReview: 0,
  notFound: 0,
  orphanMatched: 0
};

// Function to find similar image names in orphaned images
function findSimilarOrphanedImage(brokenPath, orphanedImages) {
  const brokenName = path.basename(brokenPath).toLowerCase();
  const brokenNameWithoutExt = brokenName.replace(/\.(jpg|jpeg|png|webp|svg|gif)$/, '');

  // Try to find matches in orphaned images
  for (const orphan of orphanedImages) {
    const orphanName = path.basename(orphan).toLowerCase();
    const orphanNameWithoutExt = orphanName.replace(/\.(jpg|jpeg|png|webp|svg|gif)$/, '');

    // Exact match (case-insensitive)
    if (orphanName === brokenName) {
      return { type: 'exact', path: orphan, confidence: 'high' };
    }

    // Similar name match
    if (orphanNameWithoutExt.includes(brokenNameWithoutExt) ||
        brokenNameWithoutExt.includes(orphanNameWithoutExt)) {
      return { type: 'similar', path: orphan, confidence: 'medium' };
    }
  }

  return null;
}

// Generate fix recommendations
function generateFixRecommendations() {
  console.log('🔧 Analyzing broken images for fix recommendations...\n');

  const recommendations = {
    autoFix: [],
    manualReview: [],
    notFound: []
  };

  report.brokenReferences.forEach(broken => {
    const { file, imagePath, issue } = broken;

    // Case mismatch - can auto-fix
    if (issue === 'case_mismatch') {
      const caseIssue = report.caseIssues.find(c =>
        c.file === file && c.referencedAs === imagePath
      );

      if (caseIssue) {
        recommendations.autoFix.push({
          file,
          oldPath: imagePath,
          newPath: imagePath.replace(
            path.basename(imagePath),
            caseIssue.actualCase
          ),
          reason: 'case_mismatch'
        });
        stats.caseFixed++;
      }
    }

    // File not found - try to match with orphaned images
    else if (issue === 'file_not_found') {
      const match = findSimilarOrphanedImage(imagePath, report.orphanedImages);

      if (match && match.confidence === 'high') {
        recommendations.autoFix.push({
          file,
          oldPath: imagePath,
          newPath: match.path,
          reason: 'orphan_match_exact'
        });
        stats.orphanMatched++;
      } else if (match && match.confidence === 'medium') {
        recommendations.manualReview.push({
          file,
          oldPath: imagePath,
          suggestedPath: match.path,
          reason: 'orphan_match_similar'
        });
        stats.manualReview++;
      } else {
        recommendations.notFound.push({
          file,
          imagePath,
          reason: 'no_match_found'
        });
        stats.notFound++;
      }
    } else {
      recommendations.notFound.push({
        file,
        imagePath,
        reason: issue
      });
      stats.notFound++;
    }
  });

  return recommendations;
}

// Apply auto-fixes
function applyAutoFixes(recommendations, dryRun = true) {
  if (recommendations.autoFix.length === 0) {
    console.log('ℹ️  No auto-fixes available.');
    return;
  }

  console.log(`\n🔧 ${dryRun ? 'DRY RUN - ' : ''}Applying ${recommendations.autoFix.length} auto-fixes...\n`);

  recommendations.autoFix.forEach((fix, idx) => {
    const filePath = path.join(projectRoot, fix.file);

    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  File not found: ${fix.file}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    const oldPath = fix.oldPath;
    const newPath = fix.newPath;

    // Replace the image path
    if (content.includes(oldPath)) {
      if (!dryRun) {
        content = content.replace(new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPath);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`   ✅ ${idx + 1}. Fixed ${path.basename(fix.file)}`);
        console.log(`      ${oldPath} → ${newPath}`);
      } else {
        console.log(`   🔍 ${idx + 1}. Would fix ${path.basename(fix.file)}`);
        console.log(`      ${oldPath} → ${newPath}`);
      }
    }
  });
}

// Generate manual review CSV
function generateManualReviewCSV(recommendations) {
  if (recommendations.manualReview.length === 0) {
    return;
  }

  console.log('\n📋 Generating manual review CSV...');

  let csv = 'File,Broken Image Path,Suggested Fix,Reason\n';
  recommendations.manualReview.forEach(item => {
    csv += `"${item.file}","${item.oldPath}","${item.suggestedPath}","${item.reason}"\n`;
  });

  const csvPath = path.join(projectRoot, 'data', 'manual-review-images.csv');
  fs.writeFileSync(csvPath, csv);
  console.log(`   Saved to: ${path.relative(projectRoot, csvPath)}`);
}

// Generate not found report
function generateNotFoundReport(recommendations) {
  if (recommendations.notFound.length === 0) {
    return;
  }

  console.log('\n❌ Images not found (need to be sourced):');
  console.log(`   ${recommendations.notFound.length} images missing\n`);

  recommendations.notFound.slice(0, 20).forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${path.basename(item.file)}`);
    console.log(`      Missing: ${item.imagePath}`);
  });

  if (recommendations.notFound.length > 20) {
    console.log(`   ... and ${recommendations.notFound.length - 20} more`);
  }

  // Save full list to file
  const notFoundPath = path.join(projectRoot, 'data', 'images-not-found.json');
  fs.writeFileSync(notFoundPath, JSON.stringify(recommendations.notFound, null, 2));
  console.log(`\n   Full list saved to: ${path.relative(projectRoot, notFoundPath)}`);
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  console.log('🔧 IMAGE FIX SCRIPT');
  console.log('='.repeat(80) + '\n');

  if (dryRun) {
    console.log('ℹ️  Running in DRY RUN mode. Use --apply to make actual changes.\n');
  } else {
    console.log('⚠️  APPLYING CHANGES to files!\n');
  }

  const recommendations = generateFixRecommendations();

  // Show statistics
  console.log('\n📊 FIX ANALYSIS:');
  console.log(`   Auto-fixable: ${recommendations.autoFix.length}`);
  console.log(`   Manual review needed: ${recommendations.manualReview.length}`);
  console.log(`   Not found: ${recommendations.notFound.length}\n`);

  // Apply auto-fixes
  applyAutoFixes(recommendations, dryRun);

  // Generate manual review CSV
  generateManualReviewCSV(recommendations);

  // Generate not found report
  generateNotFoundReport(recommendations);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Fix analysis complete!');

  if (dryRun) {
    console.log('\nTo apply auto-fixes, run: node scripts/fix-broken-images.js --apply');
  }

  console.log('='.repeat(80) + '\n');
}

main();
