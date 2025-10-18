#!/usr/bin/env node

/**
 * Research Reports Import Script
 * Imports research reports from WordPress CSV export to Astro content collections
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '../Research-Reports-Export-2025-October-17-0802.csv');
const CONTENT_DIR = path.join(__dirname, '../src/content/research');
const IMAGES_DIR = path.join(__dirname, '../public/images/research');

// Ensure directories exist
if (!fs.existsSync(CONTENT_DIR)) {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Convert WordPress blocks to Markdown
 */
function wordPressBlocksToMarkdown(content) {
  if (!content) return '';

  // Remove WordPress block comments
  let markdown = content.replace(/<!-- \/wp:[a-z-]+(?:\s+[^>]+)? -->/g, '');
  markdown = markdown.replace(/<!-- wp:[a-z-]+(?:\s+[^>]+)? -->/g, '');

  // Convert headings
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1');

  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n');

  // Convert lists
  markdown = markdown.replace(/<ul[^>]*>/g, '');
  markdown = markdown.replace(/<\/ul>/g, '\n');
  markdown = markdown.replace(/<ol[^>]*>/g, '');
  markdown = markdown.replace(/<\/ol>/g, '\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/g, '- $1');

  // Convert links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');

  // Convert strong/bold
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**');
  markdown = markdown.replace(/<b>(.*?)<\/b>/g, '**$1**');

  // Convert em/italic
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*');
  markdown = markdown.replace(/<i>(.*?)<\/i>/g, '*$1*');

  // Convert code
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`');

  // Convert blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, '> $1');

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#039;/g, "'");
  markdown = markdown.replace(/&#8217;/g, "'");
  markdown = markdown.replace(/&#8216;/g, "'");
  markdown = markdown.replace(/&#8220;/g, '"');
  markdown = markdown.replace(/&#8221;/g, '"');
  markdown = markdown.replace(/&nbsp;/g, ' ');

  // Clean up extra newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();

  return markdown;
}

/**
 * Download image from URL
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(filepath)) {
      console.log(`  ✓ Image already exists: ${path.basename(filepath)}`);
      return resolve(true);
    }

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        console.log(`  ⚠ Failed to download: ${url} (${response.statusCode})`);
        return resolve(false);
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`  ✓ Downloaded: ${path.basename(filepath)}`);
        resolve(true);
      });

      fileStream.on('error', (err) => {
        fs.unlinkSync(filepath);
        console.error(`  ✗ Error downloading: ${url}`, err.message);
        reject(err);
      });
    }).on('error', (err) => {
      console.error(`  ✗ Error downloading: ${url}`, err.message);
      reject(err);
    });
  });
}

/**
 * Extract images from content and Image URL field
 */
function extractImages(content, imageUrlField) {
  const images = [];

  // Extract from Image URL field (pipe-separated)
  if (imageUrlField) {
    const urls = imageUrlField.split('|').filter(url => url.trim());
    images.push(...urls);
  }

  // Extract from img tags in content
  if (content) {
    const imgRegex = /<img[^>]+src="([^">]+)"/g;
    let match;
    while ((match = imgRegex.exec(content)) !== null) {
      images.push(match[1]);
    }
  }

  return [...new Set(images)]; // Remove duplicates
}

/**
 * Generate excerpt from content
 */
function generateExcerpt(content, maxLength = 160) {
  const text = content.replace(/<[^>]+>/g, '').trim();
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).split(' ').slice(0, -1).join(' ') + '...';
}

/**
 * Main import function
 */
async function importResearchReports() {
  console.log('📊 Starting Research Reports Import...\n');

  // Read and parse CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true
  });

  console.log(`Found ${records.length} research reports in CSV\n`);

  let imported = 0;
  let errors = 0;
  let imageCount = 0;

  for (const record of records) {
    try {
      console.log(`Processing: ${record.Title}`);

      // Skip drafts
      if (record.Status !== 'publish') {
        console.log(`  ⊘ Skipped (not published)\n`);
        continue;
      }

      const slug = record.Slug || record.Title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `${slug}.md`;
      const filepath = path.join(CONTENT_DIR, filename);

      // Extract and download images
      const images = extractImages(record.Content, record['Image URL']);
      let featuredImage = '';

      if (images.length > 0) {
        // Download featured image (first image)
        const firstImageUrl = images[0];
        const ext = path.extname(new URL(firstImageUrl).pathname) || '.jpg';
        const imageName = `${slug}${ext}`;
        const imagePath = path.join(IMAGES_DIR, imageName);

        try {
          await downloadImage(firstImageUrl, imagePath);
          featuredImage = `/images/research/${imageName}`;
          imageCount++;
        } catch (err) {
          console.log(`  ⚠ Could not download featured image`);
        }
      }

      // Convert content to Markdown
      const markdownContent = wordPressBlocksToMarkdown(record.Content);

      // Generate description from excerpt or content
      const description = record.Excerpt
        ? wordPressBlocksToMarkdown(record.Excerpt).substring(0, 160)
        : generateExcerpt(markdownContent, 160);

      // Create frontmatter
      const frontmatter = {
        title: record.Title,
        description: description,
        pubDate: record.Date || new Date().toISOString().split('T')[0],
        author: `${record['Author First Name'] || ''} ${record['Author Last Name'] || ''}`.trim() || 'AlbaniaVisit',
        featuredImage: featuredImage || undefined,
        category: 'International Tourism Research', // Default category
        slug: slug,
        status: 'publish',
        language: 'en',
        seo: {
          metaTitle: record.Title,
          metaDescription: description,
          canonicalURL: `https://albaniavisit.com/research/${slug}/`
        }
      };

      // Generate markdown file
      const fileContent = `---
${Object.entries(frontmatter)
  .filter(([_, value]) => value !== undefined)
  .map(([key, value]) => {
    if (typeof value === 'object') {
      return `${key}:\n${Object.entries(value).map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`).join('\n')}`;
    }
    return `${key}: ${JSON.stringify(value)}`;
  })
  .join('\n')}
---

${markdownContent}
`;

      fs.writeFileSync(filepath, fileContent, 'utf-8');
      console.log(`  ✓ Created: ${filename}`);
      imported++;

    } catch (err) {
      console.error(`  ✗ Error processing: ${record.Title}`, err.message);
      errors++;
    }

    console.log('');
  }

  console.log('═'.repeat(50));
  console.log(`✅ Import Complete!`);
  console.log(`   Reports imported: ${imported}`);
  console.log(`   Images downloaded: ${imageCount}`);
  console.log(`   Errors: ${errors}`);
  console.log('═'.repeat(50));
}

// Run import
importResearchReports().catch(console.error);
