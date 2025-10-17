import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let appliedCount = 0;
let skippedCount = 0;

// Interactive review mode
async function interactiveReview() {
  const csvPath = path.join(projectRoot, 'data', 'manual-review-images.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Manual review CSV not found');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1).filter(l => l.trim());

  console.log('🔍 INTERACTIVE MANUAL REVIEW');
  console.log('='.repeat(80));
  console.log(`\nFound ${lines.length} potential matches to review\n`);
  console.log('Commands:');
  console.log('  y - Apply this fix');
  console.log('  n - Skip this fix');
  console.log('  q - Quit and save progress');
  console.log('  a - Apply all remaining (auto-yes to all)');
  console.log('='.repeat(80) + '\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let autoApplyAll = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/"([^"]+)","([^"]+)","([^"]+)","([^"]+)"/);

    if (!match) continue;

    const [, file, brokenPath, suggestedPath, reason] = match;

    console.log(`\n[${i + 1}/${lines.length}] ${path.basename(file)}`);
    console.log(`  Current:   ${path.basename(brokenPath)}`);
    console.log(`  Suggested: ${path.basename(suggestedPath)}`);
    console.log(`  Confidence: ${reason === 'orphan_match_exact' ? 'HIGH ✅' : 'MEDIUM ⚠️'}`);

    // Show preview of both images if they exist
    const suggestedFullPath = path.join(projectRoot, 'public', suggestedPath.slice(1));
    if (fs.existsSync(suggestedFullPath)) {
      const stats = fs.statSync(suggestedFullPath);
      console.log(`  File size: ${(stats.size / 1024).toFixed(1)} KB`);
    }

    let answer;

    if (autoApplyAll) {
      answer = 'y';
    } else {
      answer = await new Promise(resolve => {
        rl.question('\n  Apply this fix? (y/n/q/a): ', resolve);
      });
    }

    if (answer.toLowerCase() === 'q') {
      console.log('\n⏸️  Quitting... Progress saved.');
      break;
    }

    if (answer.toLowerCase() === 'a') {
      autoApplyAll = true;
      answer = 'y';
    }

    if (answer.toLowerCase() === 'y') {
      const filePath = path.join(projectRoot, file);

      if (!fs.existsSync(filePath)) {
        console.log('  ⚠️  Content file not found, skipping...');
        skippedCount++;
        continue;
      }

      let content = fs.readFileSync(filePath, 'utf-8');

      if (content.includes(brokenPath)) {
        content = content.replace(
          new RegExp(brokenPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
          suggestedPath
        );
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('  ✅ Applied!');
        appliedCount++;
      } else {
        console.log('  ⚠️  Path not found in file, skipping...');
        skippedCount++;
      }
    } else {
      console.log('  ⏭️  Skipped');
      skippedCount++;
    }
  }

  rl.close();

  console.log('\n' + '='.repeat(80));
  console.log('📊 REVIEW COMPLETE');
  console.log('='.repeat(80));
  console.log(`  Applied: ${appliedCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log('='.repeat(80) + '\n');
}

// Batch apply all high-confidence matches
function batchApply() {
  const csvPath = path.join(projectRoot, 'data', 'manual-review-images.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('❌ Manual review CSV not found');
    process.exit(1);
  }

  console.log('🔧 BATCH APPLY HIGH-CONFIDENCE MATCHES');
  console.log('='.repeat(80) + '\n');

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1);

  lines.forEach(line => {
    if (!line.trim()) return;

    const match = line.match(/"([^"]+)","([^"]+)","([^"]+)","([^"]+)"/);
    if (!match) return;

    const [, file, brokenPath, suggestedPath, reason] = match;

    // Only apply exact matches in batch mode
    if (reason !== 'orphan_match_exact') {
      skippedCount++;
      return;
    }

    const filePath = path.join(projectRoot, file);

    if (!fs.existsSync(filePath)) {
      skippedCount++;
      return;
    }

    let content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes(brokenPath)) {
      content = content.replace(
        new RegExp(brokenPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        suggestedPath
      );
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ ${path.basename(file)}`);
      appliedCount++;
    } else {
      skippedCount++;
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`✅ Applied ${appliedCount} high-confidence matches`);
  console.log(`⏭️  Skipped ${skippedCount} (low confidence or not found)`);
  console.log('='.repeat(80) + '\n');
}

// Main
const args = process.argv.slice(2);
const mode = args[0];

if (mode === '--interactive' || mode === '-i') {
  interactiveReview();
} else if (mode === '--batch' || mode === '-b') {
  batchApply();
} else {
  console.log('📋 APPLY MANUAL MATCHES');
  console.log('='.repeat(80));
  console.log('\nUsage:');
  console.log('  node scripts/apply-manual-matches.js --interactive');
  console.log('    Review each match one-by-one (recommended)');
  console.log('');
  console.log('  node scripts/apply-manual-matches.js --batch');
  console.log('    Auto-apply only high-confidence matches');
  console.log('='.repeat(80) + '\n');
}
