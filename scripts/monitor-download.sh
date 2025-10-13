#!/bin/bash
# Monitor image download progress

echo "📊 Image Download Monitor"
echo "========================="
echo ""

while true; do
    clear
    echo "📊 Image Download Progress Monitor"
    echo "===================================="
    echo ""
    echo "⏰ Time: $(date '+%H:%M:%S')"
    echo ""

    # Count images
    total=$(find public/images -type f 2>/dev/null | wc -l | tr -d ' ')
    posts=$(find public/images/posts -type f 2>/dev/null | wc -l | tr -d ' ')
    pages=$(find public/images/pages -type f 2>/dev/null | wc -l | tr -d ' ')
    accommodation=$(find public/images/accommodation -type f 2>/dev/null | wc -l | tr -d ' ')

    # Size
    size=$(du -sh public/images 2>/dev/null | cut -f1)

    echo "📈 Statistics:"
    echo "  Total Images: $total"
    echo "  Posts: $posts"
    echo "  Pages: $pages"
    echo "  Accommodation: $accommodation"
    echo "  Total Size: $size"
    echo ""

    # Latest log entries
    echo "📋 Recent Progress:"
    tail -10 /tmp/complete-image-download.log | grep -E "(Processing|complete|Processed)" | tail -5
    echo ""

    # Check if still running
    if ps aux | grep -q "[d]ownload-all-images.js"; then
        echo "✅ Download is running..."
    else
        echo "⚠️  Download process not found!"
        echo ""
        echo "🎉 Download may be complete!"
        break
    fi

    sleep 10
done

echo ""
echo "===================================="
echo "Monitor stopped. Check full log:"
echo "  tail -f /tmp/complete-image-download.log"
