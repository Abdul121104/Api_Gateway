/**
 * Day 6 Cache Test Script
 * GET same endpoint twice
 * First request → MISS
 * Second request → HIT
 * Restart server → cache still works
 * POST/PUT → cache invalidated
 */
import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3000';

// Test data
const testUser = {
  name: 'Day6 Cache Test User',
  email: 'day6cache@example.com',
  password: 'password123'
};

let authToken = '';
let apiKey = '';

async function testDay6() {
  try {
    console.log('🧪 Day 6 Cache Test\n');
    console.log('='.repeat(60));

    // Step 1: Setup
    console.log('\n1️⃣ Setting up test user and API client...');
    try {
      await axios.post(`${GATEWAY_URL}/auth/signup`, testUser);
    } catch (error) {
      if (error.response?.status !== 409) throw error;
    }

    const loginResponse = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = loginResponse.data.token;

    const api = axios.create({
      baseURL: GATEWAY_URL,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    const clientResponse = await api.post('/api/clients', {
      name: 'Day6 Cache Test Client'
    });
    apiKey = clientResponse.data.apiKey;
    console.log('✅ API client created');

    // Create a route for testing
    await api.post('/api/routes', {
      pathPrefix: '/test-cache',
      targetUrl: 'http://localhost:4000/users',
      methods: ['GET', 'POST', 'PUT']
    });
    console.log('✅ Test route created');

    // Configure API calls with API key
    const gatewayApi = axios.create({
      baseURL: GATEWAY_URL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 Cache Test: GET same endpoint twice');
    console.log('='.repeat(60));

    // Step 2: First GET request (should be MISS)
    console.log('\n2️⃣ First GET request (should be MISS)...');
    const firstResponse = await gatewayApi.get('/test-cache');
    const firstCacheHeader = firstResponse.headers['x-cache'];
    
    console.log(`   Status: ${firstResponse.status}`);
    console.log(`   X-Cache: ${firstCacheHeader}`);
    
    if (firstCacheHeader === 'MISS') {
      console.log('✅ First request shows MISS (cache not found)');
    } else {
      console.log(`⚠️  Expected MISS, got ${firstCacheHeader}`);
    }

    // Step 3: Second GET request (should be HIT)
    console.log('\n3️⃣ Second GET request (should be HIT)...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    
    const secondResponse = await gatewayApi.get('/test-cache');
    const secondCacheHeader = secondResponse.headers['x-cache'];
    
    console.log(`   Status: ${secondResponse.status}`);
    console.log(`   X-Cache: ${secondCacheHeader}`);
    
    if (secondCacheHeader === 'HIT') {
      console.log('✅ Second request shows HIT (cache found)');
    } else {
      console.log(`❌ Expected HIT, got ${secondCacheHeader}`);
    }

    // Verify responses are identical
    if (JSON.stringify(firstResponse.data) === JSON.stringify(secondResponse.data)) {
      console.log('✅ Cached response matches original response');
    } else {
      console.log('⚠️  Cached response differs from original');
    }

    // Step 4: Test cache persists after server restart
    console.log('\n4️⃣ Testing cache persistence...');
    console.log('   (Cache should persist in Redis even after server restart)');
    console.log('   You can restart the server and run this test again to verify.');
    console.log('   The cache should still work because it\'s stored in Redis.');

    // Step 5: Test cache invalidation on POST
    console.log('\n5️⃣ Testing cache invalidation on POST...');
    
    // First, make a GET to populate cache
    console.log('   Making GET request to populate cache...');
    await gatewayApi.get('/test-cache');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify cache is HIT
    const beforePostResponse = await gatewayApi.get('/test-cache');
    if (beforePostResponse.headers['x-cache'] === 'HIT') {
      console.log('   ✅ Cache is HIT before POST');
    }
    
    // Make POST request (should invalidate cache)
    console.log('   Making POST request (should invalidate cache)...');
    await gatewayApi.post('/test-cache', { test: 'data' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify cache is MISS after POST
 // Verify cache is MISS on NEXT GET after POST
const afterPostGetResponse = await gatewayApi.get('/test-cache');
const afterPostGetCacheHeader = afterPostGetResponse.headers['x-cache'];

console.log(`   X-Cache on GET after POST: ${afterPostGetCacheHeader}`);

if (afterPostGetCacheHeader === 'MISS') {
  console.log('   ✅ Cache was invalidated (MISS on GET after POST)');
} else {
  console.log(`   ⚠️  Expected MISS on GET after POST, got ${afterPostGetCacheHeader}`);
}


    // Step 6: Test cache invalidation on PUT
    console.log('\n6️⃣ Testing cache invalidation on PUT...');
    
    // Populate cache again
    await gatewayApi.get('/test-cache');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Make PUT request
    console.log('   Making PUT request (should invalidate cache)...');
    await gatewayApi.put('/test-cache', { test: 'updated' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify cache is MISS after PUT
    const afterPutGetResponse = await gatewayApi.get('/test-cache');
const afterPutGetCacheHeader = afterPutGetResponse.headers['x-cache'];

console.log(`   X-Cache on GET after PUT: ${afterPutGetCacheHeader}`);

if (afterPutGetCacheHeader === 'MISS') {
  console.log('   ✅ Cache was invalidated (MISS on GET after PUT)');
} else {
  console.log(`   ⚠️  Expected MISS on GET after PUT, got ${afterPutGetCacheHeader}`);
}


    // Step 7: Test admin cache clear endpoint
    console.log('\n7️⃣ Testing admin cache clear endpoint...');
    
    // Populate cache
    await gatewayApi.get('/test-cache');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Clear cache using admin endpoint
    const adminApi = axios.create({
      baseURL: GATEWAY_URL,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    try {
      const clearResponse = await adminApi.post('/api/cache/clear', {
        prefix: 'cache:GET:/test-cache'
      });
      console.log('   ✅ Cache cleared via admin endpoint');
      console.log(`   Deleted keys: ${clearResponse.data.deletedKeys}`);
      
      // Verify cache is MISS after clear
      await new Promise(resolve => setTimeout(resolve, 500));
      const afterClearResponse = await gatewayApi.get('/test-cache');
      const afterClearCacheHeader = afterClearResponse.headers['x-cache'];
      
      console.log(`   X-Cache after clear: ${afterClearCacheHeader}`);
      
      if (afterClearCacheHeader === 'MISS') {
        console.log('   ✅ Cache was cleared (MISS after admin clear)');
      }
    } catch (error) {
      console.log('   ⚠️  Cache clear endpoint error:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Day 6 cache test completed!');
    console.log('='.repeat(60));
    console.log('\n💡 To test cache persistence after restart:');
    console.log('   1. Restart the server');
    console.log('   2. Run this test again');
    console.log('   3. First GET should be HIT (if within TTL)');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data);
    } else if (error.request) {
      console.error('   Server not responding.');
      console.error('   Make sure:');
      console.error('   1. Gateway server is running on port 3000');
      console.error('   2. Target service is running on port 4000');
      console.error('   3. Redis is running (redis://localhost:6379)');
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

testDay6();