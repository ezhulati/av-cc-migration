import fs from 'fs';
import path from 'path';

console.log('🔄 Fetching COMPLETE destination data from WordPress GraphQL\n');

// WordPress GraphQL endpoint
const GRAPHQL_ENDPOINT = 'https://albaniavisit.com/graphql';

/**
 * GraphQL query to fetch ALL destination data including ACF fields and SEO
 */
const DESTINATIONS_QUERY = `
  query GetDestinations($after: String) {
    destinations(first: 100, after: $after, where: {language: EN}) {
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

        # Featured Image
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

        # ACF Custom Fields (adjust based on your actual ACF field names)
        destinationFields {
          coordinates {
            latitude
            longitude
          }
          highlights
          region
          bestTimeToVisit
          gettingThere
          whereToStay
          thingsToDo
          localCuisine
          practicalInfo
        }

        # RankMath SEO
        seo {
          title
          metaDesc
          canonical
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
 * Fetch all destinations with pagination
 */
async function fetchAllDestinations() {
  let allDestinations = [];
  let hasNextPage = true;
  let endCursor = null;

  console.log('📡 Fetching destinations from WordPress...\n');

  while (hasNextPage) {
    const data = await fetchGraphQL(DESTINATIONS_QUERY, { after: endCursor });

    if (!data || !data.destinations) {
      console.log('⚠️  No destinations data returned');
      break;
    }

    const { nodes, pageInfo } = data.destinations;
    allDestinations = [...allDestinations, ...nodes];

    console.log(`   Fetched ${nodes.length} destinations (total: ${allDestinations.length})`);

    hasNextPage = pageInfo.hasNextPage;
    endCursor = pageInfo.endCursor;
  }

  console.log(`\n✅ Total destinations fetched: ${allDestinations.length}\n`);
  return allDestinations;
}

/**
 * Save raw data for inspection
 */
function saveRawData(destinations) {
  const outputPath = 'data/destinations-graphql-raw.json';
  fs.writeFileSync(outputPath, JSON.stringify(destinations, null, 2), 'utf8');
  console.log(`📄 Raw data saved to: ${outputPath}\n`);
}

/**
 * Analyze what data we actually got
 */
function analyzeData(destinations) {
  console.log('='.repeat(80));
  console.log('DATA ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  const stats = {
    total: destinations.length,
    withFeaturedImage: 0,
    withCoordinates: 0,
    withHighlights: 0,
    withSEO: 0,
    withACF: 0
  };

  destinations.forEach(dest => {
    if (dest.featuredImage?.node?.sourceUrl) stats.withFeaturedImage++;
    if (dest.destinationFields) stats.withACF++;
    if (dest.destinationFields?.coordinates) stats.withCoordinates++;
    if (dest.destinationFields?.highlights?.length > 0) stats.withHighlights++;
    if (dest.seo?.metaDesc) stats.withSEO++;
  });

  console.log(`Total Destinations:     ${stats.total}`);
  console.log(`With Featured Image:    ${stats.withFeaturedImage} (${((stats.withFeaturedImage/stats.total)*100).toFixed(1)}%)`);
  console.log(`With ACF Fields:        ${stats.withACF} (${((stats.withACF/stats.total)*100).toFixed(1)}%)`);
  console.log(`With Coordinates:       ${stats.withCoordinates} (${((stats.withCoordinates/stats.total)*100).toFixed(1)}%)`);
  console.log(`With Highlights:        ${stats.withHighlights} (${((stats.withHighlights/stats.total)*100).toFixed(1)}%)`);
  console.log(`With SEO Metadata:      ${stats.withSEO} (${((stats.withSEO/stats.total)*100).toFixed(1)}%)`);
  console.log();

  // Show sample of first destination
  if (destinations.length > 0) {
    console.log('SAMPLE DESTINATION (first result):');
    console.log('-'.repeat(80));
    const sample = destinations[0];
    console.log(`Title: ${sample.title}`);
    console.log(`Slug: ${sample.slug}`);
    console.log(`Featured Image: ${sample.featuredImage?.node?.sourceUrl || 'MISSING'}`);
    console.log(`Has ACF Fields: ${sample.destinationFields ? 'YES' : 'NO'}`);
    if (sample.destinationFields) {
      console.log(`  - Coordinates: ${sample.destinationFields.coordinates ? 'YES' : 'NO'}`);
      console.log(`  - Highlights: ${sample.destinationFields.highlights?.length || 0}`);
      console.log(`  - Region: ${sample.destinationFields.region || 'N/A'}`);
    }
    console.log(`Has SEO: ${sample.seo?.metaDesc ? 'YES' : 'NO'}`);
    console.log();
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Fetch all destinations
    const destinations = await fetchAllDestinations();

    // Save raw data
    saveRawData(destinations);

    // Analyze what we got
    analyzeData(destinations);

    console.log('✅ GraphQL fetch complete!\n');
    console.log('Next steps:');
    console.log('  1. Review data/destinations-graphql-raw.json');
    console.log('  2. Verify ACF field names match your WordPress setup');
    console.log('  3. Run the import script to update markdown files\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
