import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const destDir = path.join(__dirname, '../src/content/destinations');
const files = fs.readdirSync(destDir).filter(f => f.endsWith('.md'));

const getSimpleTitle = (fullTitle) => {
  let cleaned = fullTitle
    .replace(/^(Discover|Visit|Explore)\s+/i, '')
    .trim();

  const separators = [' - ', ' – ', ' | ', ' / '];
  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      cleaned = cleaned.split(sep)[0].trim();
      break;
    }
  }

  return cleaned;
};

let count = 0;
files.forEach(file => {
  const filePath = path.join(destDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  const titleMatch = content.match(/^title:\s*["']?(.*?)["']?\s*$/m);
  if (titleMatch) {
    const oldTitle = titleMatch[1].replace(/^["']|["']$/g, '');
    const newTitle = getSimpleTitle(oldTitle);

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
