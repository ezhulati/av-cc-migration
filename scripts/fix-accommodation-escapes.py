#!/usr/bin/env python3
import os
import glob

directory = 'src/content/accommodation'
pattern = os.path.join(directory, '*.md')
files = glob.glob(pattern)

fixed_count = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file has escape sequences
    if '\\n' in content or '\\t' in content:
        # Replace escape sequences with actual characters
        new_content = content.replace('\\n', '\n').replace('\\t', '\t')

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

        fixed_count += 1
        print(f"✓ Fixed {os.path.basename(filepath)}")

print(f"\n✅ Fixed {fixed_count} accommodation files")
