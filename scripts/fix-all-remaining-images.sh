#!/bin/bash
# Fix ALL remaining broken images across all content types

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

echo "🔄 Fixing all remaining broken images..."
echo ""

# Function to safely copy
safe_copy() {
  src="$1"
  dst="$2"

  if [ -f "$src" ] && [ ! -f "$dst" ]; then
    cp "$src" "$dst" && echo "✅ $(basename $dst)"
  elif [ ! -f "$src" ]; then
    echo "❌ Source missing: $(basename $src)"
  else
    echo "⏭️  Already exists: $(basename $dst)"
  fi
}

echo "=== ACTIVITIES ==="
cd public/images/activities

# Historical sites - use castle image from attractions
safe_copy "../attractions/Gjirokastra_Castle_2025_DSC07013.jpg" "historical-sites.jpg"

# Mountain biking - check if there's a biking image
safe_copy "DJI_0420.jpg" "mountain-biking.jpg"

# Cycle Albania - use a generic cycling image if available
[ ! -f "cycle-albania.jpg" ] && echo "⚠️  Need to source: cycle-albania.jpg"

echo ""
echo "=== ATTRACTIONS ==="
cd ../attractions

# Mountains - use mountain image
safe_copy "Gjallica-Mountain.jpeg" "mountains.jpg"

# Drisht Castle - use another castle image
safe_copy "Rozafa_Castle_Shkoder_AdobeStock_354792030.jpeg" "drisht-castle.jpg"

# Kardhiq Castle - use castle image
safe_copy "Gjirokaster_castle_660721281.jpeg" "kardhiq-castle.jpg"

# Porto Palermo - check if there's one
[ ! -f "porto-palermo-castle.jpg" ] && echo "⚠️  Need to source: porto-palermo-castle.jpg"

# National History Museum - use museum image
safe_copy "House-of-Leaves-Museum4-2.jpg" "national-history-museum.jpg"

# Onufri Museum - use museum/religious art image
safe_copy "Berat_Onufri_Iconographic_Museum_AdobeStock_194089395.jpeg" "onufri-iconographic-museum.jpg"

# Ethnographic Museum Kruje
safe_copy "Fortress-and-Skanderbeg-Museum-Dusk-Kruja-Kruje.jpeg" "ethnographic-museum-kruje.jpg"

# History museums - generic museum image
safe_copy "House-of-Leaves-Museum9.jpg" "history-museums.jpg"

# Secluded beaches - use beach image
safe_copy "Mirror-beach.jpeg" "secluded-boat-only-virgin-beaches.jpg"

# Top things to do - use a landmark image
safe_copy "Albanian-Alps.jpeg" "top-things-to-do-albania.jpg"

echo ""
echo "✅ Done fixing available images"
echo ""
echo "📝 Still need to source externally:"
cd "/Users/ez/Desktop/AI Library/Apps/AV-CC/public/images/activities"
[ ! -f "cycle-albania.jpg" ] && echo "  - activities/cycle-albania.jpg"
cd "../attractions"
[ ! -f "porto-palermo-castle.jpg" ] && echo "  - attractions/porto-palermo-castle.jpg"
