import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

console.log('🔍 Auditing Destinations Collection\n');
console.log('Comparing WordPress source vs Astro migration\n');

// Read Screaming Frog crawl data
let crawlData = fs.readFileSync('internal_all.csv', 'utf8');
// Remove UTF-8 BOM if present
if (crawlData.charCodeAt(0) === 0xFEFF) {
  crawlData = crawlData.slice(1);
}
const records = parse(crawlData, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true
});

// Filter destinations from WordPress
const wpDestinations = records.filter(r =>
  r.Address.includes('/destinations/') &&
  r['Status Code'] === '200' &&
  !r.Address.includes('/sq/') // English only for now
);

console.log(`📊 Found ${wpDestinations.length} destination pages in WordPress\n`);

// Get our migrated destinations
const astroDestDir = 'src/content/destinations';
const astroDestinations = fs.readdirSync(astroDestDir)
  .filter(f => f.endsWith('.md') && !f.startsWith('.'));

console.log(`📦 Found ${astroDestinations.length} migrated destination files\n`);

// Create audit report
const audit = {
  wordpressTotal: wpDestinations.length,
  astroTotal: astroDestinations.length,
  missing: [],
  present: [],
  issuesFound: []
};

// Check each WordPress destination
wpDestinations.forEach(wpDest => {
  const url = new URL(wpDest.Address);
  const slug = url.pathname.split('/').filter(Boolean).pop();
  const expectedFile = `${slug}.md`;

  const exists = astroDestinations.includes(expectedFile);

  if (!exists) {
    audit.missing.push({
      slug,
      url: wpDest.Address,
      title: wpDest['Title 1'],
      metaDesc: wpDest['Meta Description 1']
    });
  } else {
    audit.present.push(slug);

    // Read the file and check for completeness
    const filePath = path.join(astroDestDir, expectedFile);
    const content = fs.readFileSync(filePath, 'utf8');

    // Check frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];

      const issues = [];

      // Check for featured image
      if (!frontmatter.includes('featuredImage:') || frontmatter.includes('featuredImage: ""') || frontmatter.includes('featuredImage: \'\'')) {
        issues.push('Missing or empty featuredImage');
      }

      // Check for seo metadata
      if (!frontmatter.includes('seo:')) {
        issues.push('Missing SEO metadata block');
      }

      // Check for coordinates
      if (frontmatter.includes('lat: 0') && frontmatter.includes('lng: 0')) {
        issues.push('Missing GPS coordinates');
      }

      // Check for highlights
      if (frontmatter.includes('highlights: []')) {
        issues.push('Empty highlights array');
      }

      if (issues.length > 0) {
        audit.issuesFound.push({
          slug,
          file: expectedFile,
          issues
        });
      }
    }
  }
});

// Print report
console.log('='.repeat(80));
console.log('AUDIT REPORT: DESTINATIONS COLLECTION');
console.log('='.repeat(80));
console.log();

console.log(`📈 WordPress Source: ${audit.wordpressTotal} destinations`);
console.log(`📦 Astro Migrated:  ${audit.astroTotal} destinations`);
console.log(`✅ Present:         ${audit.present.length} destinations`);
console.log(`❌ Missing:         ${audit.missing.length} destinations`);
console.log(`⚠️  With Issues:     ${audit.issuesFound.length} destinations`);
console.log();

if (audit.missing.length > 0) {
  console.log('MISSING DESTINATIONS:');
  console.log('-'.repeat(80));
  audit.missing.forEach(m => {
    console.log(`  ❌ ${m.slug}`);
    console.log(`     URL: ${m.url}`);
    console.log(`     Title: ${m.title || 'N/A'}`);
    console.log();
  });
}

if (audit.issuesFound.length > 0) {
  console.log('DESTINATIONS WITH ISSUES:');
  console.log('-'.repeat(80));
  audit.issuesFound.slice(0, 20).forEach(issue => {
    console.log(`  ⚠️  ${issue.slug}`);
    issue.issues.forEach(i => console.log(`       - ${i}`));
    console.log();
  });

  if (audit.issuesFound.length > 20) {
    console.log(`     ... and ${audit.issuesFound.length - 20} more with issues`);
  }
}

// Save detailed report
fs.writeFileSync(
  'data/destinations-audit.json',
  JSON.stringify(audit, null, 2),
  'utf8'
);

console.log('\n📄 Detailed report saved to: data/destinations-audit.json\n');

// Summary statistics
const completeness = ((audit.present.length / audit.wordpressTotal) * 100).toFixed(1);
const qualityScore = (((audit.present.length - audit.issuesFound.length) / audit.wordpressTotal) * 100).toFixed(1);

console.log('SUMMARY:');
console.log(`  Migration Completeness: ${completeness}%`);
console.log(`  Quality Score:          ${qualityScore}%`);
console.log();
