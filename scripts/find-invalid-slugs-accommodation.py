#!/usr/bin/env python3
import os
import glob
import yaml
import re

directory = 'src/content/accommodation'
pattern = os.path.join(directory, '*.md')
files = glob.glob(pattern)

problematic_files = []

for filepath in files:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract frontmatter
        if not content.startswith('---'):
            problematic_files.append(f"No frontmatter: {filepath}")
            continue

        parts = content.split('---', 2)
        if len(parts) < 3:
            problematic_files.append(f"Incomplete frontmatter: {filepath}")
            continue

        frontmatter_str = parts[1]

        # Parse YAML
        try:
            frontmatter = yaml.safe_load(frontmatter_str)
        except yaml.YAMLError as e:
            problematic_files.append(f"YAML error: {filepath} - {e}")
            continue

        if frontmatter is None:
            problematic_files.append(f"Empty frontmatter: {filepath}")
            continue

        # Check slug
        if 'slug' not in frontmatter:
            problematic_files.append(f"No slug field: {filepath}")
            continue

        slug = frontmatter.get('slug')

        # Check if slug is invalid (not a string)
        if slug is None:
            problematic_files.append(f"Null slug: {filepath}")
        elif not isinstance(slug, str):
            problematic_files.append(f"Non-string slug ({type(slug).__name__}): {filepath} = {slug}")
        elif slug.strip() == '':
            problematic_files.append(f"Empty slug string: {filepath}")

    except Exception as e:
        problematic_files.append(f"Error reading {filepath}: {e}")

print(f"\n🔍 Checked {len(files)} accommodation files\n")

if problematic_files:
    print(f"🚨 Found {len(problematic_files)} files with invalid slugs:\n")
    for issue in problematic_files[:50]:  # Show first 50
        print(f"  ❌ {issue}")
    if len(problematic_files) > 50:
        print(f"\n  ... and {len(problematic_files) - 50} more issues")
else:
    print("✅ All files have valid string slugs!")
