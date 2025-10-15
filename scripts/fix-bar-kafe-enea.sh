#!/bin/bash

echo "Fixing Bar Kafe Enea escape sequences..."

cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"

# Find all files with the problematic pattern and fix them
find src/content/accommodation -name "*.md" -type f -exec sed -i '' 's/Bar Kafe \\Enea\\\\"\\"/Bar Kafe Enea/g' {} \;

echo "✅ Fixed all Bar Kafe Enea escape sequences"
