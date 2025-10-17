#!/bin/bash
# Fix filenames that had hyphens incorrectly removed

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC/public/images/attractions"

# Attractions
[ -f "ancientillyriantombsofselca.jpg" ] && mv "ancientillyriantombsofselca.jpg" "ancient-illyrian-tombs-of-selca.jpg"
[ -f "bestbeachesinalbania.jpg" ] && mv "bestbeachesinalbania.jpg" "best-beaches-in-albania.jpg"
[ -f "blueeyespring.jpg" ] && mv "blueeyespring.jpg" "blue-eye-spring.jpg"
[ -f "byllisarchaeologicalpark.jpg" ] && mv "byllisarchaeologicalpark.jpg" "byllis-archaeological-park.jpg"
[ -f "castlesandfortressesinalbania.jpg" ] && mv "castlesandfortressesinalbania.jpg" "castles-and-fortresses-in-albania.jpg"
[ -f "coastalalbania.jpg" ] && mv "coastalalbania.jpg" "coastal-albania.jpg"
[ -f "dafinabaykaraburunalbania.jpg" ] && mv "dafinabaykaraburunalbania.jpg" "dafina-bay-karaburun-albania.jpg"
[ -f "dajtinationalpark.jpg" ] && mv "dajtinationalpark.jpg" "dajti-national-park.jpg"
[ -f "durresamphitheatre.jpg" ] && mv "durresamphitheatre.jpg" "durres-amphitheatre.jpg"
[ -f "gjirokastracastlemuseum.jpg" ] && mv "gjirokastracastlemuseum.jpg" "gjirokastra-castle-museum.jpg"
[ -f "medaurwinery.jpg" ] && mv "medaurwinery.jpg" "medaur-winery.jpg"
[ -f "naturalwonders.jpg" ] && mv "naturalwonders.jpg" "natural-wonders.jpg"
[ -f "shalariver.jpg" ] && mv "shalariver.jpg" "shala-river.jpg"
[ -f "tumulusofkamenica.jpg" ] && mv "tumulusofkamenica.jpg" "tumulus-of-kamenica.jpg"

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC/public/images/activities"

# Activities
[ -f "hikingtrekking.jpg" ] && mv "hikingtrekking.jpg" "hiking-trekking.jpg"
[ -f "winetasting.jpg" ] && mv "winetasting.jpg" "wine-tasting.jpg"

echo "✅ Fixed hyphenated filenames"
