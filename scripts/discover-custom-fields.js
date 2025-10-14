#!/usr/bin/env node

/**
 * Discover Custom Fields Script
 * Queries WordPress GraphQL to find all available custom fields for each post type
 */

import { GraphQLClient, gql } from 'graphql-request';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'https://albaniavisit.com/graphql';
const client = new GraphQLClient(GRAPHQL_ENDPOINT);

// Introspection query to get all types
const INTROSPECTION_QUERY = gql`
  query IntrospectTypes {
    __schema {
      types {
        name
        kind
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  }
`;

async function discoverCustomFields() {
  console.log('🔍 Discovering custom fields from WordPress GraphQL...\n');

  try {
    // Get schema information
    const schemaData = await client.request(INTROSPECTION_QUERY);
    const types = schemaData.__schema.types;

    // Look for custom post type types
    const customPostTypes = types.filter(type =>
      type.name && (
        type.name.includes('Accommodation') ||
        type.name.includes('Destination') ||
        type.name.includes('Activity') ||
        type.name.includes('Attraction') ||
        type.name.includes('Tour') ||
        type.name === 'Post' ||
        type.name === 'Page'
      ) &&
      type.kind === 'OBJECT' &&
      !type.name.includes('Connection') &&
      !type.name.includes('Edge') &&
      !type.name.includes('PageInfo')
    );

    console.log('📋 Found these post types:');
    customPostTypes.forEach(type => {
      console.log(`  - ${type.name}`);
    });

    // For each post type, extract field information
    const fieldsByType = {};

    customPostTypes.forEach(type => {
      if (type.fields) {
        fieldsByType[type.name] = type.fields
          .filter(field =>
            // Filter out standard WordPress fields to focus on custom ones
            !['__typename', 'id', 'databaseId'].includes(field.name)
          )
          .map(field => ({
            name: field.name,
            typeName: field.type.name || field.type.ofType?.name || 'Unknown',
            kind: field.type.kind || field.type.ofType?.kind || 'Unknown'
          }));
      }
    });

    console.log('\n📊 Custom Fields by Type:\n');

    Object.entries(fieldsByType).forEach(([typeName, fields]) => {
      console.log(`\n${typeName}:`);
      console.log(`  Total fields: ${fields.length}`);

      // Group fields by whether they're likely custom fields
      const customFields = fields.filter(f =>
        // Common ACF/custom field patterns
        !['title', 'content', 'excerpt', 'date', 'modified', 'slug', 'link', 'uri',
         'author', 'categories', 'tags', 'featuredImage', 'seo', 'status',
         'commentCount', 'commentStatus', 'guid', 'isRestricted'].includes(f.name)
      );

      if (customFields.length > 0) {
        console.log(`  Custom fields found: ${customFields.length}`);
        customFields.forEach(field => {
          console.log(`    - ${field.name} (${field.typeName})`);
        });
      }
    });

    // Save the discovered schema
    await fs.writeFile(
      './data/discovered-schema.json',
      JSON.stringify(fieldsByType, null, 2)
    );
    console.log('\n💾 Saved schema to data/discovered-schema.json');

    // Now fetch a sample of each post type to see actual data
    console.log('\n\n🔬 Fetching sample data from each post type...\n');

    const samples = {};

    // Sample Posts
    try {
      const postSample = await client.request(gql`
        { posts(first: 1) { nodes {
          id title slug content excerpt
          featuredImage { node { sourceUrl } }
          author { node { name } }
          categories { nodes { name } }
          tags { nodes { name } }
        }}}
      `);
      samples.posts = postSample.posts.nodes[0];
      console.log('✅ Got sample post');
    } catch (e) {
      console.log('❌ Failed to get sample post:', e.message);
    }

    // Sample Accommodation with potential custom fields
    try {
      const accomSample = await client.request(gql`
        { allAccommodation(first: 1) { nodes {
          id title slug content
          featuredImage { node { sourceUrl } }
        }}}
      `);
      samples.accommodation = accomSample.allAccommodation.nodes[0];
      console.log('✅ Got sample accommodation');
    } catch (e) {
      console.log('❌ Failed to get sample accommodation:', e.message);
    }

    // Sample Destination
    try {
      const destSample = await client.request(gql`
        { allDestination(first: 1) { nodes {
          id title slug content
          featuredImage { node { sourceUrl } }
        }}}
      `);
      samples.destinations = destSample.allDestination.nodes[0];
      console.log('✅ Got sample destination');
    } catch (e) {
      console.log('❌ Failed to get sample destination:', e.message);
    }

    // Sample Activity
    try {
      const actSample = await client.request(gql`
        { allActivity(first: 1) { nodes {
          id title slug content
          featuredImage { node { sourceUrl } }
        }}}
      `);
      samples.activities = actSample.allActivity.nodes[0];
      console.log('✅ Got sample activity');
    } catch (e) {
      console.log('❌ Failed to get sample activity:', e.message);
    }

    // Sample Attraction
    try {
      const attrSample = await client.request(gql`
        { allAttraction(first: 1) { nodes {
          id title slug content
          featuredImage { node { sourceUrl } }
        }}}
      `);
      samples.attractions = attrSample.allAttraction.nodes[0];
      console.log('✅ Got sample attraction');
    } catch (e) {
      console.log('❌ Failed to get sample attraction:', e.message);
    }

    await fs.writeFile(
      './data/sample-data.json',
      JSON.stringify(samples, null, 2)
    );
    console.log('\n💾 Saved samples to data/sample-data.json');

    console.log('\n✅ Discovery complete!');
    console.log('\nNext steps:');
    console.log('  1. Review data/discovered-schema.json for all available fields');
    console.log('  2. Review data/sample-data.json for actual data structure');
    console.log('  3. Update migrate-content.js to include custom fields');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.errors) {
      console.error('\nGraphQL Errors:');
      error.response.errors.forEach(err => {
        console.error(`  - ${err.message}`);
      });
    }
    process.exit(1);
  }
}

discoverCustomFields();
