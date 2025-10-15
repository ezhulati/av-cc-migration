#!/bin/bash

echo "Fixing all remaining escape sequence issues..."

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

# Fix \Season Gastro
find src/content/accommodation -name "*.md" -type f -exec sed -i '' 's/Bar \\Season Gastro\\\\"\\"/Bar Season Gastro/g' {} \;

# Fix \Select
find src/content/accommodation -name "*.md" -type f -exec sed -i '' 's/Bar Kafe \\Select\\\\"\\"/Bar Kafe Select/g' {} \;

# Fix \Shiroka
find src/content/accommodation -name "*.md" -type f -exec sed -i '' 's/Restorant \\Shiroka\\\\"\\"/Restorant Shiroka/g' {} \;

# Fix \Station
find src/content/accommodation -name "*.md" -type f -exec sed -i '' 's/Fast Food \\Station\\\\"\\"/Fast Food Station/g' {} \;

echo "✅ Fixed all escape sequences"
