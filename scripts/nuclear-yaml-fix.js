import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

console.log('☢️  NUCLEAR YAML FIX - Validating and rebuilding ALL frontmatter...\n');

function getAllMarkdownFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllMarkdownFiles(filePath, arrayOfFiles);
    } else if (file.endsWith('.md')) {
      arrayOfFiles.push(filePath);
    }
  });
  return arrayOfFiles;
}

function extractDescription(bodyText, titleText) {
  // Get first meaningful sentences from body
  const lines = bodyText.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('![') && !trimmed.startsWith('[!');
  });

  const text = lines.join(' ').trim();

  // Find first 1-2 sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    let desc = sentences[0].trim();
    if (desc.length < 100 && sentences.length > 1) {
      desc += ' ' + sentences[1].trim();
    }
    // Clean markdown
    desc = desc.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    desc = desc.replace(/\*\*([^*]+)\*\*/g, '$1');
    desc = desc.replace(/\*([^*]+)\*/g, '$1');
    desc = desc.replace(/\{[^}]+\}/g, '');
    return desc.substring(0, 250).trim();
  }

  // Fallback to title-based description
  return `Learn about ${titleText}.`;
}

const contentDirs = [
  'src/content/posts',
  'src/content/pages',
  'src/content/accommodation'
];

let fixed = 0;
let total = 0;
let errors = [];

contentDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return;
  }

  const files = getAllMarkdownFiles(dirPath);
  console.log(`📁 Processing ${files.length} files in ${dir}...`);

  files.forEach((filePath, index) => {
    total++;
    try {
      let content = fs.readFileSync(filePath, 'utf8');

      if (!content.startsWith('---')) return;

      const parts = content.split('---');
      if (parts.length < 3) return;

      let frontmatterText = parts[1].trim();
      const body = parts.slice(2).join('---').trim();

      // Try to parse existing YAML
      try {
        const parsed = yaml.load(frontmatterText);

        // Validate that description exists and is reasonable
        if (!parsed.description || parsed.description.length < 20 || parsed.description.includes('\\')) {
          throw new Error('Invalid description');
        }

        // If it parses, we're good
        return;
      } catch (yamlError) {
        // YAML is broken - rebuild it
        try {
          // Try to extract key fields
          const titleMatch = frontmatterText.match(/title:\s*(.+)/);
          const slugMatch = frontmatterText.match(/slug:\s*(.+)/);
          const langMatch = frontmatterText.match(/language:\s*(.+)/);
          const featuredMatch = frontmatterText.match(/featuredImage:\s*(.+)/);

          const title = titleMatch ? titleMatch[1].replace(/^["']|["']$/g, '').trim() : path.basename(filePath, '.md');
          const slug = slugMatch ? slugMatch[1].trim() : path.basename(filePath, '.md');
          const language = langMatch ? langMatch[1].trim() : 'en';
          const featuredImage = featuredMatch ? featuredMatch[1].trim() : '""';

          // Generate clean description from body
          const description = extractDescription(body, title);

          // Build new frontmatter object
          const newFrontmatter = {
            title,
            description,
            featuredImage: featuredImage === "''" || featuredImage === '""' ? '' : featuredImage.replace(/^["']|["']$/g, ''),
            language
          };

          // Add slug
          if (dir.includes('accommodation')) {
            newFrontmatter.slug = slug;
            newFrontmatter.location = '';
            newFrontmatter.amenities = [];
            newFrontmatter.images = [];
          } else if (dir.includes('posts')) {
            newFrontmatter.pubDate = new Date('2024-01-01').toISOString();
            newFrontmatter.author = 'Enri';
            newFrontmatter.slug = slug;
          } else {
            newFrontmatter.slug = slug;
          }

          // Add SEO if exists
          const seoMatch = frontmatterText.match(/seo:\s*\n\s+metaTitle:\s*(.+)\n\s+metaDescription:\s*(.+)\n\s+canonicalURL:\s*(.+)/);
          if (seoMatch) {
            newFrontmatter.seo = {
              metaTitle: seoMatch[1].replace(/^["']|["']$/g, '').trim(),
              metaDescription: seoMatch[2].replace(/^["']|["']$/g, '').trim(),
              canonicalURL: seoMatch[3].replace(/^["']|["']$/g, '').trim()
            };
          }

          // Serialize to YAML
          const cleanYAML = yaml.dump(newFrontmatter, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            quotingType: '"',
            forceQuotes: true
          });

          const newContent = `---\n${cleanYAML}---\n\n${body}`;
          fs.writeFileSync(filePath, newContent, 'utf8');
          fixed++;
        } catch (rebuildError) {
          errors.push({ file: path.basename(filePath), error: rebuildError.message });
        }
      }

      if ((index + 1) % 1000 === 0) {
        console.log(`  ✓ Processed ${index + 1}/${files.length}...`);
      }
    } catch (err) {
      errors.push({ file: path.basename(filePath), error: err.message });
    }
  });

  console.log(`  ✅ Completed ${dir}\n`);
});

console.log(`\n✅ Nuclear YAML fix complete!`);
console.log(`   Total files: ${total}`);
console.log(`   Fixed: ${fixed}`);
console.log(`   Errors: ${errors.length}`);

if (errors.length > 0 && errors.length <= 10) {
  console.log(`\n⚠️  Errors:`);
  errors.forEach(e => console.log(`   ${e.file}: ${e.error}`));
}

console.log(`\n🚀 Ready to test: npm run dev`);
