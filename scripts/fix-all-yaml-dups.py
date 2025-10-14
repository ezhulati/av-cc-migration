#!/usr/bin/env python3
import os
import glob

def fix_yaml_duplicates(filepath):
    """Fix duplicate YAML keys in frontmatter"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if '---' not in content:
        return False

    lines = content.split('\n')
    new_lines = []
    in_frontmatter = False
    in_seo = False
    seen_keys = {}
    fixed = False

    for i, line in enumerate(lines):
        # Track frontmatter boundaries
        if line.strip() == '---':
            if not in_frontmatter:
                in_frontmatter = True
                seen_keys = {}
            else:
                in_frontmatter = False
                in_seo = False
            new_lines.append(line)
            continue

        if not in_frontmatter:
            new_lines.append(line)
            continue

        # Track seo section
        if line.strip() == 'seo:':
            in_seo = True
            seen_keys = {}
            new_lines.append(line)
            continue

        # Exit seo section
        if in_seo and line and not line.startswith(' '):
            in_seo = False
            seen_keys = {}

        # Check for duplicate keys
        if ':' in line:
            # Extract key (everything before first colon, stripped of leading spaces)
            key = line.split(':')[0].strip()

            if key in seen_keys:
                print(f"  Removing duplicate {key} in {os.path.basename(filepath)}")
                fixed = True
                continue  # Skip this duplicate line
            else:
                seen_keys[key] = True

        new_lines.append(line)

    if fixed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        return True
    return False

# Process all content directories
base_dir = 'src/content'
content_types = ['posts', 'pages', 'destinations', 'accommodation', 'attractions', 'activities']

total_fixed = 0
for content_type in content_types:
    dir_path = os.path.join(base_dir, content_type)
    if not os.path.exists(dir_path):
        continue

    print(f"\nProcessing {content_type}...")
    pattern = os.path.join(dir_path, '*.md')
    files = glob.glob(pattern)

    fixed_count = 0
    for filepath in files:
        if fix_yaml_duplicates(filepath):
            fixed_count += 1

    if fixed_count > 0:
        print(f"✓ Fixed {fixed_count} files in {content_type}")
        total_fixed += fixed_count

print(f"\n✅ Total files fixed: {total_fixed}")
