#!/usr/bin/env node

/**
 * Import News from CSV
 * Imports news articles from WordPress export CSV
 * Converts WordPress blocks to Markdown and creates news content files
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const CSV_FILE = './News-amp-Events-Export-2025-October-17-0705.csv';
const OUTPUT_DIR = './src/content/news';
const IMAGES_DIR = './public/images/news';

// Helper to create slug from title
function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to clean and escape YAML strings
function cleanYaml(str) {
  if (!str || str.trim() === '') return '';
  // Escape quotes and handle multi-line strings
  return str.replace(/"/g, '\\"').trim();
}

// Convert WordPress blocks to Markdown
function wordPressBlocksToMarkdown(content) {
  if (!content) return '';

  let markdown = content;

  // Remove WordPress block comments
  markdown = markdown.replace(/<!-- \/?(wp:[\w\/-]+)(\s+\{[^}]*\})?\s*-->/g, '');

  // Convert headings
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1');

  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gs, '\n$1\n');

  // Convert lists
  markdown = markdown.replace(/<ul[^>]*>/g, '');
  markdown = markdown.replace(/<\/ul>/g, '\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gs, '- $1');

  // Convert links
  markdown = markdown.replace(/<a\s+href="([^"]+)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');

  // Convert strong/bold
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
  markdown = markdown.replace(/<b>(.*?)<\/b>/g, '**$1**');

  // Convert emphasis/italic
  markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');
  markdown = markdown.replace(/<i>(.*?)<\/i>/g, '*$1*');

  // Remove figure and figcaption tags but keep content
  markdown = markdown.replace(/<figure[^>]*>/g, '');
  markdown = markdown.replace(/<\/figure>/g, '\n');
  markdown = markdown.replace(/<figcaption[^>]*>(.*?)<\/figcaption>/gs, '\n*$1*\n');

  // Remove images from content (we'll handle them separately in frontmatter)
  markdown = markdown.replace(/<img[^>]*>/g, '');

  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');

  // Clean up multiple newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  // Decode HTML entities
  markdown = markdown
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '...');

  return markdown.trim();
}

// Extract image URLs from content and Image URL field
function extractImages(content, imageUrlField) {
  const images = [];

  // Extract from Image URL field (pipe-separated)
  if (imageUrlField) {
    const urlsFromField = imageUrlField.split('|').map(url => url.trim()).filter(Boolean);
    images.push(...urlsFromField);
  }

  // Extract from img tags in content
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    if (!images.includes(match[1])) {
      images.push(match[1]);
    }
  }

  return images;
}

// Extract filename from URL
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;

    // Get the last part of the path
    const filename = pathname.split('/').pop();

    // Clean up the filename
    return filename.replace(/[^a-zA-Z0-9.-]/g, '-');
  } catch (e) {
    return 'image-' + Date.now() + '.jpg';
  }
}

// Download image from URL
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fsSync.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(filepath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath).catch(() => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.abort();
      reject(new Error('Download timeout'));
    });
  });
}

// Parse date from CSV
function parseDate(dateStr) {
  if (!dateStr || dateStr === '1970-01-01') return new Date();
  return new Date(dateStr);
}

async function importNews() {
  console.log('📰 Importing News from CSV...\n');
  console.log('=' .repeat(60) + '\n');

  // Ensure output directories exist
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(IMAGES_DIR, { recursive: true });

  // Read CSV
  const csvContent = await fs.readFile(CSV_FILE, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true // Handle UTF-8 BOM
  });

  console.log(`✅ Loaded ${records.length} news articles from CSV\n`);
  console.log('📝 Processing articles...\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const downloadedImages = new Set();

  for (const article of records) {
    try {
      const title = article['Title'];
      if (!title || title.trim() === '') {
        skipped++;
        continue;
      }

      const slug = article['Slug'] || createSlug(title);
      const filePath = path.join(OUTPUT_DIR, `${slug}.md`);

      // Extract all images
      const imageUrls = extractImages(article['Content'] || '', article['Image URL']);
      const images = [];

      // Download images
      for (const imageUrl of imageUrls) {
        if (!imageUrl || downloadedImages.has(imageUrl)) {
          if (imageUrl && downloadedImages.has(imageUrl)) {
            // Already downloaded, just use the local path
            const filename = getFilenameFromUrl(imageUrl);
            images.push(`/images/news/${filename}`);
          }
          continue;
        }

        try {
          const filename = getFilenameFromUrl(imageUrl);
          const imagePath = path.join(IMAGES_DIR, filename);

          console.log(`  Downloading: ${filename}...`);
          await downloadImage(imageUrl, imagePath);

          downloadedImages.add(imageUrl);
          images.push(`/images/news/${filename}`);
        } catch (imgError) {
          console.warn(`  ⚠️  Failed to download image: ${imageUrl}`);
        }
      }

      // Parse content to markdown
      const markdown = wordPressBlocksToMarkdown(article['Content']);

      // Parse categories and tags
      const categories = article['Categories']
        ? article['Categories'].split(',').map(c => c.trim()).filter(Boolean)
        : [];

      const tags = article['Tags']
        ? article['Tags'].split(',').map(t => t.trim()).filter(Boolean)
        : [];

      // Parse dates
      const pubDate = parseDate(article['Date']);
      const updatedDate = article['Post Modified Date'] ? parseDate(article['Post Modified Date']) : null;

      // Build frontmatter
      const frontmatter = {
        title: title,
        description: article['Excerpt'] || markdown.substring(0, 160) || '',
        pubDate: pubDate.toISOString().split('T')[0],
        updatedDate: updatedDate ? updatedDate.toISOString().split('T')[0] : null,
        author: `${article['Author First Name'] || ''} ${article['Author Last Name'] || ''}`.trim() || 'AlbaniaVisit Team',
        categories: categories,
        tags: tags,
        featuredImage: images[0] || '',
        images: images,
        slug: slug,
        status: article['Status'] || 'publish',
        language: 'en',
      };

      // Generate YAML frontmatter
      const yamlLines = ['---'];
      yamlLines.push(`title: "${cleanYaml(frontmatter.title)}"`);
      yamlLines.push(`description: "${cleanYaml(frontmatter.description)}"`);
      yamlLines.push(`pubDate: ${frontmatter.pubDate}`);
      if (frontmatter.updatedDate) yamlLines.push(`updatedDate: ${frontmatter.updatedDate}`);
      yamlLines.push(`author: "${cleanYaml(frontmatter.author)}"`);

      if (frontmatter.categories.length > 0) {
        yamlLines.push(`categories:`);
        frontmatter.categories.forEach(c => yamlLines.push(`  - "${cleanYaml(c)}"`));
      }

      if (frontmatter.tags.length > 0) {
        yamlLines.push(`tags:`);
        frontmatter.tags.forEach(t => yamlLines.push(`  - "${cleanYaml(t)}"`));
      }

      if (frontmatter.featuredImage) yamlLines.push(`featuredImage: "${frontmatter.featuredImage}"`);

      if (frontmatter.images.length > 0) {
        yamlLines.push(`images:`);
        frontmatter.images.forEach(img => yamlLines.push(`  - "${img}"`));
      }

      yamlLines.push(`slug: "${frontmatter.slug}"`);
      yamlLines.push(`status: ${frontmatter.status}`);
      yamlLines.push(`language: ${frontmatter.language}`);
      yamlLines.push('---');
      yamlLines.push('');

      const fullContent = yamlLines.join('\n') + '\n' + markdown;

      // Check if file exists
      let fileExists = false;
      try {
        await fs.access(filePath);
        fileExists = true;
      } catch (e) {
        // File doesn't exist
      }

      // Write file
      await fs.writeFile(filePath, fullContent, 'utf-8');

      if (fileExists) {
        updated++;
        console.log(`  ✅ Updated: ${title}`);
      } else {
        created++;
        console.log(`  ✅ Created: ${title}`);
      }

    } catch (error) {
      console.error(`❌ Error processing article: ${error.message}`);
      skipped++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Import Summary:');
  console.log(`  Total articles in CSV: ${records.length}`);
  console.log(`  Files created: ${created}`);
  console.log(`  Files updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Images downloaded: ${downloadedImages.size}`);
  console.log(`\n✅ News import complete!`);

  console.log('\n💡 Next steps:');
  console.log('  1. Review the generated markdown files in src/content/news/');
  console.log('  2. Create a news layout template');
  console.log('  3. Create a news index page');
  console.log('  4. Add news to the site navigation');
}

importNews().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
