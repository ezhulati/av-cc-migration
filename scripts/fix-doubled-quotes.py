#!/usr/bin/env python3
import os
import glob
import re

directory = 'src/content/accommodation'
pattern = os.path.join(directory, '*.md')
files = glob.glob(pattern)

fixed_count = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file has doubled quotes pattern in text fields
    if re.search(r'text:\s*""', content):
        # Fix the doubled quotes pattern: text: ""..."" -> text: "..."
        new_content = re.sub(r'(\s+text:\s*)""([^"]*(?:"[^"]+")*)""', r'\1"\2"', content)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

        fixed_count += 1
        print(f"✓ Fixed {os.path.basename(filepath)}")

print(f"\n✅ Fixed {fixed_count} accommodation files with doubled quotes")
