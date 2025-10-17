#!/bin/bash

echo "=== CHECKING ALL CONTENT COLLECTION IMAGES ==="
echo ""

TOTAL_WORKING=0
TOTAL_BROKEN=0

# Function to check a collection
check_collection() {
  local collection_name=$1
  local collection_path=$2

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📁 Checking: $collection_name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  WORKING=0
  BROKEN=0

  if [ ! -d "$collection_path" ]; then
    echo "⚠️  Directory not found: $collection_path"
    echo ""
    return
  fi

  for file in "$collection_path"/*.md; do
    if [ ! -f "$file" ]; then
      continue
    fi

    dest=$(basename "$file" .md)

    # Extract featuredImage path
    img_ref=$(grep "featuredImage:" "$file" | sed 's/.*featuredImage: *//; s/["'\''"]//g' | tr -d '\r')

    if [ -z "$img_ref" ]; then
      echo "⚠️  $dest - No featuredImage field"
      continue
    fi

    # Skip external URLs (http/https)
    if [[ "$img_ref" =~ ^https?:// ]]; then
      echo "🌐 $dest - External URL (skipped): ${img_ref:0:50}..."
      WORKING=$((WORKING + 1))
      continue
    fi

    img_path="public${img_ref}"

    if [ -f "$img_path" ]; then
      echo "✅ $dest"
      WORKING=$((WORKING + 1))
    else
      echo "❌ $dest"
      echo "   Expected: $img_path"

      # Try to find similar file (case-insensitive)
      dirname=$(dirname "$img_path")
      filename=$(basename "$img_path")

      if [ -d "$dirname" ]; then
        found=$(find "$dirname" -iname "$filename" 2>/dev/null | head -1)
        if [ -n "$found" ]; then
          echo "   Found similar: $found"
        fi
      fi

      BROKEN=$((BROKEN + 1))
    fi
  done

  echo ""
  echo "Summary for $collection_name: ✅ $WORKING working | ❌ $BROKEN broken"
  echo ""

  TOTAL_WORKING=$((TOTAL_WORKING + WORKING))
  TOTAL_BROKEN=$((TOTAL_BROKEN + BROKEN))
}

# Check each collection
check_collection "Destinations" "src/content/destinations"
check_collection "Activities" "src/content/activities"
check_collection "Attractions" "src/content/attractions"
check_collection "Accommodation" "src/content/accommodation"
check_collection "Posts" "src/content/posts"
check_collection "Pages" "src/content/pages"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 FINAL SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Total Working: $TOTAL_WORKING"
echo "❌ Total Broken: $TOTAL_BROKEN"
echo ""
