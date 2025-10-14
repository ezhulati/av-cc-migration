#!/usr/bin/env python3
import os
import glob
import re

collections = ['posts', 'pages', 'destinations', 'activities', 'attractions']
fixed_count = 0

for collection in collections:
    directory = f'src/content/{collection}'
    if not os.path.exists(directory):
        continue

    pattern = os.path.join(directory, '*.md')
    files = glob.glob(pattern)

    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Fix 1: Remove stray quote after slug line followed by newline and another quote/whitespace
        content = re.sub(r'(slug: [^\n]+\n)\s*"\s*\n', r'\1', content)

        # Fix 2: Fix multiline metaDescription that breaks across lines
        content = re.sub(
            r'metaDescription: "([^"]*)\n"',
            lambda m: f'metaDescription: "{m.group(1).strip()}"',
            content
        )

        # Fix 3: Remove lines with just a quote
        lines = content.split('\n')
        new_lines = []
        in_frontmatter = False
        frontmatter_delimiter_count = 0

        for i, line in enumerate(lines):
            # Track frontmatter boundaries
            if line.strip() == '---':
                frontmatter_delimiter_count += 1
                if frontmatter_delimiter_count <= 2:
                    in_frontmatter = (frontmatter_delimiter_count == 1)
                new_lines.append(line)
                continue

            # Skip lines that are just a quote within frontmatter
            if in_frontmatter and line.strip() == '"':
                continue

            new_lines.append(line)

        content = '\n'.join(new_lines)

        # Fix 4: Remove duplicate seo fields
        lines = content.split('\n')
        new_lines = []
        in_seo = False
        seen_focus_keyword = False
        seen_robots = False
        seen_canonical = False

        for i, line in enumerate(lines):
            if 'seo:' in line and not line.strip().startswith('#'):
                in_seo = True
                seen_focus_keyword = False
                seen_robots = False
                seen_canonical = False
                new_lines.append(line)
                continue

            if in_seo:
                if line == '---':
                    in_seo = False
                    new_lines.append(line)
                    continue

                if 'focusKeyword:' in line:
                    if seen_focus_keyword:
                        continue
                    seen_focus_keyword = True

                if 'robots:' in line:
                    if seen_robots:
                        continue
                    seen_robots = True

                if 'canonicalURL:' in line:
                    if seen_canonical:
                        continue
                    seen_canonical = True

            new_lines.append(line)

        content = '\n'.join(new_lines)

        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            fixed_count += 1
            print(f"✓ Fixed {collection}/{os.path.basename(filepath)}")

print(f"\n✅ Fixed {fixed_count} content files across all collections")
