#!/usr/bin/env python3
import re

files = [
    'albanian-ethnogenesis.md',
    'modern-day-albania.md',
    'prehistory-albania.md',
    'send-money-to-albania.md',
    'the-fall-of-communism.md',
    'the-illyrians.md'
]

for filename in files:
    filepath = f'src/content/posts/{filename}'

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []
    in_seo = False
    seen_robots = False
    seen_focus = False

    for line in lines:
        if line.strip() == 'seo:':
            in_seo = True
            seen_robots = False
            seen_focus = False
            new_lines.append(line)
            continue

        if in_seo and (line.startswith('---') or (line and not line.startswith(' '))):
            in_seo = False
            seen_robots = False
            seen_focus = False

        if in_seo:
            if '  robots:' in line:
                if not seen_robots:
                    seen_robots = True
                    new_lines.append(line)
                else:
                    print(f'Removing duplicate robots from {filename}')
                    continue
            elif '  focusKeyword:' in line:
                if not seen_focus:
                    seen_focus = True
                    new_lines.append(line)
                else:
                    print(f'Removing duplicate focusKeyword from {filename}')
                    continue
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))

    print(f'✓ Fixed {filename}')

print('\nAll files fixed!')
