#!/bin/bash

echo ""
echo "🔍 Checking accommodation files for invalid slug values..."
echo ""

count=0
problematic=0

for file in src/content/accommodation/*.md; do
    ((count++))

    # Extract the slug line
    slug_line=$(grep "^slug:" "$file" 2>/dev/null)

    if [ -z "$slug_line" ]; then
        echo "❌ $(basename "$file") - No slug field found"
        ((problematic++))
        continue
    fi

    # Get the value after "slug:"
    slug_value=$(echo "$slug_line" | sed 's/^slug:[[:space:]]*//')

    # Check for empty value
    if [ -z "$slug_value" ]; then
        echo "❌ $(basename "$file") - Empty slug value"
        ((problematic++))
        if [ $problematic -ge 50 ]; then
            break
        fi
        continue
    fi

    # Check for null
    if [ "$slug_value" = "null" ] || [ "$slug_value" = "~" ]; then
        echo "❌ $(basename "$file") - Slug is null: '$slug_value'"
        ((problematic++))
        if [ $problematic -ge 50 ]; then
            break
        fi
        continue
    fi

    # Check for numeric-only (no quotes)
    if [[ "$slug_value" =~ ^[0-9]+$ ]]; then
        echo "❌ $(basename "$file") - Numeric slug: '$slug_value'"
        ((problematic++))
        if [ $problematic -ge 50 ]; then
            break
        fi
        continue
    fi
done

echo ""
echo "📊 Results:"
echo "   Total files checked: $count"
echo "   Problematic files: $problematic"
echo ""

if [ $problematic -eq 0 ]; then
    echo "✅ All accommodation files have valid slug values!"
else
    echo "🚨 Found $problematic files with invalid slugs (showing first 50)"
fi
echo ""
