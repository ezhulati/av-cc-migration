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

// Fuzzy string matching
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// Normalize filename for comparison
function normalize(filename) {
  return filename
    .toLowerCase()
    .replace(/[-_\s]/g, '')
    .replace(/\.(jpg|jpeg|png|webp|svg|gif)$/i, '');
}

// Find potential matches
function findMatches() {
  console.log('🔍 FINDING ORPHAN MATCHES');
  console.log('='.repeat(80) + '\n');

  const matches = {
    exact: [],
    high: [],
    medium: [],
    low: []
  };

  report.brokenReferences.forEach((broken, idx) => {
    const brokenFilename = path.basename(broken.imagePath);
    const brokenNorm = normalize(brokenFilename);
    const brokenDir = broken.imagePath.split('/')[2]; // Extract dir (activities, attractions, etc.)

    let bestMatch = null;
    let bestScore = 0;

    // Search orphaned images in same directory
    report.orphanedImages.forEach(orphan => {
      if (!orphan.includes(`/${brokenDir}/`)) return; // Must be same directory

      const orphanFilename = path.basename(orphan);
      const orphanNorm = normalize(orphanFilename);

      // Calculate similarity
      const score = similarity(brokenNorm, orphanNorm);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          broken: broken.imagePath,
          brokenFile: broken.file,
          orphan: orphan,
          score: score,
          brokenName: brokenFilename,
          orphanName: orphanFilename
        };
      }
    });

    if (bestMatch) {
      if (bestScore === 1.0) {
        matches.exact.push(bestMatch);
      } else if (bestScore >= 0.8) {
        matches.high.push(bestMatch);
      } else if (bestScore >= 0.6) {
        matches.medium.push(bestMatch);
      } else if (bestScore >= 0.4) {
        matches.low.push(bestMatch);
      }
    }
  });

  // Display results
  console.log(`📊 Found ${matches.exact.length + matches.high.length + matches.medium.length + matches.low.length} potential matches\n`);

  // Exact matches
  if (matches.exact.length > 0) {
    console.log(`\n✅ EXACT MATCHES (${matches.exact.length}):`);
    console.log('These can be applied automatically\n');

    matches.exact.forEach((m, i) => {
      console.log(`${i + 1}. ${m.brokenName}`);
      console.log(`   → ${m.orphanName}`);
      console.log(`   File: ${path.basename(m.brokenFile)}`);
      console.log('');
    });
  }

  // High confidence matches
  if (matches.high.length > 0) {
    console.log(`\n🎯 HIGH CONFIDENCE (${matches.high.length}):`);
    console.log('Review and likely apply\n');

    matches.high.slice(0, 20).forEach((m, i) => {
      console.log(`${i + 1}. ${m.brokenName}`);
      console.log(`   → ${m.orphanName} (${(m.score * 100).toFixed(0)}% match)`);
      console.log(`   File: ${path.basename(m.brokenFile)}`);
      console.log('');
    });

    if (matches.high.length > 20) {
      console.log(`   ... and ${matches.high.length - 20} more\n`);
    }
  }

  // Medium confidence
  if (matches.medium.length > 0) {
    console.log(`\n⚠️  MEDIUM CONFIDENCE (${matches.medium.length}):`);
    console.log('Manual review required\n');

    matches.medium.slice(0, 10).forEach((m, i) => {
      console.log(`${i + 1}. ${m.brokenName}`);
      console.log(`   → ${m.orphanName} (${(m.score * 100).toFixed(0)}% match)`);
      console.log(`   File: ${path.basename(m.brokenFile)}`);
      console.log('');
    });

    if (matches.medium.length > 10) {
      console.log(`   ... and ${matches.medium.length - 10} more\n`);
    }
  }

  // Save detailed results
  const allMatches = {
    exact: matches.exact,
    high: matches.high,
    medium: matches.medium,
    low: matches.low,
    stats: {
      exact: matches.exact.length,
      high: matches.high.length,
      medium: matches.medium.length,
      low: matches.low.length,
      total: matches.exact.length + matches.high.length + matches.medium.length + matches.low.length
    }
  };

  const outputPath = path.join(projectRoot, 'data', 'orphan-matches.json');
  fs.writeFileSync(outputPath, JSON.stringify(allMatches, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log(`📁 Full results saved to: data/orphan-matches.json`);
  console.log('='.repeat(80) + '\n');

  // Generate application script
  generateApplyScript(allMatches);
}

// Generate script to apply matches
function generateApplyScript(matches) {
  let script = `#!/bin/bash
# Auto-generated script to apply orphan matches
# Generated: ${new Date().toISOString()}
# Review this script before running!

set -e

echo "🔧 Applying orphan image matches..."
echo ""

`;

  // High confidence matches only
  [...matches.exact, ...matches.high].forEach((m, i) => {
    const orphanPath = path.join(projectRoot, 'public', m.orphan.slice(1));
    const targetPath = path.join(projectRoot, 'public', m.broken.slice(1));

    script += `# ${i + 1}. ${m.brokenName} → ${m.orphanName}\n`;
    script += `if [ -f "${orphanPath}" ] && [ ! -f "${targetPath}" ]; then\n`;
    script += `  cp "${orphanPath}" "${targetPath}"\n`;
    script += `  echo "✅ Copied: ${m.orphanName}"\n`;
    script += `else\n`;
    script += `  echo "⚠️  Skipped: ${m.orphanName}"\n`;
    script += `fi\n\n`;
  });

  script += `echo ""\necho "✅ Done! Re-run QC to verify."\n`;

  const scriptPath = path.join(projectRoot, 'scripts', 'apply-orphan-matches.sh');
  fs.writeFileSync(scriptPath, script);
  fs.chmodSync(scriptPath, '755');

  console.log(`📝 Generated apply script: scripts/apply-orphan-matches.sh`);
  console.log(`   Run: ./scripts/apply-orphan-matches.sh\n`);
}

// Run
findMatches();
