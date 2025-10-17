#!/usr/bin/env python3
"""
Migrate destination files to match Berat's structure:
1. Extract inline images to frontmatter images array
2. Add "## Why Visit [Destination]" as first H2
3. Ensure proper H2 structure throughout
"""

import os
import re
from pathlib import Path

# Base path
BASE_PATH = Path("/Users/ez/Desktop/AI Library/Apps/AV-CC/src/content/destinations")

# Files to process (excluding berat.md which is the template)
DESTINATIONS = [
    "saranda.md", "ksamil.md", "gjirokaster.md", "shkoder.md", "himare.md",
    "durres.md", "vlora.md", "theth.md", "valbona.md", "butrint.md",
    "permet.md", "korce.md", "kruje.md", "pogradec.md", "qeparo.md",
    "tepelene.md", "lezhe.md", "dhermi.md", "shengjin.md", "vuno.md",
    "zhulat.md", "voskopoja.md", "puke.md", "apollonia.md", "bajram-curri.md",
    "lin.md", "borsh.md", "delvine.md", "gjipe.md", "grabove.md",
    "jale-beach.md", "orikum.md", "palase.md", "pema-e-thate.md", "peshkopi.md"
]

def extract_images_from_content(content):
    """Extract all inline markdown images from content."""
    # Pattern to match markdown images: ![alt text](image/path)
    pattern = r'!\[.*?\]\((.*?)\)'
    images = re.findall(pattern, content)
    return list(set(images))  # Remove duplicates

def remove_inline_images(content):
    """Remove all inline markdown images and their captions."""
    # Remove image with caption pattern: ![...](...)  *caption*
    content = re.sub(r'!\[.*?\]\(.*?\)\s*\n\s*\*.*?\*\s*\n?', '', content)
    # Remove standalone images
    content = re.sub(r'!\[.*?\]\(.*?\)\s*\n?', '', content)
    return content

def extract_frontmatter(content):
    """Extract YAML frontmatter from markdown."""
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if match:
        frontmatter = match.group(1)
        rest = content[match.end():]
        return frontmatter, rest
    return None, content

def update_frontmatter_images(frontmatter, new_images):
    """Update the images array in frontmatter."""
    # Check if images array exists
    if 'images: []' in frontmatter:
        # Replace empty array with new images
        if new_images:
            images_yaml = '\n  - "' + '"\n  - "'.join(new_images) + '"'
            frontmatter = frontmatter.replace('images: []', f'images:{images_yaml}')
    elif 'images:' in frontmatter:
        # Images array already has content, merge if needed
        # Extract existing images
        existing_pattern = r'images:\s*\n((?:  - ".*?"\s*\n)*)'
        match = re.search(existing_pattern, frontmatter)
        if match:
            existing_images = re.findall(r'  - "(.*?)"', match.group(1))
            # Merge with new images, avoiding duplicates
            all_images = list(set(existing_images + new_images))
            images_yaml = '\n  - "' + '"\n  - "'.join(all_images) + '"'
            frontmatter = re.sub(existing_pattern, f'images:{images_yaml}\n', frontmatter)

    return frontmatter

def add_why_visit_section(content, destination_name):
    """Add '## Why Visit [Destination]' as the first H2 if it doesn't exist."""
    # Extract title from destination name (convert slug to title case)
    title = destination_name.replace('-', ' ').title()

    # Check if "## Why Visit" already exists
    if re.search(r'^##\s+Why\s+Visit', content, re.MULTILINE):
        return content

    # Find the first line of content (not a heading)
    lines = content.split('\n')
    insert_index = 0

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped and not stripped.startswith('#'):
            insert_index = i
            break

    # Insert the "Why Visit" heading
    lines.insert(insert_index, f'\n## Why Visit {title}\n')
    return '\n'.join(lines)

def ensure_h2_structure(content):
    """Ensure major sections have H2 headings."""
    # Common section patterns that should be H2
    section_patterns = [
        (r'^(Getting There|Getting Around|Getting Away)', r'## \1'),
        (r'^(Best Time to Visit)', r'## \1'),
        (r'^(Where to Stay)', r'## \1'),
        (r'^(What to See|What to Do)', r'## \1'),
        (r'^(When to Visit)', r'## \1'),
        (r'^(Historical Heritage|History|Heritage)', r'## \1'),
        (r'^(Tips for Your Visit|Practical Information)', r'## \1'),
        (r'^(Must-Do Experiences?)', r'## \1'),
        (r'^(The .+)', r'## \1'),  # "The Castle", "The Beach", etc.
        (r'^(Accommodation|Dining|Food|Nightlife)', r'## \1'),
    ]

    lines = content.split('\n')
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Check if line looks like a heading but isn't H2
        if stripped and not stripped.startswith('#') and len(stripped) < 60:
            # Check if next line is content (paragraph)
            if i + 1 < len(lines) and lines[i + 1].strip():
                for pattern, replacement in section_patterns:
                    if re.match(pattern, stripped):
                        lines[i] = re.sub(pattern, replacement, stripped)
                        break

    return '\n'.join(lines)

def process_destination_file(filepath):
    """Process a single destination file."""
    print(f"\nProcessing: {filepath.name}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract frontmatter and body
    frontmatter, body = extract_frontmatter(content)

    if not frontmatter:
        print(f"  ❌ No frontmatter found in {filepath.name}")
        return

    # Extract images from body
    inline_images = extract_images_from_content(body)
    print(f"  Found {len(inline_images)} inline images")

    # Update frontmatter with images
    if inline_images:
        frontmatter = update_frontmatter_images(frontmatter, inline_images)

    # Remove inline images from body
    body_clean = remove_inline_images(body)

    # Add "Why Visit" section
    destination_name = filepath.stem
    body_clean = add_why_visit_section(body_clean, destination_name)

    # Ensure H2 structure
    body_clean = ensure_h2_structure(body_clean)

    # Reconstruct file
    new_content = f"---\n{frontmatter}\n---\n{body_clean}"

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  ✅ Complete - {len(inline_images)} images moved to frontmatter")

def main():
    """Process all destination files."""
    print("=" * 60)
    print("Migrating Destinations to Berat Structure")
    print("=" * 60)

    for dest_file in DESTINATIONS:
        filepath = BASE_PATH / dest_file
        if filepath.exists():
            try:
                process_destination_file(filepath)
            except Exception as e:
                print(f"  ❌ Error processing {dest_file}: {str(e)}")
        else:
            print(f"  ⚠️  File not found: {dest_file}")

    print("\n" + "=" * 60)
    print("Migration Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
