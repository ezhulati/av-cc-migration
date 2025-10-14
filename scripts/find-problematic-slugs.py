#!/usr/bin/env python3
import os
import glob
import yaml

def check_file(filepath):
    """Check if file has a valid slug"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract frontmatter
        if not content.startswith('---'):
            return f"No frontmatter start: {filepath}"

        parts = content.split('---', 2)
        if len(parts) < 3:
            return f"Incomplete frontmatter: {filepath}"

        frontmatter_str = parts[1]

        # Parse YAML
        try:
            frontmatter = yaml.safe_load(frontmatter_str)
        except yaml.YAMLError as e:
            return f"YAML error in {filepath}: {e}"

        # Check slug
        if frontmatter is None:
            return f"Empty frontmatter: {filepath}"

        if 'slug' not in frontmatter:
            return f"No slug field: {filepath}"

        slug = frontmatter.get('slug')

        if slug is None:
            return f"Null slug: {filepath}"

        if not isinstance(slug, str):
            return f"Non-string slug ({type(slug).__name__}): {filepath} = {slug}"

        if slug.strip() == '':
            return f"Empty slug: {filepath}"

        # Check title and description too (required fields)
        if 'title' not in frontmatter:
            return f"No title field: {filepath}"

        if 'description' not in frontmatter:
            return f"No description field: {filepath}"

        return None  # All good

    except Exception as e:
        return f"Error reading {filepath}: {e}"

# Check all collections
collections = ['posts', 'pages', 'accommodation', 'destinations', 'activities', 'attractions']
problems = []

for collection in collections:
    directory = f'src/content/{collection}'
    if not os.path.exists(directory):
        print(f"⚠️  Collection {collection} directory not found")
        continue

    pattern = os.path.join(directory, '*.md')
    files = glob.glob(pattern)

    print(f"\n🔍 Checking {len(files)} files in {collection}...")

    for filepath in files:
        issue = check_file(filepath)
        if issue:
            problems.append(issue)
            print(f"  ❌ {issue}")

if problems:
    print(f"\n\n🚨 Found {len(problems)} problematic files:")
    for p in problems:
        print(f"  - {p}")
else:
    print("\n\n✅ All files have valid slugs!")
