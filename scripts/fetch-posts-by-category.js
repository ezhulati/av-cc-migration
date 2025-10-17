import fs from 'fs';
import path from 'path';

console.log('🔄 Fetching posts by category from WordPress GraphQL\n');

const GRAPHQL_ENDPOINT = 'https://albaniavisit.com/graphql';

/**
 * GraphQL query to fetch posts by category with ALL metadata
 */
const POSTS_BY_CATEGORY_QUERY = `
  query GetPostsByCategory($categoryName: String!, $after: String) {
    posts(
      first: 100
      after: $after
      where: {
        categoryName: $categoryName
        language: EN
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        title
        slug
        content
        excerpt
        date
        modified

        # Featured Image - ACTUAL WordPress featured image
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

        # ACF Custom Fields (if any exist for this post)
        acfFields {
          latitude
          longitude
          highlights
          region
          bestTimeToVisit
          gettingThere
          whereToStay
          thingsToDo
          localCuisine
          practicalInfo
        }

        # RankMath SEO metadata
        seo {
          title
          metaDesc
          canonical
          focusKeywords
          opengraphTitle
          opengraphDescription
          opengraphImage {
            sourceUrl
          }
          twitterTitle
          twitterDescription
          twitterImage {
            sourceUrl
          }
          schema {
            raw
          }
        }

        # Categories & Tags
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

        # Author
        author {
          node {
            name
            slug
            email
          }
        }

        # Language
        language {
          code
          name
        }
      }
    }
  }
`;

/**
 * Fetch data from WordPress GraphQL
 */
async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    console.error('GraphQL Errors:', JSON.stringify(json.errors, null, 2));
    throw new Error('GraphQL query returned errors');
  }

  return json.data;
}

/**
 * Fetch all posts for a given category with pagination
 */
async function fetchPostsByCategory(categoryName) {
  let allPosts = [];
  let hasNextPage = true;
  let endCursor = null;

  console.log(`📡 Fetching "${categoryName}" posts from WordPress...\n`);

  while (hasNextPage) {
    const data = await fetchGraphQL(POSTS_BY_CATEGORY_QUERY, {
      categoryName,
      after: endCursor
    });

    if (!data || !data.posts) {
      console.log('⚠️  No posts data returned');
      break;
    }

    const { nodes, pageInfo } = data.posts;
    allPosts = [...allPosts, ...nodes];

    console.log(`   Fetched ${nodes.length} posts (total: ${allPosts.length})`);

    hasNextPage = pageInfo.hasNextPage;
    endCursor = pageInfo.endCursor;
  }

  console.log(`\n✅ Total "${categoryName}" posts fetched: ${allPosts.length}\n`);
  return allPosts;
}

/**
 * Save raw data for inspection
 */
function saveRawData(categoryName, posts) {
  const outputPath = `data/${categoryName}-graphql-raw.json`;
  fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2), 'utf8');
  console.log(`📄 Raw data saved to: ${outputPath}\n`);
}

/**
 * Analyze what data we actually got
 */
function analyzeData(categoryName, posts) {
  console.log('='.repeat(80));
  console.log(`DATA ANALYSIS: ${categoryName.toUpperCase()}`);
  console.log('='.repeat(80));
  console.log();

  const stats = {
    total: posts.length,
    withFeaturedImage: 0,
    withCoordinates: 0,
    withHighlights: 0,
    withSEO: 0,
    withACF: 0
  };

  posts.forEach(post => {
    if (post.featuredImage?.node?.sourceUrl) stats.withFeaturedImage++;
    if (post.acfFields) stats.withACF++;
    if (post.acfFields?.latitude && post.acfFields?.longitude) stats.withCoordinates++;
    if (post.acfFields?.highlights?.length > 0) stats.withHighlights++;
    if (post.seo?.metaDesc) stats.withSEO++;
  });

  console.log(`Total Posts:            ${stats.total}`);
  console.log(`With Featured Image:    ${stats.withFeaturedImage} (${((stats.withFeaturedImage/stats.total)*100).toFixed(1)}%)`);
  console.log(`With ACF Fields:        ${stats.withACF} (${((stats.withACF/stats.total)*100).toFixed(1)}%)`);
  console.log(`With Coordinates:       ${stats.withCoordinates} (${((stats.withCoordinates/stats.total)*100).toFixed(1)}%)`);
  console.log(`With Highlights:        ${stats.withHighlights} (${((stats.withHighlights/stats.total)*100).toFixed(1)}%)`);
  console.log(`With SEO Metadata:      ${stats.withSEO} (${((stats.withSEO/stats.total)*100).toFixed(1)}%)`);
  console.log();

  // Show sample of first post
  if (posts.length > 0) {
    console.log('SAMPLE POST (first result):');
    console.log('-'.repeat(80));
    const sample = posts[0];
    console.log(`Title: ${sample.title}`);
    console.log(`Slug: ${sample.slug}`);
    console.log(`Featured Image: ${sample.featuredImage?.node?.sourceUrl || 'MISSING'}`);
    console.log(`Has ACF Fields: ${sample.acfFields ? 'YES' : 'NO'}`);
    if (sample.acfFields) {
      console.log(`  - Latitude: ${sample.acfFields.latitude || 'N/A'}`);
      console.log(`  - Longitude: ${sample.acfFields.longitude || 'N/A'}`);
      console.log(`  - Highlights: ${sample.acfFields.highlights?.length || 0}`);
      console.log(`  - Region: ${sample.acfFields.region || 'N/A'}`);
    }
    console.log(`Has SEO: ${sample.seo?.metaDesc ? 'YES' : 'NO'}`);
    if (sample.seo) {
      console.log(`  - Meta Title: ${sample.seo.title || 'N/A'}`);
      console.log(`  - Focus Keywords: ${sample.seo.focusKeywords || 'N/A'}`);
    }
    console.log();
  }
}

/**
 * Main execution
 */
async function main() {
  // Category to fetch (can be: destinations, activities, attractions, etc.)
  const categoryName = process.argv[2] || 'destinations';

  try {
    // Fetch all posts for the category
    const posts = await fetchPostsByCategory(categoryName);

    // Save raw data
    saveRawData(categoryName, posts);

    // Analyze what we got
    analyzeData(categoryName, posts);

    console.log('✅ GraphQL fetch complete!\n');
    console.log('Next steps:');
    console.log(`  1. Review data/${categoryName}-graphql-raw.json`);
    console.log('  2. Verify ACF field names match your WordPress setup');
    console.log('  3. Run the import script to update markdown files\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
