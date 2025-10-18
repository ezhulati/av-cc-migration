import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ACCOMMODATION_DIR = join(__dirname, '../src/content/accommodation');

async function parseMarkdownFile(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid markdown format');
  }

  const [, frontmatter, body] = match;
  return { frontmatter, body };
}

async function parseFrontmatter(frontmatter) {
  const lines = frontmatter.split('\n');
  const data = {};
  let currentKey = null;
  let currentArray = null;
  let indentLevel = 0;

  for (const line of lines) {
    if (line.trim() === '') continue;

    const arrayItemMatch = line.match(/^(\s+)-\s+"?([^"]+)"?$/);
    if (arrayItemMatch && currentKey === 'images') {
      const url = arrayItemMatch[2].replace(/"/g, '');
      currentArray.push(url);
      continue;
    }

    const keyValueMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;

      if (key === 'images') {
        currentKey = 'images';
        currentArray = [];
        data[key] = currentArray;
      } else if (key === 'featuredImage') {
        data[key] = value.replace(/^"|"$/g, '');
      } else {
        data[key] = value;
        currentKey = key;
      }
    }
  }

  return data;
}

async function updateFeaturedImage(filePath) {
  try {
    const content = await readFile(filePath, 'utf-8');
    const { frontmatter, body } = await parseMarkdownFile(content);
    const data = await parseFrontmatter(frontmatter);

    // Check if images array exists and has at least one image
    if (!data.images || data.images.length === 0) {
      console.log(`⚠️  No images found in ${filePath}`);
      return false;
    }

    // Get the first CDN image
    const firstImage = data.images[0];

    // Check if featuredImage needs updating
    if (data.featuredImage === firstImage) {
      console.log(`✓ ${filePath} - Already using CDN image`);
      return false;
    }

    // Update the featuredImage in the frontmatter
    const oldFeaturedImage = data.featuredImage || 'undefined';
    const updatedFrontmatter = frontmatter.replace(
      /featuredImage:\s*"?[^"\n]+"?/,
      `featuredImage: "${firstImage}"`
    );

    const updatedContent = `---\n${updatedFrontmatter}\n---\n${body}`;
    await writeFile(filePath, updatedContent, 'utf-8');

    console.log(`✅ Updated ${filePath}`);
    console.log(`   Old: ${oldFeaturedImage}`);
    console.log(`   New: ${firstImage}`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function fixAllAccommodations() {
  console.log('🔍 Scanning accommodation files...\n');

  const files = await readdir(ACCOMMODATION_DIR);
  const markdownFiles = files.filter(file => file.endsWith('.md'));

  console.log(`Found ${markdownFiles.length} accommodation files\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of markdownFiles) {
    const filePath = join(ACCOMMODATION_DIR, file);
    const result = await updateFeaturedImage(filePath);

    if (result === true) {
      updatedCount++;
    } else if (result === false) {
      skippedCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updatedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Total: ${markdownFiles.length}`);
}

// Run the script
fixAllAccommodations().catch(console.error);
