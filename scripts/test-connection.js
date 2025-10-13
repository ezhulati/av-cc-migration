/**
 * Test GraphQL Connection
 */

import { GraphQLClient, gql } from 'graphql-request';
import dotenv from 'dotenv';

dotenv.config();

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'https://albaniavisit.com/graphql';

async function testConnection() {
  console.log('🔌 Testing WordPress GraphQL connection...\n');
  console.log(`Endpoint: ${GRAPHQL_ENDPOINT}\n`);

  const client = new GraphQLClient(GRAPHQL_ENDPOINT);

  // Simple test query
  const query = gql`
    {
      generalSettings {
        title
        description
        url
      }
      posts(first: 3) {
        nodes {
          id
          title
          slug
          date
        }
      }
    }
  `;

  try {
    const data = await client.request(query);

    console.log('✅ Connection successful!\n');
    console.log('Site Information:');
    console.log(`  Title: ${data.generalSettings.title}`);
    console.log(`  URL: ${data.generalSettings.url}`);
    console.log(`  Description: ${data.generalSettings.description}\n`);

    console.log('Sample Posts:');
    data.posts.nodes.forEach((post, i) => {
      console.log(`  ${i + 1}. ${post.title}`);
      console.log(`     Slug: ${post.slug}`);
      console.log(`     Date: ${post.date}\n`);
    });

    console.log('🎉 Ready to run migration!');
    console.log('   Run: npm run migrate:all');
    return true;
  } catch (error) {
    console.error('❌ Connection failed!\n');
    console.error('Error:', error.message);

    if (error.response?.errors) {
      console.error('\nGraphQL Errors:');
      error.response.errors.forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }

    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Verify WPGraphQL plugin is installed and active');
    console.log('  2. Check endpoint URL: https://albaniavisit.com/graphql');
    console.log('  3. Verify credentials in .env file');
    console.log('  4. Check WordPress site is accessible');

    return false;
  }
}

testConnection().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
