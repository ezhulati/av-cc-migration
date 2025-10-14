#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

async function checkSlugValidity() {
  const accommodationDir = 'src/content/accommodation';
  const files = await glob(`${accommodationDir}/*.md`);

  console.log(`\n🔍 Checking ${files.length} accommodation files for invalid slugs...\n`);

  const problematic = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Extract frontmatter
      if (!content.startsWith('---')) {
        problematic.push({ file, reason: 'No frontmatter start' });
        continue;
      }

      const parts = content.split('---');
      if (parts.length < 3) {
        problematic.push({ file, reason: 'Incomplete frontmatter' });
        continue;
      }

      const frontmatter = parts[1];

      // Find slug line
      const slugMatch = frontmatter.match(/^slug:\s*(.*)$/m);

      if (!slugMatch) {
        problematic.push({ file, reason: 'No slug field' });
        continue;
      }

      const slugValue = slugMatch[1].trim();

      // Check for problematic values
      if (slugValue === '') {
        problematic.push({ file, reason: 'Empty slug value', value: slugValue });
      } else if (slugValue === 'null') {
        problematic.push({ file, reason: 'Slug is literal "null"', value: slugValue });
      } else if (slugValue === '~') {
        problematic.push({ file, reason: 'Slug is YAML null (~)', value: slugValue });
      } else if (/^\d+$/.test(slugValue)) {
        problematic.push({ file, reason: 'Slug is numeric', value: slugValue });
      } else if (!slugValue.startsWith('"') && !slugValue.startsWith("'") && slugValue.includes(' ')) {
        problematic.push({ file, reason: 'Unquoted slug with spaces', value: slugValue });
      }

    } catch (error) {
      problematic.push({ file, reason: `Error reading file: ${error.message}` });
    }
  }

  if (problematic.length === 0) {
    console.log('✅ All accommodation files have valid slug values!\n');
  } else {
    console.log(`🚨 Found ${problematic.length} files with invalid slugs:\n`);
    problematic.slice(0, 50).forEach(({ file, reason, value }) => {
      const filename = path.basename(file);
      if (value !== undefined) {
        console.log(`  ❌ ${filename}`);
        console.log(`     Reason: ${reason}`);
        console.log(`     Value: "${value}"`);
      } else {
        console.log(`  ❌ ${filename} - ${reason}`);
      }
    });

    if (problematic.length > 50) {
      console.log(`\n  ... and ${problematic.length - 50} more issues`);
    }
  }

  return problematic;
}

checkSlugValidity().catch(console.error);
