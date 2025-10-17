#!/bin/bash
# Check ALL content types for broken images

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

echo "🔍 Checking ALL content types for image references..."
echo ""

check_content_type() {
  type=$1
  echo "=== $type ==="

  exists=0
  missing=0

  while IFS= read -r line; do
    img=$(echo "$line" | sed 's/featuredImage: //' | tr -d '"')

    # Skip empty lines
    [ -z "$img" ] && continue

    file="public${img}"

    if [ -f "$file" ]; then
      exists=$((exists + 1))
    else
      echo "❌ $img"
      missing=$((missing + 1))
    fi
  done < <(grep -h "featuredImage:" src/content/${type}/*.md 2>/dev/null)

  echo "✅ Existing: $exists"
  echo "❌ Missing: $missing"
  echo ""
}

check_content_type "attractions"
check_content_type "activities"
check_content_type "destinations"
check_content_type "accommodation"
check_content_type "posts"
check_content_type "pages"
