import fs from 'fs';

console.log('🧪 Testing different custom post type query patterns\n');

const GRAPHQL_ENDPOINT = 'https://albaniavisit.com/graphql';

// Try different common patterns for CPT queries
const queries = [
  {
    name: 'allDestination (singular)',
    query: `{ allDestination(first: 1) { nodes { id title slug } } }`
  },
  {
    name: 'allDestinations (plural)',
    query: `{ allDestinations(first: 1) { nodes { id title slug } } }`
  },
  {
    name: 'destinations (lowercase plural)',
    query: `{ destinations(first: 1) { nodes { id title slug } } }`
  },
  {
    name: 'Destinations (capitalized plural)',
    query: `{ Destinations(first: 1) { nodes { id title slug } } }`
  },
  {
    name: 'allActivity (singular)',
    query: `{ allActivity(first: 1) { nodes { id title slug } } }`
  },
  {
    name: 'allActivities (plural)',
    query: `{ allActivities(first: 1) { nodes { id title slug } } }`
  },
  {
    name: 'activities (lowercase plural)',
    query: `{ activities(first: 1) { nodes { id title slug } } }`
  },
  {
    name: 'allAttraction (singular)',
    query: `{ allAttraction(first: 1) { nodes { id title slug } } }`
  },
  {
    name: 'allAttractions (plural)',
    query: `{ allAttractions(first: 1) { nodes { id title slug } } }`
  },
  {
    name: 'attractions (lowercase plural)',
    query: `{ attractions(first: 1) { nodes { id title slug } } }`
  }
];

async function tryQuery(queryObj) {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queryObj.query })
    });

    const json = await response.json();

    if (json.errors) {
      return { success: false, error: json.errors[0].message };
    }

    return { success: true, data: json.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Testing different query patterns...\n');
  console.log('='.repeat(80));

  const results = [];

  for (const queryObj of queries) {
    console.log(`\nTrying: ${queryObj.name}`);
    const result = await tryQuery(queryObj);

    if (result.success) {
      console.log(`  ✅ SUCCESS!`);
      console.log(`  Data:`, JSON.stringify(result.data, null, 2));
      results.push({ name: queryObj.name, success: true, query: queryObj.query });
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
      results.push({ name: queryObj.name, success: false, error: result.error });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY:');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    console.log(`\n✅ Successful queries (${successful.length}):`);
    successful.forEach(r => console.log(`  - ${r.name}`));
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed queries (${failed.length}):`);
    failed.forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }

  // Save results
  fs.writeFileSync(
    'data/cpt-query-test-results.json',
    JSON.stringify(results, null, 2),
    'utf8'
  );

  console.log('\n📄 Full results saved to: data/cpt-query-test-results.json\n');
}

main();
