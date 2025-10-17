import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPORT_PATH = path.join(__dirname, '../data/image-audit-report.json');
const PUBLIC_DIR = path.join(__dirname, '../public');

// Placeholder image configuration
const PLACEHOLDER_CONFIG = {
  width: 1200,
  height: 800,
  background: '#2c3e50', // Dark blue-gray
  textColor: '#ecf0f1',  // Light gray
  accentColor: '#e74c3c', // Red (Albanian flag color)
  font: 'bold 48px sans-serif',
  smallFont: '24px sans-serif'
};

/**
 * Create a placeholder image
 */
async function createPlaceholderImage(imagePath, outputPath) {
  const { width, height, background, textColor, accentColor, font, smallFont } = PLACEHOLDER_CONFIG;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  // Accent stripe (Albanian flag red)
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, width, 20);
  ctx.fillRect(0, height - 20, width, 20);

  // Extract filename for display
  const filename = path.basename(imagePath).replace(/\\/g, '').replace(/"/g, '');
  const displayName = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Main title
  ctx.font = font;
  const maxWidth = width - 100;
  const words = displayName.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // Draw lines centered
  const lineHeight = 60;
  const startY = (height - (lines.length * lineHeight)) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + (index * lineHeight));
  });

  // Subtitle
  ctx.font = smallFont;
  ctx.fillStyle = accentColor;
  ctx.fillText('Image Coming Soon', width / 2, height - 60);

  // Save image
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
  await fs.writeFile(outputPath, buffer);
}

/**
 * Clean image path (remove quotes and extra chars)
 */
function cleanImagePath(imagePath) {
  return imagePath
    .replace(/\\/g, '')
    .replace(/"/g, '')
    .trim();
}

/**
 * Main function
 */
async function main() {
  console.log('🎨 Generating placeholder images...\n');

  // Check if canvas is available
  try {
    createCanvas(1, 1);
  } catch (error) {
    console.error('❌ Canvas module not available. Install with: npm install canvas');
    console.log('\n💡 Alternative: Use simple text placeholders instead\n');
    return;
  }

  // Read audit report
  const reportContent = await fs.readFile(REPORT_PATH, 'utf-8');
  const report = JSON.parse(reportContent);

  const missingImages = report.missingImages;
  console.log(`Found ${missingImages.length} missing images\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const { file, imagePath } of missingImages) {
    const cleanPath = cleanImagePath(imagePath);
    const outputPath = path.join(PUBLIC_DIR, cleanPath.substring(1));

    // Check if already exists
    try {
      await fs.access(outputPath);
      console.log(`⏭️  Skip (exists): ${cleanPath}`);
      skipped++;
      continue;
    } catch {
      // File doesn't exist, create it
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Create placeholder
    try {
      await createPlaceholderImage(cleanPath, outputPath);
      console.log(`✓ Created: ${cleanPath}`);
      created++;
    } catch (error) {
      console.error(`✗ Failed: ${cleanPath} - ${error.message}`);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PLACEHOLDER GENERATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Created: ${created}`);
  console.log(`Skipped (already exist): ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${missingImages.length}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
