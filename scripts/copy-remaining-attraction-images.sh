#!/bin/bash
# Copy remaining WordPress images for attractions

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

echo "🔄 Copying remaining attraction images..."
echo ""

# Function to safely copy
safe_copy() {
  src="$1"
  dst="$2"

  if [ -f "$src" ] && [ ! -f "$dst" ]; then
    cp "$src" "$dst" && echo "✅ $(basename $dst)"
  elif [ ! -f "$src" ]; then
    echo "❌ Missing: $(basename $src)"
  fi
}

cd public/images/attractions

# Apollonia
safe_copy "Apollonia-Albania-1.jpeg" "apollonia-archaeological-museum.jpg"

# Saint Theodore's Monastery
safe_copy "Saint_Theodore_Monastery_143389621.jpeg" "saint-theodores-monastery.jpg"

# Generic Lakes category
safe_copy "lake-shkoder-albania.jpeg" "lakes.jpg"

# Lin Basilica (use Lake Ohrid image as it's nearby)
safe_copy "Lin-Lake-Ohrid.jpeg" "lin-basilica.jpg"

# Karaburun images
safe_copy "Karaburun-Dafina-Bay.jpeg" "karaburun-peninsula-hidden-beaches-bays-caves.jpg"
safe_copy "Dafina-Bay.jpeg" "karaburun-sazan-marine-national-park.jpg"

# Gjirokastra Museums - use castle museum image
safe_copy "gjirokastra-castle-museum.jpeg" "gjirokastra-ethnographic-museum.jpg"
safe_copy "Gjirokaster_castle_prison_museum_649839576.jpeg" "gjirokastra-historical-museum.jpg"

# Check ../destinations for some images
cd ../destinations

# Ancient City Phoenice
safe_copy "Butrint-Archeological-Park.jpeg" "../attractions/ancient-city-phoenice.jpg"

cd ../attractions

# For truly missing images, we'll create a list
echo ""
echo "📝 Still missing (need to source):"
[ ! -f "drisht-castle.jpg" ] && echo "  - drisht-castle.jpg"
[ ! -f "ethnographic-museum-kruje.jpg" ] && echo "  - ethnographic-museum-kruje.jpg"
[ ! -f "history-museums.jpg" ] && echo "  - history-museums.jpg"
[ ! -f "kardhiq-castle.jpg" ] && echo "  - kardhiq-castle.jpg"
[ ! -f "mountains.jpg" ] && echo "  - mountains.jpg"
[ ! -f "national-history-museum.jpg" ] && echo "  - national-history-museum.jpg"
[ ! -f "onufri-iconographic-museum.jpg" ] && echo "  - onufri-iconographic-museum.jpg"
[ ! -f "porto-palermo-castle.jpg" ] && echo "  - porto-palermo-castle.jpg"
[ ! -f "secluded-boat-only-virgin-beaches.jpg" ] && echo "  - secluded-boat-only-virgin-beaches.jpg"
[ ! -f "top-things-to-do-albania.jpg" ] && echo "  - top-things-to-do-albania.jpg"

echo ""
echo "✅ Done copying available images"
