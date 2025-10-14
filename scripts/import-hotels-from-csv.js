#!/usr/bin/env node

/**
 * Import Hotels from CSV
 * Imports comprehensive hotel data from Hotels Full CSV
 * Creates/updates accommodation markdown files with ALL available data
 */

import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import path from 'path';

const CSV_FILE = './Hotels Full - Hotels Full - Data.csv';
const OUTPUT_DIR = './src/content/accommodation';

// Helper to create slug from hotel name
function createSlug(hotelName) {
  return hotelName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to clean and escape YAML strings
function cleanYaml(str) {
  if (!str || str.trim() === '') return '';
  return str.replace(/"/g, '\\"').trim();
}

// Helper to parse price
function parsePrice(priceStr) {
  if (!priceStr) return null;
  const match = priceStr.match(/[\d.]+/);
  return match ? match[0] : null;
}

// Helper to extract arrays from numbered columns
function extractArray(row, prefix, count = 10) {
  const arr = [];
  for (let i = 1; i <= count; i++) {
    const key = `${prefix} ${i}`;
    const value = row[key];
    if (value && value.trim() !== '') {
      arr.push(value.trim());
    }
  }
  return arr;
}

// Map CSV type to our accommodationType
function mapType(type) {
  if (!type) return 'hotel';
  const t = type.toLowerCase();
  if (t.includes('apartment')) return 'apartment';
  if (t.includes('villa')) return 'villa';
  if (t.includes('hostel')) return 'hostel';
  if (t.includes('guest')) return 'guesthouse';
  if (t.includes('resort')) return 'resort';
  return 'hotel';
}

async function importHotels() {
  console.log('🏨 Importing Hotels from CSV...\\n');
  console.log('=' .repeat(60) + '\\n');

  // Read CSV
  const csvContent = await fs.readFile(CSV_FILE, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true
  });

  console.log(`✅ Loaded ${records.length} hotels from CSV\\n`);
  console.log('📝 Processing hotels...\\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const hotel of records) {
    try {
      const hotelName = hotel['Hotel Name'];
      if (!hotelName) {
        skipped++;
        continue;
      }

      const slug = createSlug(hotelName);
      const filePath = path.join(OUTPUT_DIR, `${slug}.md`);

      // Extract all data
      const highlights = extractArray(hotel, 'Highlights');
      const roomTypes = extractArray(hotel, 'Room Type', 9);
      const images = extractArray(hotel, 'Image', 15);
      const nearbyAttractions = extractArray(hotel, 'Top attractions');
      const nearbyRestaurants = extractArray(hotel, 'Restaurants', 3);
      const nearbyBeaches = extractArray(hotel, 'Beaches Nearby', 5);
      const whatsNearby = extractArray(hotel, "What's nearby");
      const airports = extractArray(hotel, 'Closest airports', 3);
      const paymentMethods = extractArray(hotel, 'Payment', 4);

      // Extract reviews
      const reviews = [];
      for (let i = 1; i <= 3; i++) {
        const reviewName = hotel[`Review ${i} Name`];
        const reviewCountry = hotel[`Review ${i} Country`];
        const reviewText = hotel[`Review ${i}`];
        if (reviewName && reviewText) {
          reviews.push({
            name: reviewName,
            country: reviewCountry || 'Unknown',
            text: reviewText
          });
        }
      }

      // Build frontmatter
      const frontmatter = {
        title: hotelName,
        description: hotel['Excerpt'] || hotel['Hotel Intro'] || '',
        featuredImage: images[0] || '',
        language: 'en',
        slug: slug,

        // Basic Info
        address: hotel['Address'] || '',
        city: hotel['City'] || '',
        location: hotel['City'] || '',
        accommodationType: mapType(hotel['Type']),

        // Coordinates
        coordinates: (hotel['Latitude'] && hotel['Longitude']) ? {
          lat: parseFloat(hotel['Latitude']),
          lng: parseFloat(hotel['Longitude'])
        } : null,

        // Pricing
        price: hotel['Price From (Min)'] || '',
        priceFrom: parsePrice(hotel['Price From (Min)']),

        // Ratings
        starRating: parseInt(hotel['Stars']) || 3,
        rating: parseFloat(hotel['Overall Rating']) || null,
        ratingWords: hotel['Rating Words'] || '',
        numberOfReviews: parseInt(hotel['Number Of Reviews']?.replace(/[^0-9]/g, '')) || 0,

        // Detailed Ratings
        ratings: {
          overall: parseFloat(hotel['Overall Rating']) || 0,
          location: parseFloat(hotel['Location Rating']) || 0,
          cleanliness: parseFloat(hotel['Cleanliness Rating']) || 0,
          facilities: parseFloat(hotel['Facilities Rating']) || 0,
          value: parseFloat(hotel['Value Rating']) || 0,
          comfort: parseFloat(hotel['Comfort Rating']) || 0,
          staff: parseFloat(hotel['Staff Rating']) || 0,
          wifi: parseFloat(hotel['WiFi Rating']) || 0
        },

        // Arrays
        images: images,
        amenities: highlights,
        roomTypes: roomTypes,
        nearbyAttractions: nearbyAttractions,
        nearbyRestaurants: nearbyRestaurants,
        nearbyBeaches: nearbyBeaches,
        whatsNearby: whatsNearby,
        airports: airports,
        paymentMethods: paymentMethods,

        // Reviews
        reviews: reviews,

        // Metadata
        bookingURL: hotel['Affiliate URL'] || '',
        bestFor: hotel['Best For'] || '',
        bestCategories: hotel['Best Categories'] || '',
        category: hotel['Best Categories'] || ''
      };

      // Generate YAML frontmatter
      const yamlLines = ['---'];
      yamlLines.push(`title: "${cleanYaml(frontmatter.title)}"`);
      yamlLines.push(`description: "${cleanYaml(frontmatter.description)}"`);
      yamlLines.push(`featuredImage: "${frontmatter.featuredImage}"`);
      yamlLines.push(`language: ${frontmatter.language}`);
      yamlLines.push(`slug: ${frontmatter.slug}`);

      if (frontmatter.address) yamlLines.push(`address: "${cleanYaml(frontmatter.address)}"`);
      if (frontmatter.city) yamlLines.push(`city: "${cleanYaml(frontmatter.city)}"`);
      yamlLines.push(`location: "${cleanYaml(frontmatter.location)}"`);
      yamlLines.push(`accommodationType: "${frontmatter.accommodationType}"`);

      if (frontmatter.coordinates) {
        yamlLines.push(`coordinates:`);
        yamlLines.push(`  lat: ${frontmatter.coordinates.lat}`);
        yamlLines.push(`  lng: ${frontmatter.coordinates.lng}`);
      }

      if (frontmatter.price) yamlLines.push(`price: "${frontmatter.price}"`);
      if (frontmatter.priceFrom) yamlLines.push(`priceFrom: ${frontmatter.priceFrom}`);

      yamlLines.push(`starRating: ${frontmatter.starRating}`);
      if (frontmatter.rating) yamlLines.push(`rating: ${frontmatter.rating}`);
      if (frontmatter.ratingWords) yamlLines.push(`ratingWords: "${cleanYaml(frontmatter.ratingWords)}"`);
      yamlLines.push(`numberOfReviews: ${frontmatter.numberOfReviews}`);

      // Detailed ratings
      yamlLines.push(`ratings:`);
      yamlLines.push(`  overall: ${frontmatter.ratings.overall}`);
      yamlLines.push(`  location: ${frontmatter.ratings.location}`);
      yamlLines.push(`  cleanliness: ${frontmatter.ratings.cleanliness}`);
      yamlLines.push(`  facilities: ${frontmatter.ratings.facilities}`);
      yamlLines.push(`  value: ${frontmatter.ratings.value}`);
      yamlLines.push(`  comfort: ${frontmatter.ratings.comfort}`);
      yamlLines.push(`  staff: ${frontmatter.ratings.staff}`);
      yamlLines.push(`  wifi: ${frontmatter.ratings.wifi}`);

      // Arrays
      if (frontmatter.images.length > 0) {
        yamlLines.push(`images:`);
        frontmatter.images.forEach(img => yamlLines.push(`  - "${img}"`));
      }

      if (frontmatter.amenities.length > 0) {
        yamlLines.push(`amenities:`);
        frontmatter.amenities.forEach(a => yamlLines.push(`  - "${cleanYaml(a)}"`));
      }

      if (frontmatter.roomTypes.length > 0) {
        yamlLines.push(`roomTypes:`);
        frontmatter.roomTypes.forEach(rt => yamlLines.push(`  - "${cleanYaml(rt)}"`));
      }

      if (frontmatter.nearbyAttractions.length > 0) {
        yamlLines.push(`nearbyAttractions:`);
        frontmatter.nearbyAttractions.forEach(a => yamlLines.push(`  - "${cleanYaml(a)}"`));
      }

      if (frontmatter.nearbyRestaurants.length > 0) {
        yamlLines.push(`nearbyRestaurants:`);
        frontmatter.nearbyRestaurants.forEach(r => yamlLines.push(`  - "${cleanYaml(r)}"`));
      }

      if (frontmatter.nearbyBeaches.length > 0) {
        yamlLines.push(`nearbyBeaches:`);
        frontmatter.nearbyBeaches.forEach(b => yamlLines.push(`  - "${cleanYaml(b)}"`));
      }

      if (frontmatter.whatsNearby.length > 0) {
        yamlLines.push(`whatsNearby:`);
        frontmatter.whatsNearby.forEach(w => yamlLines.push(`  - "${cleanYaml(w)}"`));
      }

      if (frontmatter.airports.length > 0) {
        yamlLines.push(`airports:`);
        frontmatter.airports.forEach(a => yamlLines.push(`  - "${cleanYaml(a)}"`));
      }

      if (frontmatter.paymentMethods.length > 0) {
        yamlLines.push(`paymentMethods:`);
        frontmatter.paymentMethods.forEach(p => yamlLines.push(`  - "${p}"`));
      }

      // Reviews
      if (frontmatter.reviews.length > 0) {
        yamlLines.push(`reviews:`);
        frontmatter.reviews.forEach(review => {
          yamlLines.push(`  - name: "${cleanYaml(review.name)}"`);
          yamlLines.push(`    country: "${cleanYaml(review.country)}"`);
          yamlLines.push(`    text: "${cleanYaml(review.text)}"`);
        });
      }

      if (frontmatter.bookingURL) yamlLines.push(`bookingURL: "${frontmatter.bookingURL}"`);
      if (frontmatter.bestFor) yamlLines.push(`bestFor: "${cleanYaml(frontmatter.bestFor)}"`);
      if (frontmatter.bestCategories) yamlLines.push(`bestCategories: "${cleanYaml(frontmatter.bestCategories)}"`);
      if (frontmatter.category) yamlLines.push(`category: "${cleanYaml(frontmatter.category)}"`);

      yamlLines.push('---');
      yamlLines.push('');

      // Content body
      const body = [
        hotel['Hotel Description'] || hotel['Hotel Intro'] || hotel['Excerpt'] || ''
      ].filter(Boolean).join('\\n\\n');

      const fullContent = yamlLines.join('\\n') + '\\n' + body;

      // Check if file exists
      let fileExists = false;
      try {
        await fs.access(filePath);
        fileExists = true;
      } catch (e) {
        // File doesn't exist
      }

      // Write file
      await fs.writeFile(filePath, fullContent, 'utf-8');

      if (fileExists) {
        updated++;
        if (updated % 100 === 0) {
          console.log(`  Updated ${updated} hotels...`);
        }
      } else {
        created++;
        if (created % 100 === 0) {
          console.log(`  Created ${created} hotels...`);
        }
      }

    } catch (error) {
      console.error(`❌ Error processing hotel: ${error.message}`);
      skipped++;
    }
  }

  console.log('\\n' + '='.repeat(60));
  console.log('\\n📊 Import Summary:');
  console.log(`  Total hotels in CSV: ${records.length}`);
  console.log(`  Files created: ${created}`);
  console.log(`  Files updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`\\n✅ Hotel import complete!`);

  console.log('\\n💡 Next steps:');
  console.log('  1. Update content/config.ts with new fields');
  console.log('  2. Update filter components to use new data');
  console.log('  3. Enhance hotel detail pages with reviews, ratings, etc.');
  console.log('  4. Test the site with the new data!');
}

importHotels().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
