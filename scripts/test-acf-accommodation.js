#!/usr/bin/env node

/**
 * Test ACF Fields for Accommodation
 * Tests various patterns for accessing ACF fields on Accommodation post type
 */

import { GraphQLClient, gql } from 'graphql-request';
import dotenv from 'dotenv';

dotenv.config();

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT || 'https://albaniavisit.com/graphql';
const client = new GraphQLClient(GRAPHQL_ENDPOINT);

async function testACFFields() {
  console.log('🧪 Testing ACF field patterns for Accommodation...\\n');

  // Test 1: Try standard ACF pattern
  console.log('1️⃣ Testing standard ACF pattern...');
  try {
    const query = gql`
      { allAccommodation(first: 1) { nodes {
        id
        title
        slug
        # Standard ACF pattern
        acf {
          fieldGroupName
        }
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ ACF pattern works!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ Standard ACF pattern failed:', e.message.split('\\n')[0]);
  }

  // Test 2: Try camelCase ACF pattern
  console.log('\\n2️⃣ Testing camelCase accommodation fields...');
  try {
    const query = gql`
      { allAccommodation(first: 1) { nodes {
        id
        title
        slug
        accommodationId
        accommodationFields {
          fieldGroupName
        }
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ accommodationFields works!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ accommodationFields failed:', e.message.split('\\n')[0]);
  }

  // Test 3: Try direct field names
  console.log('\\n3️⃣ Testing direct field names (common ACF fields)...');
  try {
    const query = gql`
      { allAccommodation(first: 1) { nodes {
        id
        title
        slug
        # Common accommodation fields
        location
        price
        rating
        amenities
        bookingUrl
        address
        phone
        email
        website
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ Direct fields work!');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('❌ Direct fields failed:', e.message.split('\\n')[0]);
  }

  // Test 4: Try getting ANY fields that exist
  console.log('\\n4️⃣ Testing basic query to see what IS available...');
  try {
    const query = gql`
      { allAccommodation(first: 1) { nodes {
        id
        databaseId
        title
        slug
        content
        excerpt
        date
        modified
        link
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
      }}}
    `;
    const result = await client.request(query);
    console.log('✅ Basic query successful!');
    console.log(JSON.stringify(result, null, 2));

    if (result.allAccommodation?.nodes?.[0]) {
      console.log('\\n📋 Available fields on this accommodation:');
      console.log(Object.keys(result.allAccommodation.nodes[0]));
    }
  } catch (e) {
    console.log('❌ Basic query failed:', e.message);
  }

  // Test 5: Try WordPress REST API for postmeta
  console.log('\\n5️⃣ Testing WordPress REST API for ACF fields...');
  try {
    const response = await fetch('https://albaniavisit.com/wp-json/wp/v2/accommodation?per_page=1');
    const data = await response.json();

    if (data && data[0]) {
      console.log('✅ REST API successful!');
      console.log('\\nPost data structure:');
      console.log(JSON.stringify(data[0], null, 2));

      // Check for ACF in different locations
      if (data[0].acf) {
        console.log('\\n🎯 Found ACF fields!');
        console.log(JSON.stringify(data[0].acf, null, 2));
      } else {
        console.log('\\n⚠️ No acf property found in REST response');
      }

      if (data[0].meta) {
        console.log('\\n📝 Found meta fields:');
        console.log(JSON.stringify(data[0].meta, null, 2));
      }
    }
  } catch (e) {
    console.log('❌ REST API failed:', e.message);
  }

  console.log('\\n✅ ACF field testing complete!');
  console.log('\\nNext steps:');
  console.log('  1. If ACF fields found via GraphQL, update migration script');
  console.log('  2. If ACF fields found via REST API, use REST API for migration');
  console.log('  3. If no ACF fields found, check WordPress admin ACF settings');
}

testACFFields();
