import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import https from 'https';
import http from 'http';

// Get collection name from command line argument
const collectionName = process.argv[2] || 'activities';
const CONTENT_DIR = `src/content/${collectionName}`;
const IMAGES_DIR = `public/images/${collectionName}`;
const CRAWL_FILE = 'internal_all.csv';
const RANKMATH_FILE = 'visitalbania_rank-math-2025-10-14_02-47-36.csv';

console.log(`🔄 Enhancing ${collectionName} collection with Screaming Frog + RankMath data\n`);

/**
 * Read and parse CSV files
 */
function loadCSVData() {
  console.log('📊 Loading CSV data...\n');

  // Load Screaming Frog data
  let crawlData = fs.readFileSync(CRAWL_FILE, 'utf8');
  if (crawlData.charCodeAt(0) === 0xFEFF) {
    crawlData = crawlData.slice(1);
  }

  const crawlRecords = parse(crawlData, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true
  });

  // Filter for this collection
  const items = crawlRecords.filter(r =>
    r.Address &&
    r.Address.includes(`/${collectionName}/`) &&
    r['Status Code'] === '200' &&
    !r.Address.includes('/sq/') &&
    !r.Address.includes('/page/')
  );

  console.log(`  Found ${items.length} ${collectionName} in Screaming Frog data`);

  // Load RankMath data
  let rankMathData = fs.readFileSync(RANKMATH_FILE, 'utf8');
  if (rankMathData.charCodeAt(0) === 0xFEFF) {
    rankMathData = rankMathData.slice(1);
  }

  const rankMathRecords = parse(rankMathData, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`  Found ${rankMathRecords.length} total RankMath records\n`);

  return { crawl: items, rankMath: rankMathRecords };
}

/**
 * Download image from URL
 */
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Extract featured image URL from HTML page
 */
async function fetchFeaturedImageFromPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        // Look for og:image meta tag
        const ogImageMatch = data.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
        if (ogImageMatch) {
          resolve(ogImageMatch[1]);
          return;
        }

        // Look for featured image in WordPress
        const wpImageMatch = data.match(/wp-post-image[^>]+src="([^"]+)"/i);
        if (wpImageMatch) {
          resolve(wpImageMatch[1]);
          return;
        }

        resolve(null);
      });
    }).on('error', reject);
  });
}

/**
 * Process each markdown file
 */
async function enhanceCollection() {
  const { crawl, rankMath } = loadCSVData();

  // Create images directory if it doesn't exist
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log(`📁 Created directory: ${IMAGES_DIR}\n`);
  }

  if (!fs.existsSync(CONTENT_DIR)) {
    console.log(`❌ Content directory not found: ${CONTENT_DIR}\n`);
    return;
  }

  const mdFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));

  console.log(`📝 Processing ${mdFiles.length} ${collectionName} markdown files...\n`);

  let updated = 0;
  let imagesDownloaded = 0;
  let errors = [];

  for (const mdFile of mdFiles) {
    const slug = path.basename(mdFile, '.md');
    const filePath = path.join(CONTENT_DIR, mdFile);

    console.log(`\n🔄 Processing: ${slug}`);

    // Find matching crawl data
    const crawlMatch = crawl.find(r => {
      const urlSlug = new URL(r.Address).pathname.split('/').filter(Boolean).pop();
      return urlSlug === slug;
    });

    if (!crawlMatch) {
      console.log(`  ⚠️  No crawl data found`);
      continue;
    }

    // Find matching RankMath data
    const rankMathMatch = rankMath.find(r => r.slug === slug);

    // Read current markdown file
    let content = fs.readFileSync(filePath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      console.log(`  ⚠️  No frontmatter found`);
      continue;
    }

    let frontmatter = frontmatterMatch[1];
    let needsUpdate = false;

    // Try to get featured image from live page
    try {
      console.log(`  🔍 Fetching featured image from live page...`);
      const featuredImageUrl = await fetchFeaturedImageFromPage(crawlMatch.Address);

      if (featuredImageUrl) {
        console.log(`  ✅ Found: ${featuredImageUrl}`);

        // Download the image
        const imageExt = path.extname(new URL(featuredImageUrl).pathname) || '.jpg';
        const localImageName = `${slug}${imageExt}`;
        const localImagePath = path.join(IMAGES_DIR, localImageName);

        if (!fs.existsSync(localImagePath)) {
          console.log(`  ⬇️  Downloading image...`);
          await downloadImage(featuredImageUrl, localImagePath);
          imagesDownloaded++;
          console.log(`  ✅ Downloaded to: ${localImageName}`);
        } else {
          console.log(`  ℹ️  Image already exists: ${localImageName}`);
        }

        // Update frontmatter
        const newImagePath = `/images/${collectionName}/${localImageName}`;
        frontmatter = frontmatter.replace(
          /featuredImage:\s*"[^"]*"/,
          `featuredImage: "${newImagePath}"`
        );
        needsUpdate = true;
      } else {
        console.log(`  ⚠️  No featured image found on page`);
      }
    } catch (error) {
      console.log(`  ❌ Error fetching image: ${error.message}`);
      errors.push({ slug, error: error.message });
    }

    // Update SEO metadata from RankMath
    if (rankMathMatch) {
      console.log(`  📊 Updating SEO metadata from RankMath...`);

      if (rankMathMatch.seo_title) {
        frontmatter = frontmatter.replace(
          /metaTitle:\s*"[^"]*"/,
          `metaTitle: "${rankMathMatch.seo_title.replace(/"/g, '\\"')}"`
        );
        needsUpdate = true;
      }

      if (rankMathMatch.seo_description) {
        frontmatter = frontmatter.replace(
          /metaDescription:\s*"[^"]*"/,
          `metaDescription: "${rankMathMatch.seo_description.replace(/"/g, '\\"')}"`
        );
        needsUpdate = true;
      }

      if (rankMathMatch.focus_keyword) {
        frontmatter = frontmatter.replace(
          /focusKeyword:\s*"[^"]*"/,
          `focusKeyword: "${rankMathMatch.focus_keyword.replace(/"/g, '\\"')}"`
        );
        needsUpdate = true;
      }
    }

    // Update metadata from Screaming Frog crawl
    if (crawlMatch['Title 1'] && crawlMatch['Title 1'] !== slug) {
      frontmatter = frontmatter.replace(
        /title:\s*.*/,
        `title: "${crawlMatch['Title 1'].replace(/"/g, '\\"')}"`
      );
      needsUpdate = true;
    }

    if (crawlMatch['Meta Description 1']) {
      frontmatter = frontmatter.replace(
        /description:\s*.*/,
        `description: "${crawlMatch['Meta Description 1'].replace(/"/g, '\\"')}"`
      );
      needsUpdate = true;
    }

    // Write updated file
    if (needsUpdate) {
      content = content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
      fs.writeFileSync(filePath, content, 'utf8');
      updated++;
      console.log(`  ✅ Updated`);
    } else {
      console.log(`  ℹ️  No changes needed`);
    }

    // Small delay to avoid hammering the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${collectionName.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log(`Total items processed: ${mdFiles.length}`);
  console.log(`Files updated: ${updated}`);
  console.log(`Images downloaded: ${imagesDownloaded}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors encountered:');
    errors.slice(0, 10).forEach(e => console.log(`  - ${e.slug}: ${e.error}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
  }

  console.log(`\n✅ Enhancement of ${collectionName} complete!\n`);

  // Save summary
  const summary = {
    collection: collectionName,
    totalProcessed: mdFiles.length,
    updated,
    imagesDownloaded,
    errors: errors.length,
    errorDetails: errors
  };

  fs.writeFileSync(
    `data/${collectionName}-enhancement-summary.json`,
    JSON.stringify(summary, null, 2),
    'utf8'
  );
}

// Run
enhanceCollection().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
