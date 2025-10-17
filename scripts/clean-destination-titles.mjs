import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const destDir = path.join(__dirname, '../src/content/destinations');
const files = fs.readdirSync(destDir).filter(f => f.endsWith('.md'));

const getCleanTitle = (fullTitle) => {
  let cleaned = fullTitle.trim();

  // Remove common suffixes like "Travel Guide", "Albania", year numbers, etc.
  cleaned = cleaned
    .replace(/,?\s*Albania(\s+Travel\s+Guide)?(\s+\d{4})?/gi, '')
    .replace(/\s*Travel\s+Guide(\s+\d{4})?/gi, '')
    .replace(/\s*\|\s*Visit\s+Albania/gi, '')
    .replace(/\s*-\s*.*$/i, '') // Remove everything after " - "
    .trim();

  return cleaned;
};

const manualFixes = {
  'orikum.md': 'Orikum',
  'borsh.md': 'Borsh',
  'palase.md': 'Palasë',
  'vlora.md': 'Vlorë',
};

let count = 0;
files.forEach(file => {
  const filePath = path.join(destDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const titleMatch = content.match(/^title:\s*["']?(.*?)["']?\s*$/m);
  if (titleMatch) {
    const oldTitle = titleMatch[1].replace(/^["']|["']$/g, '');

    // Use manual fix if available, otherwise clean automatically
    const newTitle = manualFixes[file] || getCleanTitle(oldTitle);

    if (oldTitle !== newTitle) {
      const updatedContent = content.replace(
        /^title:\s*["']?.*?["']?\s*$/m,
        `title: "${newTitle}"`
      );
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✓ ${file}: "${oldTitle}" → "${newTitle}"`);
      count++;
    }
  }
});

console.log(`\n✓ Updated ${count} destination titles`);
