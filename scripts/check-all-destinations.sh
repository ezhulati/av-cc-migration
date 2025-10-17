#!/bin/bash

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

echo "=== CHECKING ALL DESTINATION IMAGES ==="
echo ""

BROKEN=0
WORKING=0
BROKEN_LIST=""

for file in src/content/destinations/*.md; do
  dest=$(basename "$file" .md)
  img_ref=$(grep "featuredImage:" "$file" | sed 's/.*featuredImage: *//; s/["'\'']//g')

  if [ -z "$img_ref" ]; then
    continue
  fi

  img_path="public${img_ref}"

  if [ -f "$img_path" ]; then
    WORKING=$((WORKING + 1))
  else
    BROKEN=$((BROKEN + 1))
    echo "❌ $dest"
    echo "   Expects: $img_ref"

    # Try to find similar file
    filename=$(basename "$img_ref")
    base=$(echo "$filename" | sed 's/\.[^.]*$//')

    # Case-insensitive search
    found=$(find public/images/destinations/ -iname "$filename" 2>/dev/null | head -1)
    if [ ! -z "$found" ]; then
      actual=$(echo "$found" | sed 's|public||')
      echo "   Found:   $actual"
      BROKEN_LIST="${BROKEN_LIST}${dest}|${img_ref}|${actual}\n"
    else
      # Search for base name
      found=$(find public/images/destinations/ -iname "${base}.*" 2>/dev/null | head -1)
      if [ ! -z "$found" ]; then
        actual=$(echo "$found" | sed 's|public||')
        echo "   Similar: $actual"
        BROKEN_LIST="${BROKEN_LIST}${dest}|${img_ref}|${actual}\n"
      else
        echo "   Status: NO FILE FOUND"
        BROKEN_LIST="${BROKEN_LIST}${dest}|${img_ref}|MISSING\n"
      fi
    fi
    echo ""
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Working: $WORKING"
echo "❌ Broken: $BROKEN"
echo ""

if [ $BROKEN -gt 0 ]; then
  echo "⚠️  BROKEN IMAGES - GENERATING FIX SCRIPT"
  echo ""
  echo "# Copy and run these commands to fix:"
  echo ""
  echo -e "$BROKEN_LIST" | while IFS='|' read dest expected actual; do
    if [ ! -z "$dest" ] && [ "$actual" != "MISSING" ]; then
      echo "sed -i '' 's|$expected|$actual|g' src/content/destinations/${dest}.md"
    fi
  done
fi
