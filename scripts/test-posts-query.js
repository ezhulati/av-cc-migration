import fs from 'fs';

console.log('🧪 Testing basic posts query to understand WordPress GraphQL schema\n');

const GRAPHQL_ENDPOINT = 'https://albaniavisit.com/graphql';

/**
 * Simple query to fetch just a few posts and see what fields are available
 */
const TEST_QUERY = `
  query TestPostsQuery {
    posts(first: 3, where: { categoryName: "destinations" }) {
      nodes {
        id
        title
        slug
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        categories {
          nodes {
            name
            slug
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
    console.log('📡 Testing basic query...\n');

    const data = await fetchGraphQL(TEST_QUERY);

    console.log('✅ Query successful!\n');
    console.log(JSON.stringify(data, null, 2));

    // Save to file
    fs.writeFileSync('data/test-posts-result.json', JSON.stringify(data, null, 2), 'utf8');
    console.log('\n📄 Results saved to: data/test-posts-result.json\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
