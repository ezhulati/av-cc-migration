/**
 * Markdown Generation Script
 * Converts WordPress content to Markdown with frontmatter
 */

import fs from 'fs/promises';
import path from 'path';
import TurndownService from 'turndown';
import yaml from 'js-yaml';

const DATA_DIR = './data';
const CONTENT_DIR = './src/content';

// Initialize Turndown (HTML to Markdown converter)
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

/**
 * Clean and convert HTML to Markdown
 */
function htmlToMarkdown(html) {
  if (!html) return '';

  // Remove WordPress-specific shortcodes (we'll handle these separately)
  let cleaned = html.replace(/\[caption[^\]]*\](.*?)\[\/caption\]/gs, '$1');

  // Convert to markdown
  const markdown = turndown.turndown(cleaned);

  return markdown.trim();
}

/**
 * Get language code
 */
function getLanguageCode(item) {
  const code = item.language?.code || 'EN';
  return code.toLowerCase().substring(0, 2);
}

/**
 * Generate frontmatter for posts
 */
function generatePostFrontmatter(post, mediaManifest) {
  const lang = getLanguageCode(post);

  // Find featured image in manifest
  const imageEntry = mediaManifest?.find(m => m.postSlug === post.slug);

  const frontmatter = {
    title: post.title,
    description: post.excerpt ? htmlToMarkdown(post.excerpt) : '',
    pubDate: post.date,
    updatedDate: post.modified || post.date,
    author: post.author?.node?.name || 'AlbaniaVisit Team',
    category: post.categories?.nodes?.[0]?.name || '',
    tags: post.tags?.nodes?.map(t => t.name) || [],
    featuredImage: imageEntry?.localPath || '',
    language: lang,
    slug: post.slug,
  };

  // Add SEO data if available
  if (post.seo) {
    frontmatter.seo = {
      metaTitle: post.seo.title || post.title,
      metaDescription: post.seo.metaDesc || '',
      canonicalURL: post.seo.canonical || `https://albaniavisit.com/${post.slug}/`,
    };
  }

  return frontmatter;
}

/**
 * Generate frontmatter for pages
 */
function generatePageFrontmatter(page, mediaManifest) {
  const lang = getLanguageCode(page);
  const imageEntry = mediaManifest?.find(m => m.postSlug === page.slug);

  return {
    title: page.title,
    description: page.content ? htmlToMarkdown(page.content).substring(0, 160) : '',
    featuredImage: imageEntry?.localPath || '',
    language: lang,
    slug: page.slug,
    seo: {
      metaTitle: page.seo?.title || page.title,
      metaDescription: page.seo?.metaDesc || '',
      canonicalURL: page.seo?.canonical || `https://albaniavisit.com/${page.slug}/`,
    },
  };
}

/**
 * Generate frontmatter for custom post types
 */
function generateCustomPostFrontmatter(item, contentType, mediaManifest) {
  const lang = getLanguageCode(item);
  const imageEntry = mediaManifest?.find(m => m.postSlug === item.slug);

  const baseFrontmatter = {
    title: item.title,
    description: item.content ? htmlToMarkdown(item.content).substring(0, 160) : '',
    featuredImage: imageEntry?.localPath || '',
    language: lang,
    slug: item.slug,
  };

  // Add type-specific fields
  if (contentType === 'accommodation') {
    baseFrontmatter.location = '';
    baseFrontmatter.amenities = [];
    baseFrontmatter.images = [];
  } else if (contentType === 'destinations') {
    baseFrontmatter.region = '';
    baseFrontmatter.images = [];
    baseFrontmatter.highlights = [];
  }

  return baseFrontmatter;
}

/**
 * Create markdown file
 */
async function createMarkdownFile(contentType, item, frontmatter, content) {
  const lang = getLanguageCode(item);
  const filename = `${item.slug}.md`;

  // Determine directory based on language
  let dir = path.join(CONTENT_DIR, contentType);

  // Create language subdirectories if needed
  // For now, we'll keep all in one directory and use frontmatter to distinguish
  await fs.mkdir(dir, { recursive: true });

  const filepath = path.join(dir, filename);

  // Generate markdown content
  const yamlFrontmatter = yaml.dump(frontmatter, { lineWidth: -1 });
  const markdown = `---\n${yamlFrontmatter}---\n\n${content}`;

  await fs.writeFile(filepath, markdown, 'utf-8');

  return filepath;
}

/**
 * Process content type
 */
async function processContentType(contentType, items, mediaManifest, generateFrontmatterFn) {
  console.log(`\n📝 Processing ${contentType}...`);

  let created = 0;
  let errors = 0;

  for (const item of items) {
    try {
      const frontmatter = generateFrontmatterFn(item, mediaManifest);
      const content = htmlToMarkdown(item.content || '');

      await createMarkdownFile(contentType, item, frontmatter, content);
      created++;

      if (created % 10 === 0) {
        console.log(`  ✓ Created ${created}/${items.length} files...`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${item.slug}:`, error.message);
      errors++;
    }
  }

  console.log(`\n  ✅ ${contentType} complete:`);
  console.log(`     Created: ${created}`);
  console.log(`     Errors: ${errors}`);
}

/**
 * Main function
 */
async function generateMarkdown() {
  console.log('🚀 Starting markdown generation...\n');

  // Load content inventory
  let contentData;
  try {
    const inventoryPath = path.join(DATA_DIR, 'content-inventory.json');
    const inventoryContent = await fs.readFile(inventoryPath, 'utf-8');
    contentData = JSON.parse(inventoryContent);
  } catch (error) {
    console.error('❌ Could not load content-inventory.json');
    console.error('   Run: npm run migrate:extract first');
    process.exit(1);
  }

  // Load media manifest
  let mediaManifest = {};
  try {
    const manifestPath = path.join(DATA_DIR, 'media-inventory.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    mediaManifest = JSON.parse(manifestContent);
  } catch (error) {
    console.warn('⚠️  No media-inventory.json found. Images may not be linked correctly.');
    console.warn('   Run: npm run migrate:images first');
  }

  // Process each content type
  if (contentData.posts?.length > 0) {
    await processContentType(
      'posts',
      contentData.posts,
      mediaManifest.posts || [],
      generatePostFrontmatter
    );
  }

  if (contentData.pages?.length > 0) {
    await processContentType(
      'pages',
      contentData.pages,
      mediaManifest.pages || [],
      generatePageFrontmatter
    );
  }

  // Custom post types
  const customTypes = ['accommodation', 'destinations', 'activities', 'attractions', 'tours'];

  for (const type of customTypes) {
    if (contentData[type]?.length > 0) {
      await processContentType(
        type,
        contentData[type],
        mediaManifest[type] || [],
        (item, manifest) => generateCustomPostFrontmatter(item, type, manifest)
      );
    }
  }

  console.log('\n✅ Markdown generation complete!');
  console.log('\nNext steps:');
  console.log('  1. Review generated markdown files in src/content/');
  console.log('  2. Run: npm run dev');
  console.log('  3. Test the site locally');
}

// Run
generateMarkdown().catch(error => {
  console.error('❌ Markdown generation failed:', error);
  process.exit(1);
});
