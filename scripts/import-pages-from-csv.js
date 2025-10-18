#!/usr/bin/env node

/**
 * Import Pages from CSV
 * Imports pages from WordPress export CSV
 * Converts WordPress blocks to Markdown and creates page content files
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const CSV_FILE = './Pages-Export-2025-October-18-1723.csv';
const OUTPUT_DIR = './src/content/pages';
const IMAGES_DIR = './public/images/pages';

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
  // Remove newlines and extra whitespace
  let cleaned = str.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  // If contains quotes or special chars, wrap in quotes and escape
  if (cleaned.includes('"') || cleaned.includes(':') || cleaned.includes('#')) {
    cleaned = cleaned.replace(/"/g, '\\"');
    return `"${cleaned}"`;
  }
  return cleaned;
}

// Convert WordPress blocks to Markdown
function wordPressBlocksToMarkdown(content) {
  if (!content) return '';

  let markdown = content;

  // Remove WordPress block comments
  markdown = markdown.replace(/<!-- \/?(wp:[\w\/-]+)(\s+\{[^}]*\})?\s*-->/g, '');

  // Convert headings
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/g, '##### $1');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/g, '###### $1');

  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gs, '\n$1\n');

  // Convert ordered lists
  markdown = markdown.replace(/<ol[^>]*>/g, '');
  markdown = markdown.replace(/<\/ol>/g, '\n');

  // Convert unordered lists
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

  // Convert blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, (match, content) => {
    return content.split('\n').map(line => '> ' + line.trim()).join('\n');
  });

  // Convert code blocks
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs, '```\n$1\n```');
  markdown = markdown.replace(/<code>(.*?)<\/code>/g, '`$1`');

  // Convert line breaks
  markdown = markdown.replace(/<br\s*\/?>/g, '\n');

  // Remove figure and figcaption tags but keep content
  markdown = markdown.replace(/<figure[^>]*>/g, '');
  markdown = markdown.replace(/<\/figure>/g, '\n');
  markdown = markdown.replace(/<figcaption[^>]*>(.*?)<\/figcaption>/gs, '\n*$1*\n');

  // Remove images from content (we'll handle them separately in frontmatter)
  markdown = markdown.replace(/<img[^>]*>/g, '');

  // Remove div and span tags but keep content
  markdown = markdown.replace(/<\/?div[^>]*>/g, '');
  markdown = markdown.replace(/<\/?span[^>]*>/g, '');

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
    .replace(/&hellip;/g, '...')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—');

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
    let filename = pathname.split('/').pop();

    // Remove query parameters if present
    filename = filename.split('?')[0];

    // Clean up the filename - preserve extension
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, '-');

    return cleanName + ext;
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
        fsSync.unlink(filepath, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

// Generate excerpt from content
function generateExcerpt(content, maxLength = 160) {
  if (!content) return '';

  // Strip HTML and get plain text
  let text = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  // Truncate to max length
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
    // Cut at last word boundary
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > 0) {
      text = text.substring(0, lastSpace);
    }
    text += '...';
  }

  return text;
}

// Determine language from URL
function getLanguageFromUrl(url) {
  if (url.includes('/sq/')) {
    return 'sq';
  }
  return 'en';
}

// Main import function
async function importPages() {
  console.log('🚀 Starting pages import...\n');

  try {
    // Read CSV file
    console.log('📖 Reading CSV file...');
    const csvContent = await fs.readFile(CSV_FILE, 'utf-8');

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    });

    console.log(`📊 Found ${records.length} pages to import\n`);

    // Ensure output directories exist
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.mkdir(IMAGES_DIR, { recursive: true });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each page
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const pageNum = i + 1;

      try {
        const title = record.Title || 'Untitled';
        const content = record.Content || '';
        const excerpt = record.Excerpt || generateExcerpt(content);
        const permalink = record.Permalink || '';
        const imageUrl = record['Image URL'] || '';
        const slug = record.Slug || createSlug(title);
        const status = record.Status || 'draft';

        // Skip non-published pages unless you want to include drafts
        if (status !== 'publish') {
          console.log(`⏭️  [${pageNum}/${records.length}] Skipping "${title}" (status: ${status})`);
          continue;
        }

        console.log(`📝 [${pageNum}/${records.length}] Processing: ${title}`);

        // Determine language
        const language = getLanguageFromUrl(permalink);

        // Convert content to markdown
        const markdownContent = wordPressBlocksToMarkdown(content);

        // Extract and download images
        const images = extractImages(content, imageUrl);
        let featuredImage = '';

        if (images.length > 0) {
          console.log(`   📸 Found ${images.length} image(s)`);

          // Download first image as featured image
          const firstImageUrl = images[0];
          const filename = getFilenameFromUrl(firstImageUrl);
          const imagePath = path.join(IMAGES_DIR, filename);

          try {
            if (!fsSync.existsSync(imagePath)) {
              await downloadImage(firstImageUrl, imagePath);
              console.log(`   ✅ Downloaded: ${filename}`);
            } else {
              console.log(`   ⏭️  Already exists: ${filename}`);
            }
            featuredImage = `/images/pages/${filename}`;
          } catch (err) {
            console.log(`   ⚠️  Failed to download image: ${err.message}`);
          }

          // Download additional images if any
          for (let j = 1; j < Math.min(images.length, 5); j++) {
            const imageUrl = images[j];
            const filename = getFilenameFromUrl(imageUrl);
            const imagePath = path.join(IMAGES_DIR, filename);

            try {
              if (!fsSync.existsSync(imagePath)) {
                await downloadImage(imageUrl, imagePath);
              }
            } catch (err) {
              // Silently skip failed additional images
            }
          }
        }

        // Build frontmatter
        const description = excerpt || generateExcerpt(content) || `${title} - AlbaniaVisit.com`;
        const frontmatter = {
          title: title,
          description: description,
          ...(featuredImage && { featuredImage }),
          language,
          slug,
          seo: {
            canonicalURL: permalink || `https://albaniavisit.com/${slug}/`,
          },
        };

        // Generate markdown file
        let markdown = '---\n';

        // Add frontmatter fields
        markdown += `title: ${cleanYaml(frontmatter.title)}\n`;
        markdown += `description: ${cleanYaml(frontmatter.description)}\n`;
        if (frontmatter.featuredImage) {
          markdown += `featuredImage: "${frontmatter.featuredImage}"\n`;
        }
        markdown += `language: ${frontmatter.language}\n`;
        markdown += `slug: ${frontmatter.slug}\n`;
        markdown += `seo:\n`;
        markdown += `  canonicalURL: ${frontmatter.seo.canonicalURL}\n`;

        markdown += '---\n\n';
        markdown += markdownContent;

        // Write to file
        const filename = `${slug}.md`;
        const filepath = path.join(OUTPUT_DIR, filename);
        await fs.writeFile(filepath, markdown, 'utf-8');

        console.log(`   ✅ Created: ${filename}\n`);
        successCount++;

      } catch (err) {
        console.error(`   ❌ Error processing page: ${err.message}\n`);
        errors.push({ title: record.Title, error: err.message });
        errorCount++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📄 Total processed: ${records.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.title}: ${err.error}`);
      });
    }

    console.log('\n✨ Import complete!');

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
importPages();
