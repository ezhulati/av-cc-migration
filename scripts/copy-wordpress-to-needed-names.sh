#!/bin/bash
# Copy WordPress images to the exact names content files reference

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC/public/images/attractions"

echo "🔄 Copying WordPress images to content-referenced names..."
echo ""

# Function to safely copy (only if source exists and target doesn't)
safe_copy() {
  src="$1"
  dst="$2"

  if [ -f "$src" ] && [ ! -f "$dst" ]; then
    cp "$src" "$dst" && echo "✅ $dst"
  elif [ -f "$dst" ]; then
    echo "⏭️  Skip (exists): $dst"
  else
    echo "❌ Source missing: $src"
  fi
}

# Ethem Bey Mosque
safe_copy "Ethem-Bey-Mosque-Tirana-Albania.jpeg" "ethem-bey-mosque.jpg"

# Grunas Waterfall
safe_copy "Grunas-Waterfall.jpeg" "grunas-waterfall.jpg"

# Kadiut Bridge
safe_copy "Kadiut-Bridge-Permet.jpeg" "kadiut-bridge.jpg"

# Llogara
safe_copy "Llogara-pass-in-Albania.jpeg" "llogara-pass-albanian-riviera.jpg"
safe_copy "Llogara-Park.jpeg" "llogara-national-park.jpg"

# Skanderbeg Square
safe_copy "Monument-of-Skanderbeg-in-Tirana.jpeg" "skanderbeg-square.jpg"

# Pyramid of Tirana
safe_copy "Pyramid-of-Tirana-Albania-1.jpeg" "pyramid-of-tirana.jpg"

# Lake Bovilla
safe_copy "Bovilla-lake.jpeg" "lake-bovilla.jpg"

# Lake Ohrid
safe_copy "Lin-Lake-Ohrid.jpeg" "lake-ohrid.jpg"

# Theth National Park
safe_copy "Theth-National-Park.-Shkoder-County-Albania-1.jpeg" "theth-national-park.jpg"

# Valbona Valley
safe_copy "Forest-in-the-Valbona-Valley-National-Park-Albania-Beech-Forrest.jpeg" "valbona-valley-national-park.jpg"

# Langarica River
safe_copy "Langarica-Canyon-.jpeg" "langarica-river.jpg"

# Porto Palermo Castle
safe_copy "Porto-Palermo-Castle.jpeg" "porto-palermo-castle.jpg"

# House of Leaves
safe_copy "Former_Enver_Hoxha_House.jpg" "house-of-leaves.jpg"

# Opera and Ballet Theater
safe_copy "National-Opera-and-Ballet-Theater-.jpeg" "opera-and-ballet-theater.jpg"

# Sky Restaurant Bar
safe_copy "Sky-Restaurant-Tirana-Downtown-Albania.jpeg" "sky-restaurant-bar.jpg"

# Primeval Beech Forests
safe_copy "Primeval-Beech-Forests-Albania-1.jpeg" "primeval-beech-forests-unesco-site.jpg"

# Mount Dajti
safe_copy "Dajti-National-Park-Fauna-Flowers.jpeg" "mount-dajti.jpg"

# Trebeshine Mountain
safe_copy "Trebeshine.jpeg" "trebeshine-mountain.jpg"

# Green Coast
safe_copy "Green-Coast-Albania-Blue-Flag-Certification-1.jpeg" "green-coast.jpg"

# Karaburun Peninsula
safe_copy "Karaburun-Peninsula-Albania.jpg" "karaburun-peninsula-hidden-beaches-bays-caves.jpg"

# National History Museum
safe_copy "National-History-Museum-Tirana.jpg" "national-history-museum.jpg"

# Berat Ethnographic Museum
safe_copy "Ethnographic-museum-in-Berat.jpeg" "berat-ethnographic-museum.jpg"

# Onufri Museum
safe_copy "Berat-Onufri-Museum.jpeg" "onufri-iconographic-museum.jpg"

# Gjirokastra Museums
safe_copy "Gjirokastra-Ethnographic-Museum.jpeg" "gjirokastra-ethnographic-museum.jpg"
safe_copy "Gjirokastra_Historical_Museum.jpg" "gjirokastra-historical-museum.jpg"

# Kruje Ethnographic Museum
safe_copy "Ethnographic-Museum-Kruje.jpeg" "ethnographic-museum-kruje.jpg"

# Generic categories
safe_copy "mountains.jpg" "mountains.jpg"
safe_copy "rivers.jpg" "rivers.jpg"
safe_copy "Shala-River-Albania.jpg" "rivers.jpg"

echo ""
echo "✅ WordPress images copied to content-referenced names"
