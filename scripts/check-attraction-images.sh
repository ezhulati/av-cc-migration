#!/bin/bash
# Check which attraction images actually exist

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

echo "🔍 Checking attraction image references..."
echo ""

exists=0
missing=0

while IFS= read -r line; do
  img=$(echo "$line" | sed 's/featuredImage: //')
  file="public${img}"

  if [ -f "$file" ]; then
    exists=$((exists + 1))
  else
    echo "❌ MISSING: $img"
    missing=$((missing + 1))
  fi
done < <(grep -h "featuredImage:" src/content/attractions/*.md)

echo ""
echo "✅ Existing: $exists"
echo "❌ Missing: $missing"
