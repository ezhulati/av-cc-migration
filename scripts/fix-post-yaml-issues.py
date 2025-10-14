#!/usr/bin/env python3
import os
import glob
import re

directory = 'src/content/posts'
pattern = os.path.join(directory, '*.md')
files = glob.glob(pattern)

fixed_count = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Fix 1: Remove stray quote after slug line
    content = re.sub(r'(slug: [^\n]+\n)"\n', r'\1', content)

    # Fix 2: Fix multiline metaDescription that breaks across lines
    # Pattern: metaDescription: "text... \n"
    content = re.sub(
        r'metaDescription: "([^"]*)\n"',
        lambda m: f'metaDescription: "{m.group(1).strip()}"',
        content
    )

    # Fix 3: Remove duplicate focusKeyword/robots after metaDescription
    lines = content.split('\n')
    new_lines = []
    in_seo = False
    seen_focus_keyword = False
    seen_robots = False
    skip_next_closing_quote_line = False

    for i, line in enumerate(lines):
        if 'seo:' in line and not line.strip().startswith('#'):
            in_seo = True
            seen_focus_keyword = False
            seen_robots = False
            new_lines.append(line)
            continue

        if in_seo:
            if line == '---':
                in_seo = False
                seen_focus_keyword = False
                seen_robots = False
                new_lines.append(line)
                continue

            if 'focusKeyword:' in line:
                if seen_focus_keyword:
                    continue  # Skip duplicate
                seen_focus_keyword = True

            if 'robots:' in line:
                if seen_robots:
                    continue  # Skip duplicate
                seen_robots = True

        new_lines.append(line)

    content = '\n'.join(new_lines)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixed_count += 1
        print(f"✓ Fixed {os.path.basename(filepath)}")

print(f"\n✅ Fixed {fixed_count} post files")
