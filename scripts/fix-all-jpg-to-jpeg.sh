#!/bin/bash

# Fix all .jpg to .jpeg image extension mismatches
# This script finds .jpeg files and updates corresponding .jpg references in markdown

PROJECT_ROOT="/Users/ez/Desktop/AI Library/Apps/AV-CC"
cd "$PROJECT_ROOT" || exit 1

FIXED=0
SKIPPED=0

echo "🔍 Scanning for image extension mismatches..."

# Function to fix a single markdown file
fix_markdown_file() {
    local md_file="$1"
    local collection="$2"

    # Extract all .jpg image references
    grep -o 'featuredImage: *[\"'\'']*/images/[^\"'\'']*\.jpg[\"'\'']' "$md_file" | while read -r line; do
        # Extract just the path
        jpg_path=$(echo "$line" | sed -E 's/.*featuredImage: *[\"'\'']?([^\"'\'']*)\.jpg.*/\1.jpg/')

        # Convert to filesystem path
        local_jpg_path="${jpg_path#/}"  # Remove leading slash
        local_jpeg_path="${local_jpg_path%.jpg}.jpeg"

        # Check if .jpeg version exists
        if [ -f "$PROJECT_ROOT/public/$local_jpeg_path" ]; then
            # Update the markdown file
            sed -i '' "s|${jpg_path}|${jpg_path%.jpg}.jpeg|g" "$md_file"
            echo "✅ Fixed: $(basename "$md_file") → ${jpg_path%.jpg}.jpeg"
            ((FIXED++))
        else
            echo "⏭️  Skipped: $(basename "$md_file") - no .jpeg found for $jpg_path"
            ((SKIPPED++))
        fi
    done
}

# Process each collection
for collection in destinations attractions activities posts pages; do
    if [ -d "src/content/$collection" ]; then
        echo ""
        echo "📁 Processing $collection..."
        for file in src/content/$collection/*.md; do
            if [ -f "$file" ] && grep -q 'featuredImage:.*\.jpg' "$file"; then
                fix_markdown_file "$file" "$collection"
            fi
        done
    fi
done

echo ""
echo "=============================="
echo "📊 Summary"
echo "=============================="
echo "✅ Fixed: $FIXED"
echo "⏭️  Skipped: $SKIPPED"
echo ""
