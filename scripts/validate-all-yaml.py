#!/usr/bin/env python3
import os
import glob
import sys

def validate_yaml_file(filepath):
    """Validate a markdown file's YAML frontmatter"""
    issues = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        # Check if file starts with frontmatter
        if not lines or not lines[0].strip() == '---':
            return [f"No frontmatter start"]

        # Find end of frontmatter
        end_idx = None
        for i in range(1, len(lines)):
            if lines[i].strip() == '---':
                end_idx = i
                break

        if end_idx is None:
            return [f"No frontmatter end"]

        frontmatter_lines = lines[1:end_idx]

        # Check each line for common issues
        for line_num, line in enumerate(frontmatter_lines, start=2):  # Start at 2 (after first ---)
            # Check for bad indentation in lists
            if line.strip().startswith('- '):
                # Count leading spaces
                leading_spaces = len(line) - len(line.lstrip())
                # Should be multiple of 2
                if leading_spaces % 2 != 0:
                    issues.append(f"Line {line_num}: Bad indentation (odd number of spaces)")

            # Check for trailing quotes or backslashes
            stripped = line.rstrip()
            if stripped.endswith('\\'):
                issues.append(f"Line {line_num}: Trailing backslash")

            # Check for unescaped special characters in unquoted strings
            if ':' in line:
                key_val = line.split(':', 1)
                if len(key_val) == 2:
                    value = key_val[1].strip()
                    # Check if value starts with quote
                    if value and not value.startswith('"') and not value.startswith("'"):
                        # Check for problematic characters
                        if '\\' in value and not value.startswith('['):
                            issues.append(f"Line {line_num}: Escape sequence in unquoted value: {value[:50]}")

        return issues

    except Exception as e:
        return [f"Error reading file: {str(e)}"]

def main():
    directory = 'src/content/accommodation'
    pattern = os.path.join(directory, '*.md')
    files = glob.glob(pattern)

    print(f"\n🔍 Validating {len(files)} accommodation files...\n")

    problematic_files = {}

    for filepath in files:
        issues = validate_yaml_file(filepath)
        if issues:
            problematic_files[filepath] = issues

    if not problematic_files:
        print("✅ All files passed validation!\n")
        return 0

    print(f"🚨 Found {len(problematic_files)} files with issues:\n")

    # Show first 20 files
    for i, (filepath, issues) in enumerate(list(problematic_files.items())[:20]):
        filename = os.path.basename(filepath)
        print(f"\n❌ {filename}")
        for issue in issues[:3]:  # Show first 3 issues per file
            print(f"   {issue}")
        if len(issues) > 3:
            print(f"   ... and {len(issues) - 3} more issues")

    if len(problematic_files) > 20:
        print(f"\n... and {len(problematic_files) - 20} more files with issues")

    print(f"\n📊 Summary: {len(problematic_files)} files need fixing\n")

    return 1

if __name__ == '__main__':
    sys.exit(main())
