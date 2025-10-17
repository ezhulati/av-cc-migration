import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function checkDestinationImages() {
  console.log('🚀 Launching browser...');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();

    // Listen for console messages from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Listen for failed requests
    page.on('requestfailed', request => {
      console.log('❌ Failed request:', request.url());
    });

    console.log('📍 Navigating to http://localhost:4321/destinations/');
    await page.goto('http://localhost:4321/destinations/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page loaded');

    // Wait a bit for images to load
    await page.waitForTimeout(2000);

    // Check for broken images
    const imageStatus = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));

      return images.map(img => {
        const isLoaded = img.complete && img.naturalHeight !== 0;
        const rect = img.getBoundingClientRect();

        return {
          src: img.src,
          alt: img.alt || '(no alt)',
          loaded: isLoaded,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: Math.round(rect.width),
          displayHeight: Math.round(rect.height),
          visible: rect.width > 0 && rect.height > 0
        };
      });
    });

    console.log('\n📊 Image Status Report:');
    console.log('='.repeat(80));

    const broken = imageStatus.filter(img => !img.loaded || !img.visible);
    const working = imageStatus.filter(img => img.loaded && img.visible);

    console.log(`\n✅ Working images: ${working.length}`);
    console.log(`❌ Broken images: ${broken.length}`);
    console.log(`📷 Total images: ${imageStatus.length}`);

    if (broken.length > 0) {
      console.log('\n❌ BROKEN IMAGES:');
      console.log('='.repeat(80));
      broken.forEach((img, index) => {
        console.log(`\n${index + 1}. ${img.alt}`);
        console.log(`   URL: ${img.src}`);
        console.log(`   Loaded: ${img.loaded}`);
        console.log(`   Visible: ${img.visible}`);
        console.log(`   Size: ${img.naturalWidth}x${img.naturalHeight} (natural) | ${img.displayWidth}x${img.displayHeight} (display)`);
      });
    }

    if (working.length > 0) {
      console.log('\n✅ WORKING IMAGES (first 10):');
      console.log('='.repeat(80));
      working.slice(0, 10).forEach((img, index) => {
        console.log(`${index + 1}. ${img.alt} - ${img.naturalWidth}x${img.naturalHeight}`);
      });
    }

    // Take a screenshot
    const screenshotPath = '/Users/ez/Desktop/AI Library/Apps/AV-CC/destinations-page-screenshot.png';
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    console.log(`\n📸 Screenshot saved to: ${screenshotPath}`);

    // Check specific destinations mentioned by user
    console.log('\n🔍 Checking specific destinations mentioned by user:');
    console.log('='.repeat(80));

    const specificChecks = await page.evaluate(() => {
      const destinations = ['Bajram Curri', 'Lezhë', 'Dhermi', 'Valbona'];
      const results = [];

      destinations.forEach(name => {
        // Find the card/element containing this destination name
        const elements = Array.from(document.querySelectorAll('h2, h3, .card-title, [class*="title"]'));
        const destElement = elements.find(el => el.textContent.includes(name));

        if (destElement) {
          // Find the associated image
          const card = destElement.closest('article, .card, [class*="card"]');
          const img = card ? card.querySelector('img') : null;

          results.push({
            name: name,
            found: true,
            hasImage: !!img,
            imageLoaded: img ? (img.complete && img.naturalHeight !== 0) : false,
            imageSrc: img ? img.src : 'N/A'
          });
        } else {
          results.push({
            name: name,
            found: false,
            hasImage: false,
            imageLoaded: false,
            imageSrc: 'N/A'
          });
        }
      });

      return results;
    });

    specificChecks.forEach(check => {
      const status = check.imageLoaded ? '✅' : '❌';
      console.log(`${status} ${check.name}:`);
      console.log(`   Found: ${check.found}`);
      console.log(`   Has Image: ${check.hasImage}`);
      console.log(`   Image Loaded: ${check.imageLoaded}`);
      console.log(`   Image URL: ${check.imageSrc}`);
      console.log('');
    });

    console.log('\n✨ Check complete!');
    console.log(`View screenshot at: ${screenshotPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Keep browser open for 5 seconds so you can see it
    console.log('\n⏳ Keeping browser open for 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

checkDestinationImages();
