#!/usr/bin/env node

/**
 * Accommodation Data Audit Script
 *
 * Analyzes the CSV export from WordPress and compares it with existing
 * accommodation markdown files to identify:
 * - Missing accommodations
 * - Incomplete data
 * - Missing images
 * - Data quality issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(PROJECT_ROOT, 'Accommodation-Export-2025-October-17-0507.csv');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/accommodation');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public/images/accommodation');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'data/accommodation-audit-report.json');

// Ensure data directory exists
const dataDir = path.join(PROJECT_ROOT, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Parse CSV file
 */
function parseCSV(csvPath) {
  console.log('📄 Reading CSV file...');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  console.log(`   Found ${header.length} columns`);

  // Parse rows
  const rows = [];
  let currentRow = [];
  let insideQuotes = false;
  let currentField = '';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    // End of line
    if (!insideQuotes) {
      currentRow.push(currentField.trim());

      if (currentRow.length === header.length) {
        const rowObj = {};
        header.forEach((h, idx) => {
          rowObj[h] = currentRow[idx]?.replace(/^"|"$/g, '') || '';
        });
        rows.push(rowObj);
      }

      currentRow = [];
      currentField = '';
    } else {
      currentField += '\n';
    }
  }

  console.log(`   Parsed ${rows.length} accommodation entries`);
  return { header, rows };
}

/**
 * Get all existing accommodation markdown files
 */
function getExistingAccommodations() {
  console.log('\n📁 Scanning existing accommodation files...');
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  console.log(`   Found ${files.length} markdown files`);
  return files;
}

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = {};
  const lines = match[1].split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    if (line.startsWith('  - ')) {
      // Array item
      if (currentArray) {
        currentArray.push(line.substring(4).replace(/^"|"$/g, ''));
      }
    } else if (line.includes(':')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim().replace(/^"|"$/g, '');
      currentKey = key.trim();

      if (value === '') {
        // Might be start of array
        currentArray = [];
        frontmatter[currentKey] = currentArray;
      } else {
        frontmatter[currentKey] = value;
        currentArray = null;
      }
    }
  }

  return frontmatter;
}

/**
 * Extract images from CSV image URL field
 */
function extractImagesFromCSV(imageUrl) {
  if (!imageUrl) return [];
  return imageUrl.split('|')
    .map(url => url.trim())
    .filter(url => url.length > 0);
}

/**
 * Get filename from URL
 */
function getFilenameFromURL(url) {
  const match = url.match(/\/([^\/\?]+)(\?|$)/);
  return match ? match[1] : null;
}

/**
 * Check if image exists locally
 */
function imageExists(filename) {
  const imagePath = path.join(IMAGES_DIR, filename);
  return fs.existsSync(imagePath);
}

/**
 * Analyze data completeness
 */
function analyzeCompleteness(frontmatter) {
  const issues = [];
  const requiredFields = [
    'title',
    'description',
    'featuredImage',
    'starRating',
    'rating',
    'ratingWords',
    'numberOfReviews'
  ];

  const recommendedFields = [
    'amenities',
    'roomTypes',
    'reviews',
    'nearbyAttractions',
    'images'
  ];

  // Check required fields
  for (const field of requiredFields) {
    if (!frontmatter[field] || frontmatter[field] === '') {
      issues.push(`Missing required field: ${field}`);
    }
  }

  // Check recommended fields
  for (const field of recommendedFields) {
    if (!frontmatter[field] ||
        (Array.isArray(frontmatter[field]) && frontmatter[field].length === 0)) {
      issues.push(`Missing recommended field: ${field}`);
    }
  }

  // Check image arrays
  if (frontmatter.images && Array.isArray(frontmatter.images)) {
    if (frontmatter.images.length === 0) {
      issues.push('No gallery images');
    } else if (frontmatter.images.length < 3) {
      issues.push('Less than 3 gallery images (recommended: 6+)');
    }
  }

  return {
    completeness: ((requiredFields.length + recommendedFields.length - issues.length) /
                   (requiredFields.length + recommendedFields.length) * 100).toFixed(1),
    issues
  };
}

/**
 * Main audit function
 */
async function runAudit() {
  console.log('🔍 Starting Accommodation Data Audit\n');
  console.log('='.repeat(60));

  // Parse CSV
  const { header, rows: csvRows } = parseCSV(CSV_PATH);

  // Get existing files
  const existingFiles = getExistingAccommodations();
  const existingMap = new Map();

  console.log('\n📊 Analyzing existing files...');
  for (const file of existingFiles) {
    const filePath = path.join(CONTENT_DIR, file);
    const frontmatter = parseFrontmatter(filePath);
    if (frontmatter) {
      existingMap.set(file.replace('.md', ''), {
        filename: file,
        frontmatter,
        analysis: analyzeCompleteness(frontmatter)
      });
    }
  }

  // Build audit report
  const report = {
    summary: {
      totalInCSV: csvRows.length,
      totalExistingFiles: existingFiles.length,
      totalAnalyzed: existingMap.size,
      timestamp: new Date().toISOString()
    },
    missingAccommodations: [],
    incompleteAccommodations: [],
    missingImages: [],
    qualityIssues: [],
    statistics: {
      averageCompleteness: 0,
      accommodationsWithReviews: 0,
      accommodationsWithAmenities: 0,
      accommodationsWithImages: 0,
      totalMissingImages: 0
    }
  };

  console.log('\n🔎 Checking CSV entries against existing files...');

  for (const row of csvRows) {
    const slug = row['Post Slug'] || row['Slug'] || '';
    if (!slug) continue;

    if (!existingMap.has(slug)) {
      report.missingAccommodations.push({
        slug,
        title: row['Title'] || 'Untitled',
        id: row['ID'],
        images: extractImagesFromCSV(row['Image URL'])
      });
    }
  }

  console.log('\n📈 Analyzing data quality...');

  let totalCompleteness = 0;

  for (const [slug, data] of existingMap) {
    const { frontmatter, analysis } = data;
    totalCompleteness += parseFloat(analysis.completeness);

    // Track statistics
    if (frontmatter.reviews && frontmatter.reviews.length > 0) {
      report.statistics.accommodationsWithReviews++;
    }
    if (frontmatter.amenities && frontmatter.amenities.length > 0) {
      report.statistics.accommodationsWithAmenities++;
    }
    if (frontmatter.images && frontmatter.images.length > 0) {
      report.statistics.accommodationsWithImages++;
    }

    // Check for issues
    if (analysis.issues.length > 0) {
      report.incompleteAccommodations.push({
        slug,
        title: frontmatter.title,
        completeness: analysis.completeness + '%',
        issues: analysis.issues
      });
    }

    // Check images
    if (frontmatter.images && Array.isArray(frontmatter.images)) {
      for (const imageUrl of frontmatter.images) {
        const filename = getFilenameFromURL(imageUrl);
        if (filename && !imageExists(filename)) {
          report.missingImages.push({
            slug,
            title: frontmatter.title,
            imageUrl,
            filename
          });
          report.statistics.totalMissingImages++;
        }
      }
    }

    // Check featured image
    if (frontmatter.featuredImage && typeof frontmatter.featuredImage === 'string') {
      const featuredPath = path.join(PROJECT_ROOT, 'public', frontmatter.featuredImage);
      if (!fs.existsSync(featuredPath)) {
        report.missingImages.push({
          slug,
          title: frontmatter.title,
          imageUrl: frontmatter.featuredImage,
          filename: path.basename(frontmatter.featuredImage),
          isFeatured: true
        });
        report.statistics.totalMissingImages++;
      }
    }
  }

  report.statistics.averageCompleteness =
    (totalCompleteness / existingMap.size).toFixed(1) + '%';

  // Sort by severity
  report.incompleteAccommodations.sort((a, b) =>
    parseFloat(a.completeness) - parseFloat(b.completeness)
  );

  // Save report
  console.log('\n💾 Saving audit report...');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log(`\n📦 Data Overview:`);
  console.log(`   Total in CSV: ${report.summary.totalInCSV}`);
  console.log(`   Total existing files: ${report.summary.totalExistingFiles}`);
  console.log(`   Missing from system: ${report.missingAccommodations.length}`);

  console.log(`\n📈 Quality Metrics:`);
  console.log(`   Average completeness: ${report.statistics.averageCompleteness}`);
  console.log(`   With reviews: ${report.statistics.accommodationsWithReviews}`);
  console.log(`   With amenities: ${report.statistics.accommodationsWithAmenities}`);
  console.log(`   With images: ${report.statistics.accommodationsWithImages}`);

  console.log(`\n⚠️  Issues Found:`);
  console.log(`   Incomplete accommodations: ${report.incompleteAccommodations.length}`);
  console.log(`   Missing images: ${report.statistics.totalMissingImages}`);

  console.log(`\n📄 Full report saved to:`);
  console.log(`   ${OUTPUT_PATH}`);

  console.log('\n' + '='.repeat(60));

  // Show top 10 most incomplete
  if (report.incompleteAccommodations.length > 0) {
    console.log(`\n🔴 Top 10 Most Incomplete Accommodations:`);
    report.incompleteAccommodations.slice(0, 10).forEach((acc, idx) => {
      console.log(`\n   ${idx + 1}. ${acc.title} (${acc.completeness})`);
      console.log(`      Slug: ${acc.slug}`);
      console.log(`      Issues: ${acc.issues.length}`);
      acc.issues.slice(0, 3).forEach(issue => {
        console.log(`      - ${issue}`);
      });
    });
  }

  return report;
}

// Run the audit
runAudit().catch(err => {
  console.error('❌ Error running audit:', err);
  process.exit(1);
});
