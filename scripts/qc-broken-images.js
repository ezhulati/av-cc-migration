import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Results tracking
const results = {
  brokenReferences: [],
  missingImages: [],
  caseIssues: [],
  orphanedImages: [],
  invalidPaths: [],
  stats: {
    totalContentFiles: 0,
    totalImageReferences: 0,
    totalPhysicalImages: 0,
    brokenCount: 0,
    validCount: 0
  }
};

// Get all markdown files
function getAllMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Get all image files
function getAllImageFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllImageFiles(filePath, fileList);
    } else if (/\.(jpg|jpeg|png|webp|svg|gif)$/i.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Extract image references from markdown
function extractImageReferences(content, filePath) {
  const images = [];

  // Frontmatter images (featuredImage, image, etc.)
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];

    // Match various image field patterns
    const imagePatterns = [
      /(?:featuredImage|image|heroImage|thumbnail):\s*["']?([^"'\n]+)["']?/gi,
      /images:\s*\n((?:\s*-\s*["']?[^"'\n]+["']?\n)+)/gi,
    ];

    imagePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(frontmatter)) !== null) {
        if (match[1].includes('-')) {
          // Array of images
          const arrayImages = match[1].match(/["']?([^"'\n]+)["']?/g);
          if (arrayImages) {
            arrayImages.forEach(img => {
              const cleaned = img.replace(/["'\s-]/g, '').trim();
              if (cleaned && cleaned.startsWith('/')) {
                images.push({ path: cleaned, type: 'frontmatter', line: 'frontmatter' });
              }
            });
          }
        } else {
          const cleaned = match[1].trim();
          if (cleaned && cleaned.startsWith('/')) {
            images.push({ path: cleaned, type: 'frontmatter', line: 'frontmatter' });
          }
        }
      }
    });
  }

  // Markdown image syntax: ![alt](path)
  const markdownImages = content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
  for (const match of markdownImages) {
    const imagePath = match[2].trim();
    if (imagePath.startsWith('/')) {
      images.push({ path: imagePath, type: 'markdown', line: 'content' });
    }
  }

  // HTML img tags
  const htmlImages = content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  for (const match of htmlImages) {
    const imagePath = match[1].trim();
    if (imagePath.startsWith('/')) {
      images.push({ path: imagePath, type: 'html', line: 'content' });
    }
  }

  return images;
}

// Check if image exists (case-insensitive check for issues)
function checkImageExists(imagePath) {
  // Convert URL path to filesystem path
  const fsPath = path.join(projectRoot, 'public', imagePath.replace(/^\//, ''));

  // Direct check
  if (fs.existsSync(fsPath)) {
    return { exists: true, actualPath: fsPath, issue: null };
  }

  // Check for case sensitivity issues
  const dir = path.dirname(fsPath);
  const filename = path.basename(fsPath);

  if (!fs.existsSync(dir)) {
    return { exists: false, actualPath: null, issue: 'directory_not_found' };
  }

  const files = fs.readdirSync(dir);
  const caseInsensitiveMatch = files.find(f => f.toLowerCase() === filename.toLowerCase());

  if (caseInsensitiveMatch) {
    return {
      exists: true,
      actualPath: path.join(dir, caseInsensitiveMatch),
      issue: 'case_mismatch',
      expectedCase: filename,
      actualCase: caseInsensitiveMatch
    };
  }

  return { exists: false, actualPath: null, issue: 'file_not_found' };
}

// Main QC function
function qcImages() {
  console.log('🔍 Starting Image QC...\n');

  // Get all content files
  const contentDir = path.join(projectRoot, 'src', 'content');
  const markdownFiles = getAllMarkdownFiles(contentDir);
  results.stats.totalContentFiles = markdownFiles.length;
  console.log(`📄 Found ${markdownFiles.length} content files`);

  // Get all physical images
  const imagesDir = path.join(projectRoot, 'public', 'images');
  const imageFiles = getAllImageFiles(imagesDir);
  results.stats.totalPhysicalImages = imageFiles.length;
  console.log(`🖼️  Found ${imageFiles.length} physical images\n`);

  // Track referenced images
  const referencedImages = new Set();

  // Process each markdown file
  console.log('🔎 Analyzing image references...\n');
  markdownFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const images = extractImageReferences(content, filePath);

    images.forEach(img => {
      results.stats.totalImageReferences++;
      referencedImages.add(img.path);

      const check = checkImageExists(img.path);

      if (!check.exists) {
        results.stats.brokenCount++;
        results.brokenReferences.push({
          file: path.relative(projectRoot, filePath),
          imagePath: img.path,
          type: img.type,
          issue: check.issue
        });

        if (check.issue === 'file_not_found') {
          results.missingImages.push(img.path);
        }
      } else {
        results.stats.validCount++;

        if (check.issue === 'case_mismatch') {
          results.caseIssues.push({
            file: path.relative(projectRoot, filePath),
            referencedAs: img.path,
            actualCase: check.actualCase,
            expectedCase: check.expectedCase
          });
        }
      }
    });
  });

  // Find orphaned images (images not referenced anywhere)
  console.log('🔎 Finding orphaned images...\n');
  imageFiles.forEach(imgPath => {
    const relativePath = '/' + path.relative(path.join(projectRoot, 'public'), imgPath).replace(/\\/g, '/');
    if (!referencedImages.has(relativePath)) {
      // Check case-insensitive
      const found = Array.from(referencedImages).some(ref =>
        ref.toLowerCase() === relativePath.toLowerCase()
      );
      if (!found) {
        results.orphanedImages.push(relativePath);
      }
    }
  });

  // Generate report
  generateReport();
}

// Generate detailed report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 IMAGE QC REPORT');
  console.log('='.repeat(80) + '\n');

  // Stats
  console.log('📈 STATISTICS:');
  console.log(`   Total content files: ${results.stats.totalContentFiles}`);
  console.log(`   Total image references: ${results.stats.totalImageReferences}`);
  console.log(`   Total physical images: ${results.stats.totalPhysicalImages}`);
  console.log(`   Valid references: ${results.stats.validCount} ✅`);
  console.log(`   Broken references: ${results.stats.brokenCount} ❌`);
  console.log(`   Orphaned images: ${results.orphanedImages.length} 🔍\n`);

  // Broken references
  if (results.brokenReferences.length > 0) {
    console.log('❌ BROKEN IMAGE REFERENCES:');
    console.log(`   Found ${results.brokenReferences.length} broken references\n`);

    results.brokenReferences.forEach((broken, idx) => {
      console.log(`   ${idx + 1}. ${broken.file}`);
      console.log(`      Path: ${broken.imagePath}`);
      console.log(`      Type: ${broken.type}`);
      console.log(`      Issue: ${broken.issue}\n`);
    });
  } else {
    console.log('✅ No broken image references found!\n');
  }

  // Case sensitivity issues
  if (results.caseIssues.length > 0) {
    console.log('⚠️  CASE SENSITIVITY ISSUES:');
    console.log(`   Found ${results.caseIssues.length} case mismatches\n`);

    results.caseIssues.slice(0, 20).forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue.file}`);
      console.log(`      Referenced: ${issue.referencedAs}`);
      console.log(`      Expected: ${issue.expectedCase}`);
      console.log(`      Actual: ${issue.actualCase}\n`);
    });

    if (results.caseIssues.length > 20) {
      console.log(`   ... and ${results.caseIssues.length - 20} more\n`);
    }
  }

  // Orphaned images
  if (results.orphanedImages.length > 0) {
    console.log('🔍 ORPHANED IMAGES (not referenced anywhere):');
    console.log(`   Found ${results.orphanedImages.length} orphaned images\n`);

    results.orphanedImages.slice(0, 30).forEach((img, idx) => {
      console.log(`   ${idx + 1}. ${img}`);
    });

    if (results.orphanedImages.length > 30) {
      console.log(`   ... and ${results.orphanedImages.length - 30} more\n`);
    }
  }

  // Save detailed report to file
  const reportPath = path.join(projectRoot, 'data', 'image-qc-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Detailed report saved to: ${path.relative(projectRoot, reportPath)}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  if (results.stats.brokenCount === 0 && results.caseIssues.length === 0) {
    console.log('✅ All image references are valid!');
  } else {
    console.log(`⚠️  Found ${results.stats.brokenCount} broken references and ${results.caseIssues.length} case issues`);
  }
  console.log('='.repeat(80) + '\n');
}

// Run QC
qcImages();
