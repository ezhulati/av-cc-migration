import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../src/content/accommodation');
const IMAGES_DIR = path.join(__dirname, '../public/images/accommodation');
const BATCH_SIZE = 5; // Download 5 images concurrently
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches

// Ensure images directory exists
await fs.mkdir(IMAGES_DIR, { recursive: true });

/**
 * Download an image from URL to local file
 */
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.booking.com/'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath).catch(() => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    // Set timeout
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

/**
 * Extract frontmatter and content from a markdown file
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return null;
  }

  return {
    frontmatter: match[1],
    content: match[2]
  };
}

/**
 * Update image URLs in frontmatter
 */
function updateImagePaths(frontmatter, imageMapping) {
  let updated = frontmatter;

  for (const [oldUrl, newPath] of Object.entries(imageMapping)) {
    // Escape special regex characters in URL
    const escapedUrl = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    updated = updated.replace(new RegExp(escapedUrl, 'g'), newPath);
  }

  return updated;
}

/**
 * Extract all Booking.com image URLs from content
 */
function extractBookingUrls(frontmatter) {
  const bookingUrlPattern = /https?:\/\/cf\.bstatic\.com\/[^\s"'\]]+/g;
  const urls = frontmatter.match(bookingUrlPattern) || [];
  return [...new Set(urls)]; // Remove duplicates
}

/**
 * Process a single accommodation file
 */
async function processFile(filename) {
  const filepath = path.join(CONTENT_DIR, filename);
  const content = await fs.readFile(filepath, 'utf-8');

  const parsed = parseFrontmatter(content);
  if (!parsed) {
    console.log(`⚠️  Skipping ${filename} - no frontmatter found`);
    return { success: false, downloaded: 0, failed: 0 };
  }

  const bookingUrls = extractBookingUrls(parsed.frontmatter);

  if (bookingUrls.length === 0) {
    console.log(`✓  ${filename} - no Booking.com images found`);
    return { success: true, downloaded: 0, failed: 0 };
  }

  console.log(`\n📥 Processing ${filename} - found ${bookingUrls.length} images`);

  const imageMapping = {};
  let downloadCount = 0;
  let failCount = 0;
  const slug = filename.replace('.md', '');

  // Download images in batches
  for (let i = 0; i < bookingUrls.length; i++) {
    const url = bookingUrls[i];
    const extension = url.includes('.jpg') ? '.jpg' : '.webp';
    const localFilename = `${slug}-${i}${extension}`;
    const localPath = path.join(IMAGES_DIR, localFilename);
    const publicPath = `/images/accommodation/${localFilename}`;

    // Check if already downloaded
    try {
      await fs.access(localPath);
      console.log(`  ✓ Already exists: ${localFilename}`);
      imageMapping[url] = publicPath;
      downloadCount++;
      continue;
    } catch {
      // File doesn't exist, proceed with download
    }

    // Download image
    try {
      console.log(`  ⬇️  Downloading: ${localFilename}`);
      await downloadImage(url, localPath);

      // Verify file was created and has content
      const stats = await fs.stat(localPath);
      if (stats.size > 0) {
        imageMapping[url] = publicPath;
        downloadCount++;
        console.log(`  ✓ Downloaded: ${localFilename} (${(stats.size / 1024).toFixed(1)} KB)`);
      } else {
        throw new Error('Downloaded file is empty');
      }
    } catch (error) {
      console.log(`  ✗ Failed: ${localFilename} - ${error.message}`);
      failCount++;
    }

    // Add delay every BATCH_SIZE images
    if ((i + 1) % BATCH_SIZE === 0 && i < bookingUrls.length - 1) {
      console.log(`  ⏸️  Pausing for ${DELAY_BETWEEN_BATCHES}ms...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  // Update the markdown file with new paths
  if (Object.keys(imageMapping).length > 0) {
    const updatedFrontmatter = updateImagePaths(parsed.frontmatter, imageMapping);
    const updatedContent = `---\n${updatedFrontmatter}\n---\n${parsed.content}`;
    await fs.writeFile(filepath, updatedContent, 'utf-8');
    console.log(`✓ Updated ${filename} with ${Object.keys(imageMapping).length} local paths`);
  }

  return {
    success: true,
    downloaded: downloadCount,
    failed: failCount
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Booking.com image download process...\n');

  // Get all markdown files
  const files = await fs.readdir(CONTENT_DIR);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  console.log(`📁 Found ${mdFiles.length} accommodation files\n`);

  let totalDownloaded = 0;
  let totalFailed = 0;
  let processedFiles = 0;

  for (const file of mdFiles) {
    try {
      const result = await processFile(file);
      if (result.success) {
        processedFiles++;
        totalDownloaded += result.downloaded;
        totalFailed += result.failed;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DOWNLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files processed: ${processedFiles}/${mdFiles.length}`);
  console.log(`Images downloaded: ${totalDownloaded}`);
  console.log(`Images failed: ${totalFailed}`);
  console.log(`Success rate: ${totalDownloaded > 0 ? ((totalDownloaded / (totalDownloaded + totalFailed)) * 100).toFixed(1) : 0}%`);
  console.log('='.repeat(60));

  if (totalFailed > 0) {
    console.log('\n⚠️  Some images failed to download. This is expected for protected Booking.com images.');
    console.log('Consider using placeholder images for failed downloads or finding alternative sources.');
  }
}

main().catch(console.error);
