/**
 * URL Validation Script
 * Ensures all URLs are properly mapped and generates redirect rules
 */

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = './data';
const CONTENT_DIR = './src/content';

/**
 * Generate URL mapping from content
 */
async function generateURLMapping() {
  console.log('🔗 Generating URL mapping...\n');

  // Load content inventory
  let contentData;
  try {
    const inventoryPath = path.join(DATA_DIR, 'content-inventory.json');
    const inventoryContent = await fs.readFile(inventoryPath, 'utf-8');
    contentData = JSON.parse(inventoryContent);
  } catch (error) {
    console.error('❌ Could not load content-inventory.json');
    process.exit(1);
  }

  const urlMap = [];

  // Map posts
  contentData.posts?.forEach(post => {
    const lang = post.language?.code?.toLowerCase() || 'en';
    const wpUrl = `https://albaniavisit.com/${post.slug}/`;
    const astroUrl = lang === 'sq'
      ? `https://albaniavisit.com/sq/${post.slug}/`
      : `https://albaniavisit.com/${post.slug}/`;

    urlMap.push({
      type: 'post',
      slug: post.slug,
      language: lang,
      wordpressUrl: wpUrl,
      astroUrl: astroUrl,
      needsRedirect: wpUrl !== astroUrl,
    });
  });

  // Map pages
  contentData.pages?.forEach(page => {
    const lang = page.language?.code?.toLowerCase() || 'en';
    const wpUrl = `https://albaniavisit.com/${page.slug}/`;
    const astroUrl = lang === 'sq'
      ? `https://albaniavisit.com/sq/${page.slug}/`
      : `https://albaniavisit.com/${page.slug}/`;

    urlMap.push({
      type: 'page',
      slug: page.slug,
      language: lang,
      wordpressUrl: wpUrl,
      astroUrl: astroUrl,
      needsRedirect: wpUrl !== astroUrl,
    });
  });

  // Map custom post types
  const customTypes = {
    accommodation: 'accommodation',
    destinations: 'destinations',
    activities: 'activities',
    attractions: 'attractions',
    tours: 'tours',
  };

  Object.entries(customTypes).forEach(([key, urlPrefix]) => {
    contentData[key]?.forEach(item => {
      const lang = item.language?.code?.toLowerCase() || 'en';
      const wpUrl = `https://albaniavisit.com/${urlPrefix}/${item.slug}/`;
      const astroUrl = lang === 'sq'
        ? `https://albaniavisit.com/sq/${urlPrefix}/${item.slug}/`
        : `https://albaniavisit.com/${urlPrefix}/${item.slug}/`;

      urlMap.push({
        type: key,
        slug: item.slug,
        language: lang,
        wordpressUrl: wpUrl,
        astroUrl: astroUrl,
        needsRedirect: wpUrl !== astroUrl,
      });
    });
  });

  console.log(`✅ Generated mapping for ${urlMap.length} URLs\n`);

  // Save URL map
  await fs.writeFile(
    path.join(DATA_DIR, 'url-map.json'),
    JSON.stringify(urlMap, null, 2),
    'utf-8'
  );

  return urlMap;
}

/**
 * Generate redirect rules for Netlify
 */
function generateNetlifyRedirects(urlMap) {
  const redirects = [];

  // Add common redirects
  redirects.push('# Force HTTPS');
  redirects.push('http://albaniavisit.com/* https://albaniavisit.com/:splat 301!');
  redirects.push('');
  redirects.push('# Redirect www to non-www');
  redirects.push('https://www.albaniavisit.com/* https://albaniavisit.com/:splat 301!');
  redirects.push('');

  // Add any URL changes
  const changedUrls = urlMap.filter(u => u.needsRedirect);
  if (changedUrls.length > 0) {
    redirects.push('# URL structure changes');
    changedUrls.forEach(url => {
      const from = url.wordpressUrl.replace('https://albaniavisit.com', '');
      const to = url.astroUrl.replace('https://albaniavisit.com', '');
      redirects.push(`${from} ${to} 301`);
    });
    redirects.push('');
  }

  // 404 catch-all
  redirects.push('# 404 catch-all');
  redirects.push('/* /404 404');

  return redirects.join('\n');
}

/**
 * Validate content files exist
 */
async function validateContentFiles(urlMap) {
  console.log('📂 Validating content files...\n');

  let found = 0;
  let missing = 0;
  const missingFiles = [];

  for (const url of urlMap) {
    const contentType = url.type === 'post' ? 'posts' : url.type === 'page' ? 'pages' : url.type;
    const filepath = path.join(CONTENT_DIR, contentType, `${url.slug}.md`);

    try {
      await fs.access(filepath);
      found++;
    } catch {
      missing++;
      missingFiles.push({
        type: url.type,
        slug: url.slug,
        expectedPath: filepath,
      });
    }
  }

  console.log(`✅ Found: ${found} files`);
  console.log(`❌ Missing: ${missing} files\n`);

  if (missing > 0) {
    console.log('Missing files:');
    missingFiles.slice(0, 10).forEach(file => {
      console.log(`  - ${file.type}: ${file.slug}`);
    });
    if (missingFiles.length > 10) {
      console.log(`  ... and ${missingFiles.length - 10} more`);
    }
  }

  return { found, missing, missingFiles };
}

/**
 * Generate validation report
 */
function generateValidationReport(urlMap, fileValidation) {
  const report = {
    timestamp: new Date().toISOString(),
    totalUrls: urlMap.length,
    urlsNeedingRedirect: urlMap.filter(u => u.needsRedirect).length,
    contentFiles: {
      found: fileValidation.found,
      missing: fileValidation.missing,
    },
    byType: {},
    byLanguage: {
      en: urlMap.filter(u => u.language === 'en').length,
      sq: urlMap.filter(u => u.language === 'sq').length,
    },
  };

  // Count by type
  urlMap.forEach(url => {
    if (!report.byType[url.type]) {
      report.byType[url.type] = 0;
    }
    report.byType[url.type]++;
  });

  return report;
}

/**
 * Main function
 */
async function validate() {
  console.log('🚀 Starting URL validation...\n');

  // Generate URL mapping
  const urlMap = await generateURLMapping();

  // Validate content files exist
  const fileValidation = await validateContentFiles(urlMap);

  // Generate redirect rules
  const redirects = generateNetlifyRedirects(urlMap);
  await fs.writeFile('./_redirects', redirects, 'utf-8');
  console.log('💾 Generated _redirects file\n');

  // Generate validation report
  const report = generateValidationReport(urlMap, fileValidation);
  await fs.writeFile(
    path.join(DATA_DIR, 'validation-report.json'),
    JSON.stringify(report, null, 2),
    'utf-8'
  );

  console.log('📊 Validation Report:');
  console.log(`   Total URLs: ${report.totalUrls}`);
  console.log(`   URLs needing redirect: ${report.urlsNeedingRedirect}`);
  console.log(`   Content files found: ${report.contentFiles.found}`);
  console.log(`   Content files missing: ${report.contentFiles.missing}`);
  console.log(`\n   By Type:`);
  Object.entries(report.byType).forEach(([type, count]) => {
    console.log(`     ${type}: ${count}`);
  });
  console.log(`\n   By Language:`);
  console.log(`     English: ${report.byLanguage.en}`);
  console.log(`     Albanian: ${report.byLanguage.sq}`);

  console.log('\n✅ Validation complete!');

  if (fileValidation.missing > 0) {
    console.log('\n⚠️  Warning: Some content files are missing.');
    console.log('   Run: npm run migrate:markdown');
  }
}

// Run
validate().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
