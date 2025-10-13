/**
 * Content Migration Script
 * Extracts all content from WordPress via WPGraphQL
 */

import { GraphQLClient, gql } from 'graphql-request';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'https://albaniavisit.com/graphql';
const DATA_DIR = './data';

// Initialize GraphQL client
const client = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {},
});

/**
 * Query all posts with pagination
 */
async function fetchAllPosts() {
  console.log('📝 Fetching all posts...');

  const query = gql`
    query GetAllPosts($after: String) {
      posts(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          slug
          date
          modified
          content
          excerpt
          link
          featuredImage {
            node {
              sourceUrl
              altText
              mediaDetails {
                width
                height
              }
            }
          }
          author {
            node {
              name
              slug
            }
          }
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
        }
      }
    }
  `;

  let allPosts = [];
  let hasNextPage = true;
  let after = null;

  try {
    while (hasNextPage) {
      const data = await client.request(query, { after });
      allPosts = [...allPosts, ...data.posts.nodes];
      hasNextPage = data.posts.pageInfo.hasNextPage;
      after = data.posts.pageInfo.endCursor;

      console.log(`  Fetched ${allPosts.length} posts...`);
    }

    console.log(`✅ Successfully fetched ${allPosts.length} posts`);
    return allPosts;
  } catch (error) {
    console.error('❌ Error fetching posts:', error.message);
    if (error.response) {
      console.error('Response:', error.response.errors);
    }
    return [];
  }
}

/**
 * Query all pages
 */
async function fetchAllPages() {
  console.log('📄 Fetching all pages...');

  const query = gql`
    query GetAllPages($after: String) {
      pages(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          slug
          date
          modified
          content
          link
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
        }
      }
    }
  `;

  let allPages = [];
  let hasNextPage = true;
  let after = null;

  try {
    while (hasNextPage) {
      const data = await client.request(query, { after });
      allPages = [...allPages, ...data.pages.nodes];
      hasNextPage = data.pages.pageInfo.hasNextPage;
      after = data.pages.pageInfo.endCursor;

      console.log(`  Fetched ${allPages.length} pages...`);
    }

    console.log(`✅ Successfully fetched ${allPages.length} pages`);
    return allPages;
  } catch (error) {
    console.error('❌ Error fetching pages:', error.message);
    return [];
  }
}

/**
 * Query custom post types (generic function)
 */
async function fetchCustomPostType(postType, queryName) {
  console.log(`📦 Fetching ${postType}...`);

  const query = gql`
    query GetCustomPosts($after: String) {
      ${queryName}(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          title
          slug
          date
          content
          link
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
        }
      }
    }
  `;

  let allItems = [];
  let hasNextPage = true;
  let after = null;

  try {
    while (hasNextPage) {
      const data = await client.request(query, { after });
      allItems = [...allItems, ...data[queryName].nodes];
      hasNextPage = data[queryName].pageInfo.hasNextPage;
      after = data[queryName].pageInfo.endCursor;

      console.log(`  Fetched ${allItems.length} ${postType}...`);
    }

    console.log(`✅ Successfully fetched ${allItems.length} ${postType}`);
    return allItems;
  } catch (error) {
    console.error(`❌ Error fetching ${postType}:`, error.message);
    return [];
  }
}

/**
 * Save data to JSON file
 */
async function saveToJSON(filename, data) {
  const filepath = path.join(DATA_DIR, filename);
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 Saved ${filename}`);
}

/**
 * Generate content inventory report
 */
function generateInventoryReport(data) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPosts: data.posts?.length || 0,
      totalPages: data.pages?.length || 0,
      totalAccommodation: data.accommodation?.length || 0,
      totalDestinations: data.destinations?.length || 0,
      totalActivities: data.activities?.length || 0,
      totalAttractions: data.attractions?.length || 0,
      totalTours: data.tours?.length || 0,
    },
    languages: {
      en: 0,
      sq: 0,
    },
    postsWithoutFeaturedImage: 0,
    totalImages: 0,
  };

  // Count languages and images
  ['posts', 'pages', 'accommodation', 'destinations', 'activities', 'attractions', 'tours'].forEach(type => {
    if (data[type]) {
      data[type].forEach(item => {
        // Detect language from URL if language field not available
        let lang = item.language?.code || 'en';
        if (item.link && item.link.includes('/sq/')) {
          lang = 'sq';
        }
        lang = lang.toLowerCase();

        if (lang === 'en') report.languages.en++;
        if (lang === 'sq') report.languages.sq++;

        if (item.featuredImage?.node?.sourceUrl) {
          report.totalImages++;
        } else if (type === 'posts') {
          report.postsWithoutFeaturedImage++;
        }
      });
    }
  });

  return report;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting WordPress content extraction...\n');

  // Ensure data directory exists
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const data = {};

  // Fetch all content types
  data.posts = await fetchAllPosts();
  console.log('');

  data.pages = await fetchAllPages();
  console.log('');

  // Try to fetch custom post types (these might fail if not configured in WPGraphQL)
  // Based on error: "allAccommodation" exists
  try {
    data.accommodation = await fetchCustomPostType('accommodation', 'allAccommodation');
  } catch (error) {
    console.log('ℹ️  Accommodation post type not available or not configured in WPGraphQL');
    console.log('   Error:', error.message.split(':')[0]);
    data.accommodation = [];
  }
  console.log('');

  // Try other common patterns for custom post types
  const customTypes = [
    { key: 'destinations', queries: ['allDestination', 'destinations'] },
    { key: 'activities', queries: ['allActivity', 'activities'] },
    { key: 'attractions', queries: ['allAttraction', 'attractions'] },
    { key: 'tours', queries: ['allTour', 'tours'] },
  ];

  for (const type of customTypes) {
    let fetched = false;
    for (const queryName of type.queries) {
      if (!fetched) {
        try {
          data[type.key] = await fetchCustomPostType(type.key, queryName);
          fetched = true;
        } catch (error) {
          // Try next query name
        }
      }
    }
    if (!fetched) {
      console.log(`ℹ️  ${type.key} post type not available or not configured in WPGraphQL`);
      data[type.key] = [];
    }
    console.log('');
  }

  // Save all data
  console.log('\n💾 Saving extracted data...');
  await saveToJSON('content-inventory.json', data);

  // Generate and save report
  const report = generateInventoryReport(data);
  await saveToJSON('audit-report.json', report);

  console.log('\n📊 Content Inventory Summary:');
  console.log(`   Posts: ${report.summary.totalPosts}`);
  console.log(`   Pages: ${report.summary.totalPages}`);
  console.log(`   Accommodation: ${report.summary.totalAccommodation}`);
  console.log(`   Destinations: ${report.summary.totalDestinations}`);
  console.log(`   Activities: ${report.summary.totalActivities}`);
  console.log(`   Attractions: ${report.summary.totalAttractions}`);
  console.log(`   Tours: ${report.summary.totalTours}`);
  console.log(`\n   Languages:`);
  console.log(`   English: ${report.languages.en}`);
  console.log(`   Albanian: ${report.languages.sq}`);
  console.log(`\n   Images: ${report.totalImages}`);
  console.log(`   Posts without featured image: ${report.postsWithoutFeaturedImage}`);

  console.log('\n✅ Migration extraction complete!');
  console.log('\nNext steps:');
  console.log('  1. Review data/content-inventory.json');
  console.log('  2. Run: npm run migrate:images');
  console.log('  3. Run: npm run migrate:markdown');
}

// Run migration
migrate().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
