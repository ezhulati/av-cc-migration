#!/bin/bash

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

echo "=== IMAGE VERIFICATION REPORT ==="
echo ""

BROKEN=0
WORKING=0

for dest in bajram-curri lezhe dhermi valbona theth puke shkoder kruje borsh himare saranda; do
  echo "━━━ $dest ━━━"
  md_file="src/content/destinations/${dest}.md"

  if [ ! -f "$md_file" ]; then
    echo "❌ Markdown file not found"
    echo ""
    continue
  fi

  img_ref=$(grep "featuredImage:" "$md_file" | sed 's/.*featuredImage: *//; s/["'\''"]//g')
  echo "Reference: $img_ref"

  img_path="public${img_ref}"

  if [ -f "$img_path" ]; then
    size=$(ls -lh "$img_path" | awk '{print $5}')
    echo "✅ EXISTS: $size"
    WORKING=$((WORKING + 1))
  else
    echo "❌ MISSING: $img_path"
    BROKEN=$((BROKEN + 1))

    # Find alternatives
    base=$(basename "$img_ref" | sed 's/\.[^.]*$//')
    echo "Searching for: $base"
    matches=$(ls -1 public/images/destinations/ 2>/dev/null | grep -i "$base" | head -1)
    if [ ! -z "$matches" ]; then
      echo "Found alternative: $matches"
    fi
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Working: $WORKING"
echo "❌ Broken: $BROKEN"
echo ""

if [ $BROKEN -gt 0 ]; then
  echo "⚠️  BROKEN IMAGES FOUND - NEEDS FIXING"
  exit 1
else
  echo "🎉 ALL IMAGES VERIFIED!"
  exit 0
fi
