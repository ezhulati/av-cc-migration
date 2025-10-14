#!/usr/bin/env node

/**
 * Test Custom Fields Query
 * Try different field combinations to discover what's available
 */

import { GraphQLClient, gql } from 'graphql-request';
import dotenv from 'dotenv';

dotenv.config();

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'https://albaniavisit.com/graphql';
const client = new GraphQLClient(GRAPHQL_ENDPOINT);

async function testFields() {
  console.log('🧪 Testing different field queries...\n');

  // Test 1: Try ACF fields on posts
  console.log('1️⃣ Testing ACF fields on Posts...');
  try {
    const query = gql`
      { posts(first: 1) { nodes {
        id
        title
        slug
        # Try ACF field group
        acfFields
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ ACF fields query successful!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ ACF fields not available:', e.message.split('\n')[0]);
  }

  // Test 2: Try meta fields
  console.log('\n2️⃣ Testing meta fields on Posts...');
  try {
    const query = gql`
      { posts(first: 1) { nodes {
        id
        title
        slug
        meta {
          key
          value
        }
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ Meta fields query successful!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ Meta fields not available:', e.message.split('\n')[0]);
  }

  // Test 3: Try Accommodation with common fields
  console.log('\n3️⃣ Testing Accommodation fields...');
  try {
    const query = gql`
      { allAccommodation(first: 1) { nodes {
        id
        title
        slug
        content
        featuredImage { node { sourceUrl altText } }
        # Common accommodation fields
        accommodationFields {
          price
          location
          rating
          amenities
          bookingUrl
        }
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ Accommodation custom fields found!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ accommodationFields not available:', e.message.split('\n')[0]);
  }

  // Test 4: Try Destination with location fields
  console.log('\n4️⃣ Testing Destination fields...');
  try {
    const query = gql`
      { allDestination(first: 1) { nodes {
        id
        title
        slug
        content
        featuredImage { node { sourceUrl } }
        # Common destination fields
        destinationFields {
          region
          latitude
          longitude
          highlights
        }
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ Destination custom fields found!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ destinationFields not available:', e.message.split('\n')[0]);
  }

  // Test 5: Try generic custom fields approach
  console.log('\n5️⃣ Testing generic postFields...');
  try {
    const query = gql`
      { posts(first: 1) { nodes {
        id
        title
        postFields {
          fieldGroupName
        }
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ postFields query successful!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ postFields not available:', e.message.split('\n')[0]);
  }

  // Test 6: Try Yoast SEO fields
  console.log('\n6️⃣ Testing Yoast SEO fields...');
  try {
    const query = gql`
      { posts(first: 1) { nodes {
        id
        title
        seo {
          title
          metaDesc
          opengraphTitle
          opengraphDescription
          canonical
        }
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ SEO fields found!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ SEO fields not available:', e.message.split('\n')[0]);
  }

  console.log('\n✅ Field testing complete!');
  console.log('\nTo see all available fields, you may need to:');
  console.log('  1. Check WordPress admin -> WPGraphQL settings');
  console.log('  2. Look at ACF field group names');
  console.log('  3. Manually query specific field names you know exist');
}

testFields();
