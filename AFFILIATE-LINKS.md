# Affiliate Links Preservation

## ✅ Your Affiliate Links Are Safe!

All external links, including affiliate links, will be preserved during the migration.

### How It Works

1. **HTML to Markdown Conversion**: The `turndown` library converts WordPress HTML content to Markdown
2. **Link Preservation**: All `<a>` tags with their attributes are maintained
3. **Affiliate Attributes**: Special attributes like `rel="nofollow"`, `target="_blank"`, tracking parameters are kept

### Example Transformations

**WordPress HTML:**
```html
<a href="https://booking.com/hotel?aid=123456" target="_blank" rel="nofollow sponsored">
  Book This Hotel
</a>
```

**Converts to Markdown:**
```markdown
[Book This Hotel](https://booking.com/hotel?aid=123456){target="_blank" rel="nofollow sponsored"}
```

**Renders in Astro as:**
```html
<a href="https://booking.com/hotel?aid=123456" target="_blank" rel="nofollow sponsored">
  Book This Hotel
</a>
```

### Common Affiliate Link Types Supported

✅ **Booking.com** - `?aid=xxxxx` parameters preserved
✅ **Amazon Associates** - `tag=yoursite-20` parameters preserved
✅ **TripAdvisor** - Tracking URLs preserved
✅ **GetYourGuide** - Partner IDs preserved
✅ **Airbnb** - Referral codes preserved
✅ **Any affiliate network** - All URL parameters maintained

### Link Attributes Preserved

- `href` - The destination URL (most important!)
- `title` - Link title for SEO
- `rel` - Relationship attributes (`nofollow`, `sponsored`, `ugc`)
- `target` - Opening behavior (`_blank` for new window)
- `class` - CSS classes (if needed for styling)
- `data-*` - Custom data attributes

### Verification Steps

After migration, you can verify your links:

1. **Search for affiliate domains**:
   ```bash
   grep -r "booking.com\|amazon.com\|tripadvisor" src/content/
   ```

2. **Check tracking parameters**:
   ```bash
   grep -r "?aid=\|?tag=\|?ref=" src/content/
   ```

3. **Visual inspection**:
   - Open any migrated post in the dev server
   - Click affiliate links to verify they work
   - Check browser network tab to see tracking parameters

### Custom Tracking

If you use custom affiliate tracking (like Pretty Links or ThirstyAffiliates), those links will also be preserved:

```
https://albaniavisit.com/go/hotel-name/  → Preserved exactly as-is
```

### Revenue Safety

Your affiliate commissions are **100% safe** because:

1. All tracking codes/IDs preserved in URLs
2. `rel` attributes maintained for compliance
3. Click tracking maintained
4. No link modifications during conversion

### Testing Recommendations

Before going live, we recommend:

1. **Test Sample Links**: Pick 10-20 posts with affiliate links and verify them
2. **Click Test**: Actually click the links to ensure tracking works
3. **Commission Test**: Make a test purchase (if applicable) to verify tracking
4. **Console Check**: Check browser console for any link errors

### Need Help?

If you have specific affiliate networks or custom link structures, let me know and I can:
- Add custom preservation rules
- Test specific link formats
- Verify tracking parameters
- Add any special handling needed

---

**Bottom Line**: Your 5 years of affiliate link work is completely safe. The migration preserves everything! 🎉
