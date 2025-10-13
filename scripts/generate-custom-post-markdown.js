import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TurndownService from 'turndown';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Turndown with custom rules
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**'
});

// Add custom rules to clean up WordPress-specific HTML
turndownService.addRule('removeComments', {
  filter: function (node) {
    return node.nodeType === 8; // Comment node
  },
  replacement: function () {
    return '';
  }
});

turndownService.addRule('cleanWordPressClasses', {
  filter: function (node) {
    return node.className && typeof node.className === 'string' &&
           (node.className.includes('wp-block') ||
            node.className.includes('rank-math') ||
            node.className.includes('htwth-helpful'));
  },
  replacement: function (content, node) {
    // Strip WordPress classes but keep content
    return content;
  }
});

// Remove WordPress-specific interactive elements
turndownService.addRule('removeWordPressWidgets', {
  filter: ['button', 'script', 'style'],
  replacement: function () {
    return '';
  }
});

// Utility function to clean text
function cleanText(text) {
  if (!text) return '';

  return text
    .replace(/<\/?p>/g, '') // Remove <p> and </p> tags
    .replace(/<\/?[^>]+(>|$)/g, '') // Remove any remaining HTML tags
    .replace(/&#038;/g, '&')  // &amp; encoded
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Clean up markdown content
function cleanMarkdown(markdown) {
  return markdown
    // Remove empty headings
    .replace(/#{1,6}\s*\n/g, '')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove WordPress data attributes
    .replace(/data-wp-[a-z-]+="[^"]*"/g, '')
    // Remove inline styles
    .replace(/style="[^"]*"/g, '')
    // Remove WordPress CSS classes in markdown
    .replace(/class="[^"]*wp-[^"]*"/g, '')
    // Clean up image URLs - keep only the base URL
    .replace(/\?strip=all&lossy=1&ssl=1/g, '')
    .replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)/gi, '.$1')
    // Remove srcset attributes in markdown
    .replace(/srcset="[^"]*"/g, '')
    // Remove sizes attributes
    .replace(/sizes="[^"]*"/g, '')
    .trim();
}

// Extract first category name from categories array
function extractCategory(categories, type) {
  if (!categories || categories.length === 0) return '';

  // For destinations, prefer region-related categories
  if (type === 'destinations') {
    const regionKeywords = ['Albania', 'Northern', 'Southern', 'Central', 'Coastal', 'Mountain', 'Riviera'];
    const regionCategory = categories.find(cat =>
      regionKeywords.some(keyword => cat.name.includes(keyword))
    );
    return regionCategory ? regionCategory.name : categories[0].name;
  }

  // For activities and attractions, just use the first category
  return categories[0].name;
}

// Generate frontmatter for destinations
function generateDestinationFrontmatter(item) {
  const region = extractCategory(item.categories, 'destinations');
  const featuredImageUrl = item.featuredImage?.sourceUrl || '';
  const imagePath = featuredImageUrl ? `/images/destinations/${item.slug}.jpg` : '';

  return `---
title: "${cleanText(item.title)}"
description: "${cleanText(item.excerpt)}"
region: "${region}"
featuredImage: "${imagePath}"
images: []
coordinates:
  lat: 0
  lng: 0
language: "${item.language?.code || 'en'}"
slug: "${item.slug}"
highlights: []
---`;
}

// Generate frontmatter for activities
function generateActivityFrontmatter(item) {
  const category = extractCategory(item.categories, 'activities');
  const featuredImageUrl = item.featuredImage?.sourceUrl || '';
  const imagePath = featuredImageUrl ? `/images/activities/${item.slug}.jpg` : '';

  return `---
title: "${cleanText(item.title)}"
description: "${cleanText(item.excerpt)}"
category: "${category}"
featuredImage: "${imagePath}"
language: "${item.language?.code || 'en'}"
slug: "${item.slug}"
---`;
}

// Generate frontmatter for attractions
function generateAttractionFrontmatter(item) {
  const type = extractCategory(item.categories, 'attractions');
  const featuredImageUrl = item.featuredImage?.sourceUrl || '';
  const imagePath = featuredImageUrl ? `/images/attractions/${item.slug}.jpg` : '';

  return `---
title: "${cleanText(item.title)}"
description: "${cleanText(item.excerpt)}"
type: "${type}"
location: ""
featuredImage: "${imagePath}"
images: []
language: "${item.language?.code || 'en'}"
slug: "${item.slug}"
---`;
}

// Process a single content item
function processItem(item, type) {
  let frontmatter;

  switch(type) {
    case 'destinations':
      frontmatter = generateDestinationFrontmatter(item);
      break;
    case 'activities':
      frontmatter = generateActivityFrontmatter(item);
      break;
    case 'attractions':
      frontmatter = generateAttractionFrontmatter(item);
      break;
    default:
      throw new Error(`Unknown type: ${type}`);
  }

  // Convert HTML to markdown
  let markdown = '';
  if (item.content && item.content.trim()) {
    try {
      markdown = turndownService.turndown(item.content);
      markdown = cleanMarkdown(markdown);
    } catch (error) {
      console.error(`Error converting HTML to markdown for ${item.slug}:`, error.message);
      markdown = ''; // Use empty content if conversion fails
    }
  }

  return `${frontmatter}\n\n${markdown}`;
}

// Main processing function
function processContentType(type) {
  const dataDir = path.join(__dirname, '..', 'data');
  const contentDir = path.join(__dirname, '..', 'src', 'content', type);
  const jsonFile = path.join(dataDir, `${type}.json`);

  console.log(`\n📂 Processing ${type}...`);
  console.log(`   Reading from: ${jsonFile}`);

  // Check if JSON file exists
  if (!fs.existsSync(jsonFile)) {
    console.error(`   ❌ JSON file not found: ${jsonFile}`);
    return { success: 0, errors: 0 };
  }

  // Create content directory if it doesn't exist
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
    console.log(`   ✅ Created directory: ${contentDir}`);
  }

  // Read JSON data
  let data;
  try {
    const jsonContent = fs.readFileSync(jsonFile, 'utf-8');
    data = JSON.parse(jsonContent);
  } catch (error) {
    console.error(`   ❌ Error reading JSON file: ${error.message}`);
    return { success: 0, errors: 1 };
  }

  if (!Array.isArray(data)) {
    console.error(`   ❌ JSON data is not an array`);
    return { success: 0, errors: 1 };
  }

  console.log(`   📊 Found ${data.length} items`);

  let successCount = 0;
  let errorCount = 0;
  let sampleFrontmatter = null;

  // Process each item
  data.forEach((item, index) => {
    try {
      // Filter out non-English content
      if (item.language?.code !== 'en') {
        return;
      }

      const markdown = processItem(item, type);
      const filename = path.join(contentDir, `${item.slug}.md`);

      fs.writeFileSync(filename, markdown, 'utf-8');
      successCount++;

      // Save first item's frontmatter as sample
      if (!sampleFrontmatter) {
        const frontmatterEnd = markdown.indexOf('---', 3);
        sampleFrontmatter = markdown.substring(0, frontmatterEnd + 3);
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${item.slug}: ${error.message}`);
      errorCount++;
    }
  });

  console.log(`   ✅ Successfully created ${successCount} markdown files`);
  if (errorCount > 0) {
    console.log(`   ⚠️  ${errorCount} errors encountered`);
  }

  // Display sample frontmatter
  if (sampleFrontmatter) {
    console.log(`\n   📄 Sample frontmatter for ${type}:`);
    console.log('   ' + sampleFrontmatter.split('\n').join('\n   '));
  }

  return { success: successCount, errors: errorCount };
}

// Run the script
console.log('🚀 Starting Custom Post Type Markdown Generation...\n');
console.log('=' .repeat(60));

const results = {
  destinations: processContentType('destinations'),
  activities: processContentType('activities'),
  attractions: processContentType('attractions')
};

console.log('\n' + '='.repeat(60));
console.log('\n📊 SUMMARY:');
console.log('=' .repeat(60));
console.log(`Destinations: ${results.destinations.success} created, ${results.destinations.errors} errors`);
console.log(`Activities:   ${results.activities.success} created, ${results.activities.errors} errors`);
console.log(`Attractions:  ${results.attractions.success} created, ${results.attractions.errors} errors`);

const totalSuccess = results.destinations.success + results.activities.success + results.attractions.success;
const totalErrors = results.destinations.errors + results.activities.errors + results.attractions.errors;

console.log(`\nTotal: ${totalSuccess} markdown files created`);
if (totalErrors > 0) {
  console.log(`⚠️  Total errors: ${totalErrors}`);
}

console.log('\n✨ Done!');
