// Test script for Cloudflare Worker Visitor API
// Run with: node test-visitor-api.js

const fetch = require('node-fetch');

// Configuration - Update these values!
const VISITOR_COUNTER_API = process.env.VISITOR_COUNTER_API || 'https://visitor-counter.YOUR-SUBDOMAIN.workers.dev';
const SPACE_NAME = 'test-space';

async function testAPI() {
  console.log('🧪 Testing Visitor Counter API...');
  console.log(`API URL: ${VISITOR_COUNTER_API}`);
  console.log(`Space: ${SPACE_NAME}\n`);

  // Test 1: Check if API is accessible
  try {
    console.log('1️⃣ Testing API availability...');
    const response = await fetch(VISITOR_COUNTER_API);
    console.log(`Response status: ${response.status}`);
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ API not accessible:', error.message);
    return;
  }

  // Test 2: Get all spaces
  try {
    console.log('\n2️⃣ Getting all spaces...');
    const response = await fetch(`${VISITOR_COUNTER_API}/api/spaces`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Spaces:', JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ Failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 3: Create test space
  try {
    console.log('\n3️⃣ Creating test space...');
    const response = await fetch(`${VISITOR_COUNTER_API}/api/space/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceName: SPACE_NAME })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Space created:', JSON.stringify(data, null, 2));
    } else if (response.status === 409) {
      console.log('ℹ️  Space already exists');
    } else {
      console.error(`❌ Failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 4: Record a visit
  try {
    console.log('\n4️⃣ Recording a visit...');
    const visitorId = `test-visitor-${Date.now()}`;
    const response = await fetch(`${VISITOR_COUNTER_API}/api/space/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceName: SPACE_NAME, visitorId })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Visit recorded:', JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ Failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 5: Get space stats
  try {
    console.log('\n5️⃣ Getting space stats...');
    const response = await fetch(`${VISITOR_COUNTER_API}/api/space/${SPACE_NAME}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Space stats:', JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ Failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run tests
testAPI().then(() => {
  console.log('\n✅ Tests complete!');
}).catch(error => {
  console.error('\n❌ Test failed:', error);
});