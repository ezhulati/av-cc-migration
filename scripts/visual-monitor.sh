#!/bin/bash
# Visual progress monitor with real-time graph

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Estimated totals
ESTIMATED_TOTAL=28000
POSTS_TOTAL=745
PAGES_TOTAL=105
ACCOMMODATION_TOTAL=27150

# Function to draw progress bar
draw_progress_bar() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))

    printf "["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] ${percentage}%%"
}

# Function to format numbers with commas
format_number() {
    printf "%'d" $1 2>/dev/null || echo $1
}

while true; do
    clear

    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║        🚀 ALBANIAVISIT.COM IMAGE DOWNLOAD MONITOR 🚀              ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Get current timestamp
    echo -e "${YELLOW}⏰ Time: $(date '+%H:%M:%S')${NC}"
    echo ""

    # Count images
    total=$(find public/images -type f 2>/dev/null | wc -l | tr -d ' ')
    posts=$(find public/images/posts -type f 2>/dev/null | wc -l | tr -d ' ')
    pages=$(find public/images/pages -type f 2>/dev/null | wc -l | tr -d ' ')
    accommodation=$(find public/images/accommodation -type f 2>/dev/null | wc -l | tr -d ' ')

    # Get size
    size=$(du -sh public/images 2>/dev/null | cut -f1)

    # Calculate rates
    if [ -f /tmp/download_start_time ]; then
        start_time=$(cat /tmp/download_start_time)
    else
        date +%s > /tmp/download_start_time
        start_time=$(cat /tmp/download_start_time)
    fi

    current_time=$(date +%s)
    elapsed=$((current_time - start_time))

    if [ $elapsed -gt 0 ]; then
        rate=$((total / elapsed))
        remaining=$((ESTIMATED_TOTAL - total))
        eta_seconds=$((remaining / rate))
        eta_minutes=$((eta_seconds / 60))
    else
        rate=0
        eta_minutes=0
    fi

    # Overall progress
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  OVERALL PROGRESS${NC}"
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  Total Images: ${BOLD}${GREEN}$(format_number $total)${NC} / $(format_number $ESTIMATED_TOTAL)"
    echo -e "  $(draw_progress_bar $total $ESTIMATED_TOTAL)"
    echo ""
    echo -e "  Total Size: ${BOLD}${CYAN}$size${NC}"
    echo -e "  Download Rate: ${BOLD}${YELLOW}$rate images/sec${NC}"
    echo -e "  ETA: ${BOLD}${YELLOW}~$eta_minutes minutes${NC}"
    echo ""

    # Posts progress
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  CONTENT TYPE BREAKDOWN${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Posts
    echo -e "  📝 ${BOLD}Posts:${NC} $(format_number $posts) / $(format_number $POSTS_TOTAL)"
    echo -e "  $(draw_progress_bar $posts $POSTS_TOTAL)"
    if [ $posts -ge $POSTS_TOTAL ]; then
        echo -e "  ${GREEN}✓ Complete${NC}"
    fi
    echo ""

    # Pages
    echo -e "  📄 ${BOLD}Pages:${NC} $(format_number $pages) / $(format_number $PAGES_TOTAL)"
    echo -e "  $(draw_progress_bar $pages $PAGES_TOTAL)"
    if [ $pages -ge $PAGES_TOTAL ]; then
        echo -e "  ${GREEN}✓ Complete${NC}"
    fi
    echo ""

    # Accommodation
    echo -e "  🏨 ${BOLD}Accommodation:${NC} $(format_number $accommodation) / $(format_number $ACCOMMODATION_TOTAL)"
    echo -e "  $(draw_progress_bar $accommodation $ACCOMMODATION_TOTAL)"
    if [ $accommodation -ge $ACCOMMODATION_TOTAL ]; then
        echo -e "  ${GREEN}✓ Complete${NC}"
    else
        echo -e "  ${YELLOW}⏳ In Progress...${NC}"
    fi
    echo ""

    # Latest log activity
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  RECENT ACTIVITY${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    tail -3 /tmp/complete-image-download.log 2>/dev/null | grep "Processed" | tail -1
    echo ""

    # Status check
    if ps aux | grep -q "[d]ownload-all-images.js"; then
        echo -e "  ${GREEN}✅ Download process is running...${NC}"
    else
        echo -e "  ${RED}⚠️  Download process not found!${NC}"
        echo ""
        echo -e "  ${BOLD}${GREEN}🎉 Download may be complete!${NC}"
        echo ""
        break
    fi

    echo ""
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  Press ${BOLD}Ctrl+C${NC} to stop monitoring"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    sleep 3
done

echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║                    DOWNLOAD COMPLETE! 🎉                           ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Final Statistics:"
echo -e "  Total Images: ${BOLD}$(format_number $total)${NC}"
echo -e "  Total Size: ${BOLD}$size${NC}"
echo ""
echo -e "Check full log: ${CYAN}tail -f /tmp/complete-image-download.log${NC}"
echo ""
