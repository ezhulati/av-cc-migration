#!/bin/bash
cd "/Users/ez/Desktop/AI Library/Apps/AV-CC"
count=0
for file in src/content/accommodation/*.md; do
    if ! grep -q "^slug:" "$file" 2>/dev/null; then
        echo "$file"
        count=$((count + 1))
        if [ $count -ge 20 ]; then
            break
        fi
    fi
done
if [ $count -eq 0 ]; then
    echo "All files have slug field"
fi
