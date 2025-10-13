import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Statistics
const stats = {
  totalFiles: 0,
  processedFiles: 0,
  fixedFiles: 0,
  errorFiles: 0,
  errors: []
};

// Directories to process
const contentDirs = [
  path.join(__dirname, '../src/content/destinations'),
  path.join(__dirname, '../src/content/activities'),
  path.join(__dirname, '../src/content/attractions'),
];

/**
 * Extract frontmatter and content from markdown file
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: content, raw: null };
  }
  return {
    frontmatter: match[1],
    body: match[2],
    raw: match[0]
  };
}

/**
 * Fix common YAML issues
 */
function fixYamlFrontmatter(yamlString) {
  let lines = yamlString.split('\n');
  let fixed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and arrays
    if (!line.trim() || line.trim().startsWith('-')) {
      continue;
    }

    // Check if line is a key-value pair
    const keyValueMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (keyValueMatch) {
      const [, indent, key, value] = keyValueMatch;

      // Skip if value is empty or already quoted properly
      if (!value || value === '[]' || value === '{}') {
        continue;
      }

      // Check if this is a nested object start (coordinates, seo, etc.)
      if (!value.trim() && i + 1 < lines.length && lines[i + 1].trim().match(/^\s+\w+:/)) {
        continue;
      }

      // Skip if already properly quoted
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        // But check for unescaped quotes inside
        const innerContent = value.slice(1, -1);
        if (value.startsWith('"') && innerContent.includes('"') && !innerContent.includes('\\"')) {
          // Need to escape internal quotes
          const escaped = innerContent.replace(/"/g, '\\"');
          lines[i] = `${indent}${key}: "${escaped}"`;
          fixed = true;
        }
        continue;
      }

      // Check if value needs quoting
      const needsQuoting = (
        value.includes(':') ||           // Contains colon
        value.includes('#') ||           // Contains comment char
        value.includes('[') ||           // Contains array bracket
        value.includes('{') ||           // Contains object bracket
        value.includes('!') ||           // Contains exclamation
        value.includes('&') ||           // Contains ampersand
        value.includes('*') ||           // Contains asterisk
        value.includes('?') ||           // Contains question mark
        value.includes('|') ||           // Contains pipe
        value.includes('>') ||           // Contains greater than
        value.includes('@') ||           // Contains at symbol
        value.includes('`') ||           // Contains backtick
        value.match(/^[0-9]/) ||         // Starts with number but should be string
        value.match(/^\s/) ||            // Starts with whitespace
        value.match(/\s$/) ||            // Ends with whitespace
        /[^\x00-\x7F]/.test(value) ||    // Contains non-ASCII (like ë, ç, etc.)
        value.toLowerCase() === 'true' || // Boolean-like
        value.toLowerCase() === 'false' ||
        value.toLowerCase() === 'null' ||
        value.toLowerCase() === 'yes' ||
        value.toLowerCase() === 'no'
      );

      if (needsQuoting) {
        // Escape any existing quotes and wrap in double quotes
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        lines[i] = `${indent}${key}: "${escaped}"`;
        fixed = true;
      }
    }
  }

  return { fixed: lines.join('\n'), wasChanged: fixed };
}

/**
 * Validate YAML can be parsed
 */
function validateYaml(yamlString) {
  try {
    const parsed = yaml.load(yamlString);
    return { valid: true, parsed };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Normalize frontmatter values
 */
function normalizeFrontmatter(parsed) {
  // Ensure arrays are arrays
  if (parsed.images && !Array.isArray(parsed.images)) {
    parsed.images = [];
  }
  if (parsed.highlights && !Array.isArray(parsed.highlights)) {
    parsed.highlights = [];
  }
  if (parsed.amenities && !Array.isArray(parsed.amenities)) {
    parsed.amenities = [];
  }
  if (parsed.tags && !Array.isArray(parsed.tags)) {
    parsed.tags = [];
  }

  // Ensure coordinates is properly structured
  if (parsed.coordinates) {
    if (typeof parsed.coordinates !== 'object') {
      delete parsed.coordinates;
    } else {
      // Ensure lat/lng are numbers
      if (parsed.coordinates.lat !== undefined) {
        parsed.coordinates.lat = Number(parsed.coordinates.lat) || 0;
      }
      if (parsed.coordinates.lng !== undefined) {
        parsed.coordinates.lng = Number(parsed.coordinates.lng) || 0;
      }
    }
  }

  return parsed;
}

/**
 * Process a single markdown file
 */
function processFile(filePath) {
  try {
    stats.totalFiles++;

    // Create backup
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const { frontmatter, body } = extractFrontmatter(content);

    if (!frontmatter) {
      console.log(`⚠️  No frontmatter found: ${path.basename(filePath)}`);
      return;
    }

    stats.processedFiles++;

    // First pass: Fix common YAML syntax issues
    const { fixed, wasChanged } = fixYamlFrontmatter(frontmatter);

    // Validate the fixed YAML
    const validation = validateYaml(fixed);

    if (!validation.valid) {
      console.log(`❌ YAML parse error in ${path.basename(filePath)}: ${validation.error}`);
      stats.errorFiles++;
      stats.errors.push({
        file: filePath,
        error: validation.error
      });
      return;
    }

    // Normalize the parsed data
    const normalized = normalizeFrontmatter(validation.parsed);

    // Convert back to YAML with proper formatting
    const yamlOutput = yaml.dump(normalized, {
      indent: 2,
      lineWidth: -1, // Don't wrap lines
      noRefs: true,
      quotingType: '"',
      forceQuotes: false
    });

    // Reconstruct the file
    const newContent = `---\n${yamlOutput}---\n${body}`;

    // Only write if changed
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      stats.fixedFiles++;
      console.log(`✅ Fixed: ${path.basename(filePath)}`);
    } else {
      console.log(`✓  OK: ${path.basename(filePath)}`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
    stats.errorFiles++;
    stats.errors.push({
      file: filePath,
      error: error.message
    });
  }
}

/**
 * Process all markdown files in a directory
 */
function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory not found: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  console.log(`\n📁 Processing ${dirPath}`);
  console.log(`   Found ${mdFiles.length} markdown files`);

  mdFiles.forEach(file => {
    const filePath = path.join(dirPath, file);
    processFile(filePath);
  });
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 YAML Frontmatter Fix Script');
  console.log('================================\n');

  contentDirs.forEach(dir => {
    processDirectory(dir);
  });

  // Print summary
  console.log('\n================================');
  console.log('📊 Summary:');
  console.log('================================');
  console.log(`Total files found:     ${stats.totalFiles}`);
  console.log(`Files processed:       ${stats.processedFiles}`);
  console.log(`Files fixed:           ${stats.fixedFiles}`);
  console.log(`Files with errors:     ${stats.errorFiles}`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`   - ${path.basename(file)}: ${error}`);
    });
  }

  if (stats.fixedFiles > 0) {
    console.log('\n✨ Backups created with .backup extension');
    console.log('   To remove backups: find . -name "*.backup" -delete');
  }

  console.log('\n✅ Done!');
}

// Run the script
main();
