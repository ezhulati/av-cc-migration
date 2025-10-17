import fs from 'fs';

console.log('🔍 Discovering Custom Post Type fields in WordPress GraphQL\n');

const GRAPHQL_ENDPOINT = 'https://albaniavisit.com/graphql';

/**
 * Introspection query to discover what queries are available
 */
const DISCOVER_QUERIES = `
  query DiscoverQueries {
    __schema {
      queryType {
        fields {
          name
          description
          type {
            name
            kind
          }
        }
      }
    }
  }
`;

async function fetchGraphQL(query) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query })
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

async function main() {
  try {
    console.log('📡 Fetching available queries...\n');

    const data = await fetchGraphQL(DISCOVER_QUERIES);

    // Filter for queries that might be custom post types
    const queries = data.__schema.queryType.fields;

    console.log('All available root queries:');
    console.log('='.repeat(80));

    // Look for destination, activity, attraction related queries
    const relevantQueries = queries.filter(q =>
      q.name.toLowerCase().includes('destination') ||
      q.name.toLowerCase().includes('activity') ||
      q.name.toLowerCase().includes('activities') ||
      q.name.toLowerCase().includes('attraction') ||
      q.name.toLowerCase().includes('tour') ||
      q.name.toLowerCase().includes('bus') ||
      q.name.toLowerCase().includes('research')
    );

    console.log('\nRelevant Custom Post Type queries:');
    console.log('-'.repeat(80));
    relevantQueries.forEach(q => {
      console.log(`  ${q.name}: ${q.type.name || q.type.kind}`);
      if (q.description) console.log(`    ${q.description}`);
    });

    // Save all queries to file
    fs.writeFileSync(
      'data/graphql-available-queries.json',
      JSON.stringify(data, null, 2),
      'utf8'
    );

    console.log('\n✅ All queries saved to: data/graphql-available-queries.json\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
