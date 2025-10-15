#!/usr/bin/env node

/**
 * Test script to verify Astro dev server is running and accessible
 * Uses Puppeteer to check if the server responds
 */

const puppeteer = require('puppeteer');

async function testServer() {
  const ports = [4321, 4322, 4323, 4324];
  let browser;

  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set a reasonable timeout
    page.setDefaultTimeout(30000);

    // Try each port
    for (const port of ports) {
      const url = `http://localhost:${port}`;
      console.log(`\n🔍 Testing ${url}...`);

      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });

        if (response) {
          const status = response.status();
          console.log(`   ✅ Server responded with status: ${status}`);

          if (status === 200) {
            // Get page title and content
            const title = await page.title();
            const content = await page.content();

            console.log(`   📄 Page title: ${title}`);
            console.log(`   📏 Content length: ${content.length} bytes`);

            // Check if it's an Astro page
            if (content.includes('astro') || content.includes('Astro')) {
              console.log(`   🎯 Confirmed: Astro dev server is running!`);
            }

            // Take a screenshot
            await page.screenshot({
              path: 'scripts/server-test-screenshot.png',
              fullPage: false
            });
            console.log(`   📸 Screenshot saved to scripts/server-test-screenshot.png`);

            console.log(`\n✨ SUCCESS: Dev server is accessible at ${url}`);
            await browser.close();
            return true;
          }
        }
      } catch (error) {
        if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
          console.log(`   ❌ Connection refused - no server on port ${port}`);
        } else if (error.message.includes('Timeout')) {
          console.log(`   ⏱️  Timeout - server might be starting or overloaded`);
        } else {
          console.log(`   ⚠️  Error: ${error.message}`);
        }
      }
    }

    console.log('\n❌ FAILED: No accessible dev server found on any port');
    await browser.close();
    return false;

  } catch (error) {
    console.error('💥 Error running test:', error.message);
    if (browser) await browser.close();
    return false;
  }
}

// Run the test
testServer()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
