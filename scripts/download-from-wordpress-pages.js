#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const PROJECT_ROOT = '/Users/ez/Desktop/AI Library/Apps/AV-CC';
const brokenImagesPath = path.join(PROJECT_ROOT, 'data', 'broken-featured-images.json');
const brokenImages = JSON.parse(fs.readFileSync(brokenImagesPath, 'utf8'));

const stats = {
  total: brokenImages.length,
  success: 0,
  failed: 0,
  errors: []
};

// Function to fetch HTML from WordPress page
async function fetchPageHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let html = '';
      response.on('data', (chunk) => html += chunk);
      response.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

// Function to extract featured image URL from HTML
function extractFeaturedImageURL(html) {
  // Try multiple patterns
  const patterns = [
    // Open Graph image
    /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    // Twitter card image
    /<meta\s+name="twitter:image"\s+content="([^"]+)"/i,
    // Featured image in content
    /<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^"]+)"/i,
    // Any large image in the content area
    /<img[^>]+src="([^"]+)"[^>]+class="[^"]*wp-post-image[^"]*"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Function to download image
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        const size = fs.statSync(outputPath).size;
        resolve({ success: true, size: size, url: url });
      });
    }).on('error', reject);

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Main function
async function main() {
  console.log('🔍 Downloading images from WordPress attraction pages...\n');
  console.log(`Found ${brokenImages.length} attractions to process\n`);
  console.log('='.repeat(80));

  for (let i = 0; i < brokenImages.length; i++) {
    const item = brokenImages[i];
    console.log(`\n[${i + 1}/${brokenImages.length}] ${item.slug}`);

    const wpURL = `https://albaniavisit.com/attractions/${item.slug}/`;
    console.log(`  WordPress URL: ${wpURL}`);

    try {
      // Fetch the page HTML
      console.log('  Fetching page...');
      const html = await fetchPageHTML(wpURL);

      // Extract the featured image URL
      const imageURL = extractFeaturedImageURL(html);

      if (!imageURL) {
        throw new Error('No featured image found in page HTML');
      }

      console.log(`  Found image: ${imageURL}`);

      // Backup existing file
      const outputPath = path.join(PROJECT_ROOT, 'public', item.featuredImage);
      if (fs.existsSync(outputPath)) {
        fs.copyFileSync(outputPath, outputPath + '.backup');
      }

      // Download the image
      console.log('  Downloading...');
      const result = await downloadImage(imageURL, outputPath);

      console.log(`  ✅ Success! Downloaded ${(result.size / 1024).toFixed(2)} KB`);

      // Remove backup
      if (fs.existsSync(outputPath + '.backup')) {
        fs.unlinkSync(outputPath + '.backup');
      }

      stats.success++;

    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
      stats.failed++;
      stats.errors.push({
        slug: item.slug,
        error: err.message
      });

      // Restore backup if exists
      const outputPath = path.join(PROJECT_ROOT, 'public', item.featuredImage);
      if (fs.existsSync(outputPath + '.backup')) {
        fs.copyFileSync(outputPath + '.backup', outputPath);
        fs.unlinkSync(outputPath + '.backup');
      }
    }

    // Delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log(`Total attractions processed:   ${stats.total}`);
  console.log(`Successfully downloaded:       ${stats.success}`);
  console.log(`Failed:                        ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.slug}`);
      console.log(`   Error: ${err.error}`);
    });
  }

  console.log('\n✨ Done!\n');
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
