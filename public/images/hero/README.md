# Hero Slider Images

This folder contains images for the homepage hero slider. The slider automatically detects and displays all images in this directory.

## How It Works

The hero slider dynamically loads all image files from this folder at build time. Simply add, remove, or replace images here and the slider will automatically update.

## Supported Formats

- `.jpg` / `.jpeg`
- `.png`
- `.webp`
- `.gif`

## Usage

### Adding Images
1. Drop new image files into this folder
2. Rebuild/refresh the site
3. Images appear in the slider automatically (sorted alphabetically)

### Removing Images
1. Delete image files from this folder
2. Rebuild/refresh the site
3. Slider adjusts to remaining images

### Best Practices

**Image Dimensions:**
- Recommended: 1920x1080px or higher
- Aspect ratio: 16:9 for best results
- Format: JPEG for photos, WebP for optimized web delivery

**File Size:**
- Target: < 500KB per image
- Optimize images before uploading for faster load times
- Use tools like ImageOptim, TinyPNG, or Squoosh

**File Naming:**
- Use descriptive names: `tirana-skyline.jpg`, `albanian-riviera.jpg`
- Avoid special characters and spaces
- Files are sorted alphabetically (a-z)

## Current Images

Currently loading 8 images:
1. Korce_AdobeStock_1636975460.jpeg
2. VisitAlbania.jpeg
3. berat-castle.jpg
4. butrint.jpg
5. jale-beach.jpg
6. ksamil-1-scaled.jpeg
7. tirana-opera.jpg
8. vjosa-river.jpg

## Ken Burns Effect

Each slide automatically gets one of 7 Ken Burns animation variants that cycle through:
1. Center zoom
2. Top-right pan + zoom
3. Bottom-left pan + zoom
4. Left pan + zoom
5. Top-left pan + zoom
6. Right pan + zoom
7. Bottom-right pan + zoom

The animations cycle based on image position (1st = center, 2nd = top-right, 8th = center again, etc.)

## Technical Details

- Images load from: `/public/images/hero/`
- Displayed at: Homepage hero slider
- Animation: 6.5s Ken Burns effect per slide
- Transition: 5s interval with 1s crossfade
- Accessibility: Respects `prefers-reduced-motion`
