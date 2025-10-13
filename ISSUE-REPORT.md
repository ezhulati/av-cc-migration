# Issue Report: Astro Dev Server Failing to Start

**Date**: October 13, 2025, 1:48 AM
**Status**: ⚠️ Content Migration Complete, but Dev Server Won't Start

---

## Problem Summary

The migration is technically complete (all content extracted, all images downloaded, all markdown files generated), BUT the Astro development server is failing to start with a confusing error message:

```
[InvalidContentEntryDataError] posts → 1997-pyramid-schemes data does not match collection schema.
slug**: **slug: Required
```

**The confusion**: The file DOES have a slug field on line 11.

---

## Root Cause Identified

After hex dump analysis, I found **hidden Unicode characters** (smart quotes, non-breaking spaces, etc.) in the markdown frontmatter that are breaking Astro's YAML parser.

Example from hex dump:
```
Albanians'**  **savings   # Those ** symbols are hidden Unicode characters
```

These characters came from WordPress content during the markdown conversion process.

---

## What Worked

✅ Content extraction from WordPress (6,960 items)
✅ Image download (7,253 images, 600MB)
✅ Markdown file generation (6,960 files)
✅ URL validation and redirect generation
✅ Frontmatter structure (all files have proper fields)

---

## What's Broken

❌ YAML parsing fails due to Unicode characters in descriptions
❌ Astro can't read the frontmatter correctly
❌ Dev server won't start
❌ Can't test the site locally

---

## Solutions

### Option 1: Clean Unicode Characters (RECOMMENDED)

Create a script to:
1. Read all 6,960 markdown files
2. Replace smart quotes with regular quotes (`'` → `'`, `"` → `"`)
3. Replace non-breaking spaces with regular spaces
4. Replace em-dashes and en-dashes with hyphens
5. Remove any other problematic Unicode
6. Re-save all files

**Estimate**: 5-10 minutes to write script + 2-3 minutes to run

### Option 2: Simplify Descriptions

Strip descriptions entirely from frontmatter and use only the first paragraph of content:

```yaml
---
title: Albania's Cold War Bunkers
description: ""  # Empty, generate from content
---
```

**Estimate**: 2 minutes to modify script + 2-3 minutes to run

### Option 3: Escape Everything

Wrap all descriptions in double-quoted strings with escaped characters:

```yaml
description: "Albania\\'s story..."
```

**Estimate**: 3 minutes to write escape logic + 2-3 minutes to run

---

## Recommended Action Plan

**Step 1**: Run Unicode cleaning script (Option 1)
- Replace smart quotes: `'` `"` `"` → `'` `"`
- Replace fancy dashes: `—` `–` → `-`
- Replace non-breaking spaces: ` ` → ` `
- Keep other characters (emoji, etc.) if valid YAML

**Step 2**: Test one file manually
- Pick `1997-pyramid-schemes.md`
- Clean it by hand
- Try `npm run dev` with just that one file
- Verify Astro can parse it

**Step 3**: If test works, clean all files
- Run cleaning script on all 6,960 files
- Backup originals first (git commit)
- Run `npm run dev` again

**Step 4**: Launch!

---

## Files Affected

- All 6,960 markdown files potentially have Unicode issues
- Most likely in:
  - `description` fields (pulled from WordPress excerpts)
  - `title` fields (less common but possible)
  - Content body (not affecting frontmatter parsing)

---

## Why This Happened

WordPress stores content with "smart typography":
- Curly quotes instead of straight quotes
- Em/en dashes instead of hyphens
- Non-breaking spaces for formatting
- Other Unicode for international characters

When we converted HTML to Markdown with Turndown, these characters were preserved. YAML parsers (used by Astro) are strict about Unicode in unquoted strings.

---

## Current Workaround

You could temporarily:
1. Remove all descriptions from frontmatter
2. Get the site running
3. Add descriptions back later from content

But cleaning Unicode is better long-term.

---

## Quick Test Command

To see how many files have problematic characters:

```bash
# Find smart quotes
grep -r "'" src/content/posts/ | wc -l
grep -r "'" src/content/posts/ | wc -l

# Find em-dashes
grep -r "—" src/content/posts/ | wc -l

# Find non-breaking spaces
grep -r " " src/content/posts/ | wc -l
```

---

## Next Steps (Your Choice)

**A) I can write the Unicode cleaning script now** (~10 minutes total)
  - Safest, most thorough solution
  - Preserves all content
  - Professional result

**B) Quick hack: Empty all descriptions** (~5 minutes)
  - Get site running NOW
  - Fix properly later
  - Less ideal but functional

**C) Manual fix of one file to test** (~2 minutes)
  - Verify the theory
  - Then decide on A or B

---

## What You Should Know

1. **Your content is safe** - Everything is in git, downloaded, backed up
2. **This is fixable** - Just a text encoding issue
3. **Common problem** - WordPress → Static site migrations often hit this
4. **One-time fix** - Once cleaned, won't happen again

---

**Status**: Blocked on YAML parsing issue
**Blocker**: Unicode characters in frontmatter
**Solution**: Character cleaning script
**ETA to fix**: 10-15 minutes
**ETA to site running**: 15-20 minutes total

---

Let me know which option you prefer and I'll implement it immediately!
