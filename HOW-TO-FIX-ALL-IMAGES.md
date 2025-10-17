# How to Fix ALL Image Problems - Quick Reference

**Your complete step-by-step guide to fixing all 346 broken images**

---

## 🎯 Current Status

- ✅ **1,378 images working** (80%)
- ❌ **346 images broken** (20%)
- 🔍 **6,436 orphaned images** (83%)

**Goal:** Get to 95%+ working images (1,650+)

---

## ⚡ Quick Start: 3-Step Auto-Fix (Fixes 60-100 images)

### Step 1: Master Auto-Fix Script
```bash
# See what would be fixed
node scripts/fix-all-images.js

# Apply all automated fixes
node scripts/fix-all-images.js --apply
```
**Fixes:** Extension mismatches, case issues, exact orphan matches
**Time:** 2 minutes
**Result:** ~60-80 images fixed

### Step 2: Interactive Manual Review
```bash
# Review potential matches one-by-one
node scripts/apply-manual-matches.js --interactive

# Or auto-apply high-confidence only
node scripts/apply-manual-matches.js --batch
```
**Fixes:** 234 potential orphan matches
**Time:** 30-60 minutes
**Result:** ~50-100 additional images fixed

### Step 3: Find Additional Orphan Matches
```bash
# Fuzzy match broken refs to orphaned images
node scripts/find-orphan-matches.js

# Apply the generated matches
./scripts/apply-orphan-matches.sh
```
**Fixes:** Additional similar-name matches
**Time:** 5 minutes
**Result:** ~20-40 more images fixed

### ✅ After Steps 1-3: Check Progress
```bash
node scripts/qc-broken-images.js
```

**Expected Result:** ~1,500-1,550 images working (87-90%)
**Remaining:** ~170-200 broken images

---

## 🔧 Manual Fixes for Remaining ~170-200 Images

After automation, you'll have specific categories of remaining issues:

### Category 1: Google Hash Filenames (~30 images)
**Problem:** `AATXAJyURccqUA7sgVAGXqgOlD9xWjA5R6UfHWn1Z1Us96c64`

**3 Solutions:**

**A. Source from Booking Platforms (Recommended)**
```bash
# 1. Open the accommodation content file
# 2. Get property name from title
# 3. Search on Booking.com/Airbnb
# 4. Download main image
# 5. Save as: {property-name}-main.jpg
# 6. Update frontmatter
```

**B. Source from Google Photos**
```bash
# If content has Google Maps/Photos URL
# 1. Extract original URL from content
# 2. Download from Google
# 3. Rename appropriately
```

**C. Use Generic Placeholder**
```bash
# Last resort
cp public/images/accommodation/generic-hotel.jpg \
   public/images/accommodation/{property-name}.jpg
```

**Files to fix:** See `data/remaining-image-issues.json` → `googleHashes`

---

### Category 2: Generic Placeholder Names (~40 images)
**Problem:** `picture276.jpeg`, `photojpg645.jpeg`

**Solution Strategy:**

```bash
# 1. Check the content context
cat src/content/accommodation/aris-apartment.md
# Look for clues about what the image should be

# 2. Check orphaned images by date
ls -lt public/images/accommodation/ | grep "picture"

# 3. Match by content context + date
# Example: "aris-apartment" needs picture276.jpeg
# Find orphaned image from similar date

# 4. Rename or copy
cp public/images/accommodation/527159887.jpg \
   public/images/accommodation/aris-apartment-main.jpg

# 5. Update content file to use new name
```

**Helper command:**
```bash
# List all generic names
cat data/remaining-image-issues.json | \
  jq -r '.genericNames[].imagePath' | sort
```

---

### Category 3: Missing Attraction Images (~120 images)
**Problem:** `albanianriviera.jpg`, `beratcastle.jpg`

**Solution A: Use Orphaned Images (BEST)**

Many orphaned images are actually these files with different names!

```bash
# Run the fuzzy matcher
node scripts/find-orphan-matches.js

# Review results in data/orphan-matches.json
# Apply high-confidence matches
./scripts/apply-orphan-matches.sh
```

**Solution B: Download from Wikimedia Commons**
```bash
# For landmarks/attractions:
# 1. Go to: https://commons.wikimedia.org
# 2. Search: "Albania [landmark name]"
# 3. Download high-quality image (CC-licensed)
# 4. Save as: {attraction-name}.jpg
# 5. Add attribution in frontmatter
```

**Solution C: Use Your Own Photos**
```bash
# If you have photos from WordPress backup
# Extract and rename to match references
```

---

### Category 4: Missing Activity Images (~10 images)
**Problem:** `cyclealbania.jpg`, `mountainbiking.jpg`

**Solution: Free Stock Photos**

```bash
# Download from Pexels or Unsplash
# Search terms:
# - "Albania cycling"
# - "Albania mountain biking"
# - "Albania outdoor adventure"

# Save with correct names:
cd public/images/activities
# Download as:
# - cyclealbania.jpg
# - mountainbiking.jpg
# - etc.

# Add attribution in content frontmatter
```

**Sources:**
- Pexels: https://www.pexels.com/search/albania/
- Unsplash: https://unsplash.com/s/photos/albania

---

## 📋 Complete Workflow

### Day 1: Automated Fixes (2 hours)

```bash
# 1. Run master fix script
node scripts/fix-all-images.js --apply

# 2. Interactive manual review
node scripts/apply-manual-matches.js --interactive

# 3. Find orphan matches
node scripts/find-orphan-matches.js
./scripts/apply-orphan-matches.sh

# 4. Check progress
node scripts/qc-broken-images.js
```

**Expected:** 60-70% of issues resolved (100-150 images fixed)

---

### Day 2: Source Missing Images (3-4 hours)

**Google Hashes (30 files):**
```bash
# Work through each file in:
cat data/remaining-image-issues.json | jq -r '.googleHashes[]'

# For each:
# 1. Open content file
# 2. Source from booking platform
# 3. Download and rename
# 4. Update content
```

**Generic Names (40 files):**
```bash
# Work through each file in:
cat data/remaining-image-issues.json | jq -r '.genericNames[]'

# For each:
# 1. Check content context
# 2. Match with orphaned by date/context
# 3. Rename or update reference
```

**Expected:** 70 images fixed

---

### Day 3: Attractions & Activities (4 hours)

**Attractions (120 files):**
```bash
# Option A: Match remaining orphans
# Review data/orphan-matches.json for medium-confidence matches

# Option B: Wikimedia Commons
# Download public domain images for landmarks

# Option C: WordPress backup
# If available, extract missing images
```

**Activities (10 files):**
```bash
# Download from Pexels/Unsplash
# Quick task - should take 30 mins
```

**Expected:** 100-130 images fixed

---

### Day 4: Cleanup (2 hours)

```bash
# 1. Final QC
node scripts/qc-broken-images.js

# 2. Archive orphaned images
node scripts/archive-orphaned-images.js
node scripts/archive-orphaned-images.js --apply

# 3. Document remaining issues
# Create placeholders for truly missing images

# 4. Update guidelines
```

**Expected:** 95-100% images working

---

## 🗂️ All Scripts Reference

### Analysis Scripts
```bash
# Full image QC
node scripts/qc-broken-images.js

# Find orphan matches
node scripts/find-orphan-matches.js
```

### Fix Scripts
```bash
# Master auto-fix
node scripts/fix-all-images.js [--apply]

# Manual review
node scripts/apply-manual-matches.js --interactive
node scripts/apply-manual-matches.js --batch

# Apply orphan matches
./scripts/apply-orphan-matches.sh
```

### Cleanup Scripts
```bash
# Archive orphaned images
node scripts/archive-orphaned-images.js [--apply]

# Restore if needed
./scripts/restore-archived-images.sh
```

---

## 📊 Progress Tracking Template

Copy this to track your progress:

```markdown
## Image Fix Progress

### Automated Fixes
- [x] Run fix-all-images.js
- [x] Run apply-manual-matches.js
- [x] Run find-orphan-matches.js
- [x] Verify progress (QC)
- Current: ___ / 1,724 working (__%)

### Google Hash Filenames (30 total)
- [ ] List all files
- [ ] 0/30 sourced from booking platforms
- [ ] 0/30 content updated
- [ ] Verify

### Generic Placeholder Names (40 total)
- [ ] List all files
- [ ] 0/40 matched with orphans
- [ ] 0/40 renamed/updated
- [ ] Verify

### Missing Attractions (120 total)
- [ ] 0/120 matched from orphans
- [ ] 0/120 downloaded from Wikimedia
- [ ] 0/120 from WordPress backup
- [ ] Verify

### Missing Activities (10 total)
- [ ] 0/10 downloaded from Pexels/Unsplash
- [ ] Attribution added
- [ ] Verify

### Final
- [ ] Archive orphaned images
- [ ] Final QC: ___ / 1,724 working
- [ ] Success: ___% (target: 95%+)
```

---

## ✅ Success Criteria

**Minimum Acceptable:**
- 95%+ images working (1,650+ / 1,724)
- All critical pages have images
- Broken images documented with placeholders

**Ideal Target:**
- 98%+ images working (1,690+ / 1,724)
- <35 broken images
- All placeholders properly documented
- Orphaned images archived

---

## 🆘 Troubleshooting

### Problem: Script errors
```bash
# Ensure you're in project root
cd /Users/ez/Desktop/AI\ Library/Apps/AV-CC

# Ensure QC report exists
node scripts/qc-broken-images.js
```

### Problem: Can't find orphaned images
```bash
# Re-run QC to regenerate report
node scripts/qc-broken-images.js

# Check report exists
ls -lh data/image-qc-report.json
```

### Problem: Too many manual reviews
```bash
# Use batch mode for high-confidence only
node scripts/apply-manual-matches.js --batch

# Then run orphan matcher for more
node scripts/find-orphan-matches.js
./scripts/apply-orphan-matches.sh
```

---

## 📈 Expected Results

### After Automated Fixes (Steps 1-3)
- **Working:** ~1,500-1,550 (87-90%)
- **Broken:** ~170-200
- **Time:** ~1-2 hours

### After Manual Fixes (Day 2-3)
- **Working:** ~1,650-1,690 (95-98%)
- **Broken:** <70
- **Time:** ~10-15 hours total

### Final State
- **Working:** 1,650+ (95%+)
- **Documented placeholders:** <70
- **Archived orphans:** ~6,000
- **Freed space:** ~2-5 GB

---

## 🎯 Quick Win Commands

**Just want to fix as many as possible quickly?**

```bash
# Run all automated fixes (5 minutes)
node scripts/fix-all-images.js --apply
node scripts/apply-manual-matches.js --batch
node scripts/find-orphan-matches.js
./scripts/apply-orphan-matches.sh

# Check results
node scripts/qc-broken-images.js

# You should now have 87-90% working!
```

---

## 📚 Related Documentation

- **IMAGE-QC-REPORT.md** - Full analysis results
- **COMPLETE-IMAGE-SOLUTION.md** - Detailed solution guide
- **data/image-qc-report.json** - Machine-readable QC data
- **data/manual-review-images.csv** - Manual review queue
- **data/remaining-image-issues.json** - Categorized remaining issues

---

## 💡 Pro Tips

1. **Always run in dry-run mode first** to preview changes
2. **Commit after each major fix** so you can rollback
3. **Use git status** to see untracked orphaned images
4. **Check file sizes** before applying matches (avoid tiny thumbnails)
5. **Document sources** for any externally sourced images
6. **Take screenshots** of original issues for reference

---

**Ready to start? Run:**

```bash
node scripts/fix-all-images.js --apply
```

🎉 Good luck!
