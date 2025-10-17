#!/bin/bash
# Test if images are loading in browser

echo "🔍 Testing image loading on http://localhost:4322..."
echo ""

tested=0
working=0
broken=0

# Test attraction images
for img in \
  "albanian-riviera" "albanian-riviera-beaches" "benja-thermal-baths" \
  "blue-eye-spring" "durres-amphitheatre" "gjirokastra-castle-museum" \
  "karavasta-lagoon" "komani-lake" "dajti-national-park" "berat-castle" \
  "ethem-bey-mosque" "grunas-waterfall" "kadiut-bridge" "llogara-national-park" \
  "skanderbeg-square" "pyramid-of-tirana" "lake-bovilla" "lake-ohrid" \
  "theth-national-park" "valbona-valley-national-park"
do
  tested=$((tested + 1))
  http_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4322/images/attractions/${img}.jpg")

  if [ "$http_status" = "200" ]; then
    working=$((working + 1))
    echo "✅ ${img}.jpg"
  else
    broken=$((broken + 1))
    echo "❌ ${img}.jpg (HTTP $http_status)"
  fi
done

echo ""
echo "📊 Results:"
echo "  Tested: $tested"
echo "  ✅ Working: $working"
echo "  ❌ Broken: $broken"
