#!/usr/bin/env node

/**
 * Enhance Accommodation Data
 *
 * Updates accommodation markdown files with missing data from CSV export:
 * - Descriptions
 * - Rating words (generated from scores)
 * - Location data
 * - Number of reviews
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(PROJECT_ROOT, 'Accommodation-Export-2025-October-17-0507.csv');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/accommodation');
const AUDIT_REPORT_PATH = path.join(PROJECT_ROOT, 'data/accommodation-audit-report.json');

// Statistics
const stats = {
  totalProcessed: 0,
  descriptionsAdded: 0,
  ratingWordsAdded: 0,
  locationsAdded: 0,
  reviewCountsAdded: 0,
  errors: []
};

/**
 * Generate rating words from numeric score
 */
function generateRatingWords(rating) {
  if (!rating || rating === 0) return '';

  const score = parseFloat(rating);

  if (score >= 9.5) return 'Exceptional';
  if (score >= 9.0) return 'Superb';
  if (score >= 8.5) return 'Excellent';
  if (score >= 8.0) return 'Very Good';
  if (score >= 7.5) return 'Good';
  if (score >= 7.0) return 'Pleasant';
  if (score >= 6.0) return 'Okay';
  return 'Fair';
}

/**
 * Parse CSV file
 */
function parseCSV(csvPath) {
  console.log('📄 Reading CSV file...');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

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

  console.log(`   Parsed ${rows.length} accommodation entries\n`);
  return { header, rows };
}

/**
 * Extract location from categories
 */
function extractLocation(categories) {
  if (!categories) return '';

  // Categories are typically like "4-Star|Tirana" or "Hotel|Berat"
  const parts = categories.split('|');

  // Look for known cities/regions
  const cities = [
    'Tirana', 'Durrës', 'Vlorë', 'Sarandë', 'Shkodër',
    'Berat', 'Gjirokastër', 'Korçë', 'Elbasan', 'Fier',
    'Kavajë', 'Lushnjë', 'Pogradec', 'Kukës', 'Krujë',
    'Dhërmi', 'Himara', 'Ksamil', 'Velipojë', 'Borsh'
  ];

  for (const part of parts) {
    const trimmed = part.trim();
    if (cities.some(city => trimmed.includes(city))) {
      return trimmed;
    }
  }

  return parts[parts.length - 1]?.trim() || '';
}

/**
 * Clean HTML from description
 */
function cleanHTML(html) {
  if (!html) return '';

  return html
    .replace(/<[^>]*>/g, '')           // Remove HTML tags
    .replace(/&nbsp;/g, ' ')           // Replace &nbsp;
    .replace(/&amp;/g, '&')            // Replace &amp;
    .replace(/&quot;/g, '"')           // Replace &quot;
    .replace(/&#8217;/g, "'")          // Replace &#8217;
    .replace(/&#8211;/g, "–")          // Replace &#8211;
    .replace(/&#8212;/g, "—")          // Replace &#8212;
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();
}

/**
 * Update frontmatter in markdown file
 */
function updateFrontmatter(filePath, updates) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    return false;
  }

  let frontmatter = frontmatterMatch[1];

  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') continue;

    // Format value based on type
    let formattedValue;
    if (typeof value === 'string') {
      const escapedValue = value.replace(/"/g, '\\"');
      formattedValue = `"${escapedValue}"`;
    } else if (typeof value === 'number') {
      formattedValue = value;
    } else {
      formattedValue = `"${value}"`;
    }

    const regex = new RegExp(`^${key}:.*$`, 'm');

    if (regex.test(frontmatter)) {
      // Update existing field
      frontmatter = frontmatter.replace(
        regex,
        `${key}: ${formattedValue}`
      );
    } else {
      // Add new field after a related field or at the end
      // Find a good place to insert (after numberOfReviews or ratings)
      const insertAfter = key === 'rating' || key === 'ratingWords'
        ? /^numberOfReviews:.*$/m
        : /^slug:.*$/m;

      if (insertAfter.test(frontmatter)) {
        frontmatter = frontmatter.replace(
          insertAfter,
          (match) => `${match}\n${key}: ${formattedValue}`
        );
      } else {
        // Add at the end
        frontmatter += `\n${key}: ${formattedValue}`;
      }
    }
  }

  content = content.replace(
    /^---\n[\s\S]*?\n---/,
    `---\n${frontmatter}\n---`
  );

  fs.writeFileSync(filePath, content);
  return true;
}

/**
 * Process a single accommodation file
 */
function processAccommodation(slug, csvData) {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const updates = {};
  let changesMade = false;

  // Check if description is missing
  if (content.includes('description: ""') || content.includes('description: \'\'')) {
    const description = cleanHTML(csvData['Excerpt'] || csvData['Content'] || '');
    if (description && description.length > 20) {
      updates.description = description.substring(0, 300); // Limit length
      stats.descriptionsAdded++;
      changesMade = true;
    }
  }

  // Check if ratingWords is missing or empty
  if (!content.includes('ratingWords:') || content.includes('ratingWords: ""') || content.includes('ratingWords: \'\'')) {
    // Try to get rating from 'rating' field first, then from 'overall' rating
    let ratingValue = null;
    const ratingMatch = content.match(/^rating: (\d+\.?\d*)$/m);
    if (ratingMatch) {
      ratingValue = ratingMatch[1];
    } else {
      const overallMatch = content.match(/overall: (\d+\.?\d*)/);
      if (overallMatch && parseFloat(overallMatch[1]) > 0) {
        ratingValue = overallMatch[1];
      }
    }

    if (ratingValue && parseFloat(ratingValue) > 0) {
      const ratingWords = generateRatingWords(ratingValue);
      updates.ratingWords = ratingWords;

      // Also add rating field if it doesn't exist
      if (!content.includes('rating:') || content.includes('rating: 0')) {
        updates.rating = parseFloat(ratingValue);
      }

      stats.ratingWordsAdded++;
      changesMade = true;
    }
  }

  // Check if location is missing
  if (content.includes('location: ""') || content.includes('location: \'\'')) {
    const location = extractLocation(csvData['Categories']);
    if (location) {
      updates.location = location;
      stats.locationsAdded++;
      changesMade = true;
    }
  }

  // Update file if changes were made
  if (changesMade && Object.keys(updates).length > 0) {
    updateFrontmatter(filePath, updates);
    stats.totalProcessed++;
    return true;
  }

  return false;
}

/**
 * Main function
 */
function main() {
  console.log('📊 Accommodation Data Enhancement\n');
  console.log('='.repeat(60));

  // Read CSV
  const { rows: csvRows } = parseCSV(CSV_PATH);

  // Create a map of slug -> CSV data
  const csvMap = new Map();
  for (const row of csvRows) {
    const slug = row['Post Slug'] || row['Slug'] || '';
    if (slug) {
      csvMap.set(slug, row);
    }
  }

  console.log(`📦 Processing ${csvMap.size} accommodations...\n`);

  // Read audit report to get incomplete accommodations
  let incompleteAccommodations = [];
  if (fs.existsSync(AUDIT_REPORT_PATH)) {
    const auditReport = JSON.parse(fs.readFileSync(AUDIT_REPORT_PATH, 'utf-8'));
    incompleteAccommodations = auditReport.incompleteAccommodations || [];
    console.log(`🔍 Found ${incompleteAccommodations.length} incomplete accommodations from audit\n`);
  }

  // Process incomplete accommodations first
  console.log('Processing incomplete accommodations...');
  let processed = 0;

  for (const incomplete of incompleteAccommodations) {
    const csvData = csvMap.get(incomplete.slug);
    if (csvData) {
      if (processAccommodation(incomplete.slug, csvData)) {
        processed++;
        if (processed % 100 === 0) {
          console.log(`   Processed ${processed}...`);
        }
      }
    }
  }

  // Also process all other accommodations
  console.log('\nProcessing all accommodations for missing data...');

  for (const [slug, csvData] of csvMap) {
    if (processAccommodation(slug, csvData)) {
      processed++;
      if (processed % 100 === 0) {
        console.log(`   Processed ${processed}...`);
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ENHANCEMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total accommodations processed: ${stats.totalProcessed}`);
  console.log(`Descriptions added: ${stats.descriptionsAdded}`);
  console.log(`Rating words added: ${stats.ratingWordsAdded}`);
  console.log(`Locations added: ${stats.locationsAdded}`);
  console.log(`Review counts added: ${stats.reviewCountsAdded}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${stats.errors.length}`);
    stats.errors.slice(0, 10).forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.slug}: ${err.error}`);
    });
  }

  console.log('\n✅ Data enhancement complete!');
  console.log('='.repeat(60));
}

main();
