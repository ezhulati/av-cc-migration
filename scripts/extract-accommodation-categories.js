#!/usr/bin/env node

/**
 * Extract Accommodation Categories & Metadata from WordPress
 * Pulls taxonomies, infers ratings, and adds filterable metadata
 */

import { GraphQLClient, gql } from 'graphql-request';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'https://albaniavisit.com/graphql';
const client = new GraphQLClient(GRAPHQL_ENDPOINT);

// Query to get all accommodation with categories and terms
const GET_ACCOMMODATIONS_QUERY = gql`
  query GetAccommodationsWithCategories($after: String) {
    allAccommodation(first: 100, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        databaseId
        title
        slug
        categories {
          nodes {
            name
            slug
          }
        }
        tags {
          nodes {
            name
            slug
          }
        }
        content
      }
    }
  }
`;

async function fetchAllAccommodations() {
  console.log('🏨 Fetching accommodation data from WordPress...\n');

  let accommodations = [];
  let hasNextPage = true;
  let after = null;
  let page = 1;

  while (hasNextPage) {
    try {
      console.log(`  Fetching page ${page}...`);

      const data = await client.request(GET_ACCOMMODATIONS_QUERY, { after });

      if (data.allAccommodation && data.allAccommodation.nodes) {
        accommodations = accommodations.concat(data.allAccommodation.nodes);
        hasNextPage = data.allAccommodation.pageInfo.hasNextPage;
        after = data.allAccommodation.pageInfo.endCursor;
        page++;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error(`❌ Error fetching page ${page}:`, error.message);
      hasNextPage = false;
    }
  }

  console.log(`✅ Fetched ${accommodations.length} accommodations\n`);
  return accommodations;
}

function inferStarRating(title, content, categories) {
  // Check for explicit star mentions
  const starPatterns = [
    /5[- ]star/i,
    /five[- ]star/i,
    /\*{5}/,
    /★{5}/,
    /4[- ]star/i,
    /four[- ]star/i,
    /\*{4}/,
    /★{4}/,
    /3[- ]star/i,
    /three[- ]star/i,
    /\*{3}/,
    /★{3}/,
    /2[- ]star/i,
    /two[- ]star/i,
    /\*{2}/,
    /★{2}/
  ];

  const text = `${title || ''} ${content || ''}`.toLowerCase();

  if (starPatterns[0].test(text) || starPatterns[1].test(text) || starPatterns[2].test(text) || starPatterns[3].test(text)) {
    return 5;
  } else if (starPatterns[4].test(text) || starPatterns[5].test(text) || starPatterns[6].test(text) || starPatterns[7].test(text)) {
    return 4;
  } else if (starPatterns[8].test(text) || starPatterns[9].test(text) || starPatterns[10].test(text) || starPatterns[11].test(text)) {
    return 3;
  } else if (starPatterns[12].test(text) || starPatterns[13].test(text) || starPatterns[14].test(text) || starPatterns[15].test(text)) {
    return 2;
  }

  // Infer from keywords
  const luxury = /luxury|premium|boutique|grand|spa|resort/i.test(text);
  const budget = /budget|hostel|guesthouse|cheap|affordable/i.test(text);

  if (luxury) return 4;
  if (budget) return 3;

  // Check categories
  const catNames = categories ? categories.map(c => (c?.name || '').toLowerCase()).join(' ') : '';
  if (/luxury|5-star|premium/.test(catNames)) return 5;
  if (/4-star|boutique/.test(catNames)) return 4;
  if (/3-star|mid-range/.test(catNames)) return 3;
  if (/budget|hostel/.test(catNames)) return 2;

  // Default
  return 3;
}

function inferAccommodationType(title, content, categories) {
  const text = `${title || ''} ${content || ''}`.toLowerCase();

  // Check categories first
  const catNames = categories ? categories.map(c => (c?.name || '').toLowerCase()).join(' ') : '';

  if (/hotel|grand|resort/.test(catNames)) return 'hotel';
  if (/apartment|condo|flat/.test(catNames)) return 'apartment';
  if (/villa|house/.test(catNames)) return 'villa';
  if (/hostel/.test(catNames)) return 'hostel';
  if (/guesthouse|guest house|b&b|bed and breakfast/.test(catNames)) return 'guesthouse';

  // Check title and content
  if (/hotel|grand|resort/i.test(text)) return 'hotel';
  if (/apartment|condo|flat|studio/i.test(text)) return 'apartment';
  if (/villa|house|cottage/i.test(text)) return 'villa';
  if (/hostel/i.test(text)) return 'hostel';
  if (/guesthouse|guest house|b&b|bed and breakfast/i.test(text)) return 'guesthouse';

  return 'hotel'; // Default
}

function extractLocation(title, content, categories) {
  // Common Albanian cities
  const cities = [
    'Tirana', 'Tirane', 'Durrës', 'Durres', 'Vlorë', 'Vlore', 'Sarandë', 'Saranda', 'Shkodër', 'Shkoder',
    'Berat', 'Gjirokastër', 'Gjirokaster', 'Korçë', 'Korce', 'Fier', 'Elbasan', 'Kavajë', 'Kavaje',
    'Pogradec', 'Laç', 'Lac', 'Kukës', 'Kukes', 'Lezhë', 'Lezhe', 'Ksamil', 'Himarë', 'Himare',
    'Dhërmi', 'Dhermi', 'Valbonë', 'Valbona', 'Theth', 'Krujë', 'Kruje', 'Permet', 'Golem'
  ];

  const text = `${title || ''} ${content || ''}`;

  for (const city of cities) {
    const regex = new RegExp(city, 'i');
    if (regex.test(text)) {
      return city;
    }
  }

  // Check categories
  if (categories) {
    for (const cat of categories) {
      if (cat && cat.name) {
        for (const city of cities) {
          if (new RegExp(city, 'i').test(cat.name)) {
            return city;
          }
        }
      }
    }
  }

  return '';
}

function extractAmenities(content) {
  const amenitiesList = [];

  const amenityPatterns = {
    'WiFi': /wifi|wi-fi|internet/i,
    'Air Conditioning': /air conditioning|a\/c|ac(?!\w)/i,
    'Parking': /parking|garage/i,
    'Pool': /pool|swimming/i,
    'Gym': /gym|fitness center/i,
    'Restaurant': /restaurant|dining/i,
    'Bar': /bar|lounge/i,
    'Spa': /spa|wellness/i,
    'Breakfast': /breakfast/i,
    'Kitchen': /kitchen|kitchenette/i,
    'Balcony': /balcony|terrace/i,
    'Sea View': /sea view|ocean view/i,
    'Mountain View': /mountain view/i,
    'Pet Friendly': /pet friendly|pets allowed/i,
    'Room Service': /room service/i,
    'Laundry': /laundry|washing machine/i,
    'TV': /tv|television|flat-screen/i,
    '24-hour Reception': /24-hour reception|24\/7/i
  };

  for (const [amenity, pattern] of Object.entries(amenityPatterns)) {
    if (pattern.test(content)) {
      amenitiesList.push(amenity);
    }
  }

  return amenitiesList;
}

async function updateAccommodationFile(filePath, metadata) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Split frontmatter and body
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      console.log(`⚠️  No frontmatter in ${filePath}`);
      return false;
    }

    const [, frontmatter, body] = frontmatterMatch;
    const lines = frontmatter.split('\n');

    // Remove old category/rating/type/location/amenities lines
    const filteredLines = lines.filter(line =>
      !line.startsWith('category:') &&
      !line.startsWith('rating:') &&
      !line.startsWith('starRating:') &&
      !line.startsWith('accommodationType:') &&
      !line.startsWith('location:') &&
      !line.startsWith('amenities:') &&
      !line.trim().startsWith('- ')
    );

    // Add new metadata
    if (metadata.categories && metadata.categories.length > 0) {
      filteredLines.push(`category: "${metadata.categories[0]}"`);
    }

    if (metadata.starRating) {
      filteredLines.push(`starRating: ${metadata.starRating}`);
      filteredLines.push(`rating: ${metadata.starRating}`);
    }

    if (metadata.accommodationType) {
      filteredLines.push(`accommodationType: "${metadata.accommodationType}"`);
    }

    if (metadata.location) {
      filteredLines.push(`location: "${metadata.location}"`);
    }

    if (metadata.amenities && metadata.amenities.length > 0) {
      filteredLines.push('amenities:');
      metadata.amenities.forEach(amenity => {
        filteredLines.push(`  - "${amenity}"`);
      });
    }

    // Reconstruct file
    const newContent = `---\n${filteredLines.join('\n')}\n---\n${body}`;
    await fs.writeFile(filePath, newContent, 'utf-8');

    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Accommodation Category & Metadata Extraction Tool\n');
  console.log('=' .repeat(60) + '\n');

  const accommodations = await fetchAllAccommodations();

  console.log('📊 Processing accommodation data...\n');

  let updated = 0;
  let skipped = 0;

  for (const accom of accommodations) {
    const categories = accom.categories?.nodes?.map(c => c.name) || [];
    const starRating = inferStarRating(accom.title, accom.content, accom.categories?.nodes || []);
    const accommodationType = inferAccommodationType(accom.title, accom.content, accom.categories?.nodes || []);
    const location = extractLocation(accom.title, accom.content, accom.categories?.nodes || []);
    const amenities = extractAmenities(accom.content);

    const metadata = {
      categories,
      starRating,
      accommodationType,
      location,
      amenities
    };

    const filePath = `./src/content/accommodation/${accom.slug}.md`;

    try {
      await fs.access(filePath);
      const success = await updateAccommodationFile(filePath, metadata);

      if (success) {
        updated++;
        console.log(`✅ ${accom.slug} - ${starRating}⭐ ${accommodationType} in ${location || 'N/A'}`);
      } else {
        skipped++;
      }
    } catch (error) {
      skipped++;
      console.log(`⚠️  ${accom.slug} - File not found locally`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Final Summary:');
  console.log(`  Total accommodations processed: ${accommodations.length}`);
  console.log(`  Files updated: ${updated}`);
  console.log(`  Files skipped: ${skipped}`);
  console.log(`\n✅ Accommodation metadata extraction complete!`);

  console.log('\n💡 Next steps:');
  console.log('  1. Review the updated accommodation files');
  console.log('  2. Create filter components for star ratings and types');
  console.log('  3. Build accommodation listing page with filters');
  console.log('  4. Test the filters on the frontend!');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
