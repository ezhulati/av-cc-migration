/**
 * Custom Post Types Extraction Script
 * Extracts destinations, activities, and attractions from WordPress REST API
 * Falls back to REST API since these types aren't exposed in WPGraphQL
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const WORDPRESS_URL = process.env.WORDPRESS_URL || 'https://albaniavisit.com';
const REST_API_BASE = `${WORDPRESS_URL}/wp-json/wp/v2`;
const DATA_DIR = './data';

/**
 * Fetch all items from a WordPress REST API endpoint with pagination
 */
async function fetchAllFromRestAPI(endpoint, postType) {
  console.log(`📦 Fetching ${postType}...`);

  let allItems = [];
  let page = 1;
  let hasMore = true;
  const perPage = 100;

  try {
    while (hasMore) {
      const url = `${REST_API_BASE}/${endpoint}?per_page=${perPage}&page=${page}&_embed`;

      const response = await axios.get(url, {
        validateStatus: (status) => status === 200 || status === 400,
      });

      if (response.status === 400) {
        // No more pages
        hasMore = false;
        break;
      }

      const items = response.data;

      if (!items || items.length === 0) {
        hasMore = false;
        break;
      }

      // Transform WordPress REST API data to match our schema
      const transformedItems = items.map(item => ({
        id: item.id,
        title: item.title?.rendered || item.title,
        slug: item.slug,
        date: item.date,
        modified: item.modified,
        content: item.content?.rendered || item.content,
        excerpt: item.excerpt?.rendered || item.excerpt,
        link: item.link,
        status: item.status,
        featuredImage: item._embedded?.['wp:featuredmedia']?.[0] ? {
          sourceUrl: item._embedded['wp:featuredmedia'][0].source_url,
          altText: item._embedded['wp:featuredmedia'][0].alt_text,
          mediaDetails: {
            width: item._embedded['wp:featuredmedia'][0].media_details?.width,
            height: item._embedded['wp:featuredmedia'][0].media_details?.height,
          }
        } : null,
        categories: item._embedded?.['wp:term']?.[0]?.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        })) || [],
        tags: item._embedded?.['wp:term']?.[1]?.map(tag => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        })) || [],
        author: item._embedded?.author?.[0] ? {
          id: item._embedded.author[0].id,
          name: item._embedded.author[0].name,
          slug: item._embedded.author[0].slug,
        } : null,
        // Detect language from URL
        language: {
          code: item.link?.includes('/sq/') ? 'sq' : 'en',
          locale: item.link?.includes('/sq/') ? 'sq_AL' : 'en_US',
        },
        // Custom fields if available
        acf: item.acf || null,
        meta: item.meta || {},
      }));

      allItems = [...allItems, ...transformedItems];
      console.log(`   Fetched ${allItems.length} ${postType}...`);

      // Check if there are more pages
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10);
      if (page >= totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    }

    console.log(`✅ Successfully fetched ${allItems.length} ${postType}`);
    return allItems;

  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`❌ Endpoint "${endpoint}" not found (404)`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Connection refused. Is the WordPress site accessible?`);
    } else {
      console.error(`❌ Error fetching ${postType}:`, error.message);
    }
    return [];
  }
}

/**
 * Fetch destinations
 */
async function fetchDestinations() {
  return await fetchAllFromRestAPI('destinations', 'destinations');
}

/**
 * Fetch activities
 */
async function fetchActivities() {
  return await fetchAllFromRestAPI('activities', 'activities');
}

/**
 * Fetch attractions
 */
async function fetchAttractions() {
  return await fetchAllFromRestAPI('attractions', 'attractions');
}

/**
 * Save data to JSON file
 */
async function saveToJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 Saved ${filepath}`);
}

/**
 * Generate detailed statistics
 */
function generateStatistics(destinations, activities, attractions) {
  const stats = {
    timestamp: new Date().toISOString(),
    destinations: {
      total: destinations.length,
      withFeaturedImage: destinations.filter(d => d.featuredImage?.sourceUrl).length,
      languages: {
        en: destinations.filter(d => d.language.code === 'en').length,
        sq: destinations.filter(d => d.language.code === 'sq').length,
      },
      byCategory: {},
      byStatus: {},
    },
    activities: {
      total: activities.length,
      withFeaturedImage: activities.filter(a => a.featuredImage?.sourceUrl).length,
      languages: {
        en: activities.filter(a => a.language.code === 'en').length,
        sq: activities.filter(a => a.language.code === 'sq').length,
      },
      byCategory: {},
      byStatus: {},
    },
    attractions: {
      total: attractions.length,
      withFeaturedImage: attractions.filter(a => a.featuredImage?.sourceUrl).length,
      languages: {
        en: attractions.filter(a => a.language.code === 'en').length,
        sq: attractions.filter(a => a.language.code === 'sq').length,
      },
      byCategory: {},
      byStatus: {},
    },
  };

  // Count categories and statuses
  [
    { data: destinations, key: 'destinations' },
    { data: activities, key: 'activities' },
    { data: attractions, key: 'attractions' },
  ].forEach(({ data, key }) => {
    data.forEach(item => {
      // Count by status
      const status = item.status || 'unknown';
      stats[key].byStatus[status] = (stats[key].byStatus[status] || 0) + 1;

      // Count by category
      if (item.categories && item.categories.length > 0) {
        item.categories.forEach(cat => {
          const catName = cat.name || 'Uncategorized';
          stats[key].byCategory[catName] = (stats[key].byCategory[catName] || 0) + 1;
        });
      } else {
        stats[key].byCategory['Uncategorized'] = (stats[key].byCategory['Uncategorized'] || 0) + 1;
      }
    });
  });

  return stats;
}

/**
 * Display sample items for verification
 */
function displaySamples(destinations, activities, attractions) {
  console.log('\n📋 Sample Items (for verification):');
  console.log('═══════════════════════════════════════\n');

  if (destinations.length > 0) {
    const sample = destinations[0];
    console.log('🏔️  Sample Destination:');
    console.log(`   Title: ${sample.title}`);
    console.log(`   Slug: ${sample.slug}`);
    console.log(`   URL: ${sample.link}`);
    console.log(`   Language: ${sample.language.code}`);
    console.log(`   Categories: ${sample.categories.map(c => c.name).join(', ') || 'None'}`);
    console.log(`   Featured Image: ${sample.featuredImage ? 'Yes' : 'No'}`);
    console.log('');
  }

  if (activities.length > 0) {
    const sample = activities[0];
    console.log('🎯 Sample Activity:');
    console.log(`   Title: ${sample.title}`);
    console.log(`   Slug: ${sample.slug}`);
    console.log(`   URL: ${sample.link}`);
    console.log(`   Language: ${sample.language.code}`);
    console.log(`   Categories: ${sample.categories.map(c => c.name).join(', ') || 'None'}`);
    console.log(`   Featured Image: ${sample.featuredImage ? 'Yes' : 'No'}`);
    console.log('');
  }

  if (attractions.length > 0) {
    const sample = attractions[0];
    console.log('🏛️  Sample Attraction:');
    console.log(`   Title: ${sample.title}`);
    console.log(`   Slug: ${sample.slug}`);
    console.log(`   URL: ${sample.link}`);
    console.log(`   Language: ${sample.language.code}`);
    console.log(`   Categories: ${sample.categories.map(c => c.name).join(', ') || 'None'}`);
    console.log(`   Featured Image: ${sample.featuredImage ? 'Yes' : 'No'}`);
    console.log('');
  }
}

/**
 * Main extraction function
 */
async function extract() {
  console.log('🚀 Starting Custom Post Types Extraction...\n');
  console.log('WordPress URL:', WORDPRESS_URL);
  console.log('REST API Base:', REST_API_BASE);
  console.log('');

  // Ensure data directory exists
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  // Extract each content type
  console.log('📦 Extracting content via WordPress REST API...\n');

  const destinations = await fetchDestinations();
  console.log('');

  const activities = await fetchActivities();
  console.log('');

  const attractions = await fetchAttractions();
  console.log('');

  // Check if we got any data
  const totalItems = destinations.length + activities.length + attractions.length;

  if (totalItems === 0) {
    console.log('⚠️  WARNING: No data was extracted!');
    console.log('   Please check:');
    console.log('   1. Is the WordPress site accessible?');
    console.log('   2. Are the REST API endpoints enabled?');
    console.log('   3. Are these custom post types public?');
    return;
  }

  // Save individual JSON files
  console.log('💾 Saving data to JSON files...\n');
  await saveToJSON('destinations.json', destinations);
  await saveToJSON('activities.json', activities);
  await saveToJSON('attractions.json', attractions);

  // Generate statistics
  const stats = generateStatistics(destinations, activities, attractions);
  await saveToJSON('custom-post-types-stats.json', stats);

  // Display sample items
  displaySamples(destinations, activities, attractions);

  // Display summary
  console.log('📊 Extraction Summary:');
  console.log('═══════════════════════════════════════');
  console.log('\n🏔️  DESTINATIONS:');
  console.log(`   Total: ${stats.destinations.total}`);
  console.log(`   With Featured Image: ${stats.destinations.withFeaturedImage}`);
  console.log(`   English: ${stats.destinations.languages.en}`);
  console.log(`   Albanian: ${stats.destinations.languages.sq}`);
  console.log('   Status:');
  Object.entries(stats.destinations.byStatus).forEach(([status, count]) => {
    console.log(`      - ${status}: ${count}`);
  });
  if (Object.keys(stats.destinations.byCategory).length > 0) {
    console.log('   Top Categories:');
    const topCats = Object.entries(stats.destinations.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    topCats.forEach(([cat, count]) => {
      console.log(`      - ${cat}: ${count}`);
    });
  }

  console.log('\n🎯 ACTIVITIES:');
  console.log(`   Total: ${stats.activities.total}`);
  console.log(`   With Featured Image: ${stats.activities.withFeaturedImage}`);
  console.log(`   English: ${stats.activities.languages.en}`);
  console.log(`   Albanian: ${stats.activities.languages.sq}`);
  console.log('   Status:');
  Object.entries(stats.activities.byStatus).forEach(([status, count]) => {
    console.log(`      - ${status}: ${count}`);
  });
  if (Object.keys(stats.activities.byCategory).length > 0) {
    console.log('   Top Categories:');
    const topCats = Object.entries(stats.activities.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    topCats.forEach(([cat, count]) => {
      console.log(`      - ${cat}: ${count}`);
    });
  }

  console.log('\n🏛️  ATTRACTIONS:');
  console.log(`   Total: ${stats.attractions.total}`);
  console.log(`   With Featured Image: ${stats.attractions.withFeaturedImage}`);
  console.log(`   English: ${stats.attractions.languages.en}`);
  console.log(`   Albanian: ${stats.attractions.languages.sq}`);
  console.log('   Status:');
  Object.entries(stats.attractions.byStatus).forEach(([status, count]) => {
    console.log(`      - ${status}: ${count}`);
  });
  if (Object.keys(stats.attractions.byCategory).length > 0) {
    console.log('   Top Categories:');
    const topCats = Object.entries(stats.attractions.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    topCats.forEach(([cat, count]) => {
      console.log(`      - ${cat}: ${count}`);
    });
  }

  console.log('\n═══════════════════════════════════════');
  console.log('✅ Extraction complete!');
  console.log('\n📁 Files created:');
  console.log('   - data/destinations.json');
  console.log('   - data/activities.json');
  console.log('   - data/attractions.json');
  console.log('   - data/custom-post-types-stats.json');
}

// Run extraction
extract().catch(error => {
  console.error('❌ Extraction failed:', error);
  console.error('Error details:', error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});
