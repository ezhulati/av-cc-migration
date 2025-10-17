#!/bin/bash
# Test actual HTTP status of images in browser

echo "🌐 Testing images via HTTP on localhost:4322..."
echo ""

test_images() {
  type=$1
  echo "=== $type ==="

  tested=0
  working=0

  # Sample 10 images from each type
  while IFS= read -r line && [ $tested -lt 10 ]; do
    img=$(echo "$line" | sed 's/featuredImage: //' | tr -d '"')

    [ -z "$img" ] && continue
    [[ "$img" == http* ]] && continue  # Skip external URLs

    tested=$((tested + 1))
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4322${img}")

    if [ "$status" = "200" ]; then
      working=$((working + 1))
      echo "✅ $(basename $img)"
    else
      echo "❌ $(basename $img) (HTTP $status)"
    fi
  done < <(grep -h "featuredImage:" src/content/${type}/*.md 2>/dev/null | head -10)

  echo "Result: $working/$tested working"
  echo ""
}

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

test_images "attractions"
test_images "activities"
test_images "destinations"
test_images "posts"
