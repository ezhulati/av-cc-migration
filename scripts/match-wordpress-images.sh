#!/bin/bash
# Match WordPress untracked images to what content needs

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

echo "🔄 Matching WordPress images to content references..."

# Activities - these already exist!
echo "✅ Activities images already in place:"
ls -1 public/images/activities/*.jpg 2>/dev/null || echo "None"

# Attractions - copy WordPress images to simple names needed
cd public/images/attractions

# Copy WordPress images to the simple names content references
[ -f "Benja-Thermal-Baths-in-Permet.jpeg" ] && [ ! -f "benja-thermal-baths.jpg" ] && cp "Benja-Thermal-Baths-in-Permet.jpeg" "benja-thermal-baths.jpg" && echo "✅ benja-thermal-baths.jpg"

[ -f "Albanias-Blue-Eye-Spring.jpeg" ] && [ ! -f "blue-eye-spring.jpg" ] && cp "Albanias-Blue-Eye-Spring.jpeg" "blue-eye-spring.jpg" && echo "✅ blue-eye-spring.jpg"

[ -f "Durres-Amphiteater-Albania.jpg" ] && [ ! -f "durres-amphitheatre.jpg" ] && cp "Durres-Amphiteater-Albania.jpg" "durres-amphitheatre.jpg" && echo "✅ durres-amphitheatre.jpg"

[ -f "Ethem-Bey-Mosque-Tirana-Albania.jpeg" ] && [ ! -f "blloku.jpg" ] && cp "Ethem-Bey-Mosque-Tirana-Albania.jpeg" "blloku.jpg" && echo "✅ blloku.jpg"

[ -f "Divjake-Karavasta-National-Park.jpeg" ] && [ ! -f "karavasta-lagoon.jpg" ] && cp "Divjake-Karavasta-National-Park.jpeg" "karavasta-lagoon.jpg" && echo "✅ karavasta-lagoon.jpg"

[ -f "Albania-Lake-Koman.jpeg" ] && [ ! -f "komani-lake.jpg" ] && cp "Albania-Lake-Koman.jpeg" "komani-lake.jpg" && echo "✅ komani-lake.jpg"

# Best beaches - need a coastal image
[ -f "Durres-Beach-Albania.jpeg" ] && [ ! -f "best-beaches-in-albania.jpg" ] && cp "Durres-Beach-Albania.jpeg" "best-beaches-in-albania.jpg" && echo "✅ best-beaches-in-albania.jpg"

# Albanian Riviera beaches
[ -f "Jale-Beach-Albanian-Riviera.jpeg" ] && [ ! -f "albanian-riviera-beaches.jpg" ] && cp "Jale-Beach-Albanian-Riviera.jpeg" "albanian-riviera-beaches.jpg" && echo "✅ albanian-riviera-beaches.jpg"

# Albanian Riviera
[ -f "Livadhi-beach-Himare.jpeg" ] && [ ! -f "albanian-riviera.jpg" ] && cp "Livadhi-beach-Himare.jpeg" "albanian-riviera.jpg" && echo "✅ albanian-riviera.jpg"

# Berat castle
[ -f "Berat_Castle_1022819157.jpeg" ] && [ ! -f "berat-castle.jpg" ] && cp "Berat_Castle_1022819157.jpeg" "berat-castle.jpg" && echo "✅ berat-castle.jpg"

# Berat general
[ -f "Berat_1030894962.jpeg" ] && [ ! -f "berat.jpg" ] && cp "Berat_1030894962.jpeg" "berat.jpg" && echo "✅ berat.jpg"

# Byllis
[ -f "../activities/Byllis-Albania.jpeg" ] && [ ! -f "byllis-archaeological-park.jpg" ] && cp "../activities/Byllis-Albania.jpeg" "byllis-archaeological-park.jpg" && echo "✅ byllis-archaeological-park.jpg"

# Castles
[ -f "Gjirokastra_Castle_2025_DSC07013.jpg" ] && [ ! -f "castles-and-fortresses-in-albania.jpg" ] && cp "Gjirokastra_Castle_2025_DSC07013.jpg" "castles-and-fortresses-in-albania.jpg" && echo "✅ castles-and-fortresses-in-albania.jpg"

# Coastal Albania
[ -f "Palasë.jpeg" ] && [ ! -f "coastal-albania.jpg" ] && cp "Palasë.jpeg" "coastal-albania.jpg" && echo "✅ coastal-albania.jpg"

# Dafina Bay
[ -f "Dafina-Bay.jpeg" ] && [ ! -f "dafina-bay-karaburun-albania.jpg" ] && cp "Dafina-Bay.jpeg" "dafina-bay-karaburun-albania.jpg" && echo "✅ dafina-bay-karaburun-albania.jpg"

# Dajti National Park
[ -f "Dajti-National-Park-Fauna-Flowers.jpeg" ] && [ ! -f "dajti-national-park.jpg" ] && cp "Dajti-National-Park-Fauna-Flowers.jpeg" "dajti-national-park.jpg" && echo "✅ dajti-national-park.jpg"

echo ""
echo "✅ WordPress images matched to content references"
