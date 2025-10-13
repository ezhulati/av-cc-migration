/**
 * Inspect GraphQL Schema
 */

import { GraphQLClient, gql } from 'graphql-request';
import dotenv from 'dotenv';

dotenv.config();

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT;
const client = new GraphQLClient(GRAPHQL_ENDPOINT);

async function inspectSchema() {
  console.log('🔍 Inspecting GraphQL schema...\n');

  // Get available post types
  const typesQuery = gql`
    {
      __schema {
        queryType {
          fields {
            name
            description
          }
        }
      }
    }
  `;

  try {
    const schemaData = await client.request(typesQuery);

    console.log('📋 Available root query fields:');
    const relevantFields = schemaData.__schema.queryType.fields
      .filter(f =>
        f.name.includes('post') ||
        f.name.includes('page') ||
        f.name.includes('accommodation') ||
        f.name.includes('destination') ||
        f.name.includes('activity') ||
        f.name.includes('attraction') ||
        f.name.includes('tour') ||
        f.name.includes('All')
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    relevantFields.forEach(field => {
      console.log(`  - ${field.name}`);
    });

    // Now let's get a sample post with all available fields
    console.log('\n📝 Fetching sample post to see available fields...\n');

    const sampleQuery = gql`
      {
        posts(first: 1) {
          nodes {
            id
            title
            slug
            date
            modified
            content
            excerpt
            featuredImage {
              node {
                sourceUrl
                altText
              }
            }
            author {
              node {
                name
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

    const sampleData = await client.request(sampleQuery);
    console.log('✅ Sample post structure:');
    console.log(JSON.stringify(sampleData.posts.nodes[0], null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.errors) {
      error.response.errors.forEach(err => console.error(`  - ${err.message}`));
    }
  }
}

inspectSchema();
