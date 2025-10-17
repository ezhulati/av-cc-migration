import fs from 'fs';

console.log('🔍 Introspecting WordPress GraphQL schema...\n');

const GRAPHQL_ENDPOINT = 'https://albaniavisit.com/graphql';

/**
 * Query to discover available post types and their fields
 */
const INTROSPECTION_QUERY = `
  query IntrospectSchema {
    __schema {
      types {
        name
        kind
        description
      }
    }
  }
`;

/**
 * Query to get available content types
 */
const CONTENT_TYPES_QUERY = `
  query GetContentTypes {
    contentTypes {
      nodes {
        name
        label
        graphqlSingleName
        graphqlPluralName
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
    console.log('📡 Fetching available content types...\n');

    const contentTypes = await fetchGraphQL(CONTENT_TYPES_QUERY);

    console.log('Available Content Types:');
    console.log('='.repeat(80));

    if (contentTypes && contentTypes.contentTypes) {
      contentTypes.contentTypes.nodes.forEach(type => {
        console.log(`\nName: ${type.name}`);
        console.log(`  Label: ${type.label}`);
        console.log(`  GraphQL Single: ${type.graphqlSingleName}`);
        console.log(`  GraphQL Plural: ${type.graphqlPluralName}`);
      });
    }

    // Save to file
    fs.writeFileSync(
      'data/graphql-content-types.json',
      JSON.stringify(contentTypes, null, 2),
      'utf8'
    );

    console.log('\n\n✅ Content types saved to: data/graphql-content-types.json\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
