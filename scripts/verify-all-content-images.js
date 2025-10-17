#!/usr/bin/env node
/**
 * Comprehensive image verification across all content collections
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const CONTENT_DIR = path.join(projectRoot, 'src', 'content');
const PUBLIC_IMAGES = path.join(projectRoot, 'public', 'images');

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

function checkImage(imagePath) {
  if (!imagePath) return { exists: false, reason: 'No image path' };

  // Handle both /images/... and /public/images/... paths
  let cleanPath = imagePath.replace(/^\//, '');
  if (cleanPath.startsWith('images/')) {
    cleanPath = cleanPath.replace('images/', '');
  }

  const fullPath = path.join(PUBLIC_IMAGES, cleanPath);
  const exists = fs.existsSync(fullPath);

  return { exists, path: fullPath, reason: exists ? 'OK' : 'File not found' };
}

function scanContentType(contentType) {
  const contentPath = path.join(CONTENT_DIR, contentType);

  if (!fs.existsSync(contentPath)) {
    return { total: 0, found: 0, missing: 0, missingFiles: [] };
  }

  const files = fs.readdirSync(contentPath).filter(f => f.endsWith('.md'));

  let found = 0;
  let missing = 0;
  const missingFiles = [];

  for (const file of files) {
    const filePath = path.join(contentPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) continue;

    const imagePath = frontmatter.featuredImage || frontmatter.image || frontmatter.heroImage;
    const check = checkImage(imagePath);

    if (check.exists) {
      found++;
    } else {
      missing++;
      missingFiles.push({
        file,
        imagePath,
        reason: check.reason
      });
    }
  }

  return {
    total: files.length,
    found,
    missing,
    missingFiles
  };
}

async function main() {
  console.log('🔍 Comprehensive Content Image Verification');
  console.log('='.repeat(80));
  console.log();

  const contentTypes = ['posts', 'pages', 'destinations', 'attractions', 'activities', 'accommodation'];

  let totalFiles = 0;
  let totalFound = 0;
  let totalMissing = 0;
  const allMissing = [];

  for (const contentType of contentTypes) {
    const result = scanContentType(contentType);

    totalFiles += result.total;
    totalFound += result.found;
    totalMissing += result.missing;

    const percentage = result.total > 0
      ? ((result.found / result.total) * 100).toFixed(1)
      : '0.0';

    const status = result.missing === 0 ? '✅' : '⚠️';

    console.log(`${status} ${contentType.toUpperCase()}`);
    console.log(`   Total: ${result.total} | Found: ${result.found} | Missing: ${result.missing} (${percentage}% coverage)`);

    if (result.missing > 0 && result.missingFiles.length > 0) {
      console.log(`   Missing images:`);
      result.missingFiles.slice(0, 5).forEach(item => {
        console.log(`   - ${item.file}: ${item.imagePath || 'No path'} (${item.reason})`);
      });
      if (result.missingFiles.length > 5) {
        console.log(`   ... and ${result.missingFiles.length - 5} more`);
      }
      allMissing.push(...result.missingFiles.map(m => ({ ...m, contentType })));
    }
    console.log();
  }

  console.log('='.repeat(80));
  console.log('📊 OVERALL SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total content files: ${totalFiles}`);
  console.log(`Images found: ${totalFound}`);
  console.log(`Images missing: ${totalMissing}`);

  const overallPercentage = totalFiles > 0
    ? ((totalFound / totalFiles) * 100).toFixed(1)
    : '0.0';

  console.log(`Overall coverage: ${overallPercentage}%`);
  console.log('='.repeat(80));

  // Save detailed report
  if (allMissing.length > 0) {
    const reportPath = path.join(projectRoot, 'data', 'missing-images-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(allMissing, null, 2));
    console.log(`\n📝 Detailed report saved to: ${reportPath}`);
  }

  if (totalMissing === 0) {
    console.log('\n🎉 100% IMAGE COVERAGE ACHIEVED! All content has valid images.');
  } else {
    console.log(`\n⚠️  ${totalMissing} images still missing. Check the report for details.`);
  }
}

main().catch(console.error);
