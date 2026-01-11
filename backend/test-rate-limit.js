/**
 * Test script for rate limiting
 * Day 5 Test: Set limit to 5 req/min, send 6 rapid requests
 * Expected: first 5 → 200, 6th → 429, wait 60s → requests allowed again
 */
import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3000';

// Test data
const testUser = {
  name: 'Rate Limit Test User',
  email: 'ratelimit@example.com',
  password: 'password123'
};

let authToken = '';
let apiKey = '';

async function testRateLimit() {
  try {
    console.log('🧪 Testing Rate Limiting\n');
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
      name: 'Rate Limit Test Client'
    });
    apiKey = clientResponse.data.apiKey;
    console.log('✅ API client created');
    console.log(`   API Key: ${apiKey.substring(0, 30)}...`);

    // Create a route for testing
    await api.post('/api/routes', {
      pathPrefix: '/test',
      targetUrl: 'http://localhost:4000/users',
      methods: ['GET']
    });
    console.log('✅ Test route created');

    // Configure API calls with API key
    const gatewayApi = axios.create({
      baseURL: GATEWAY_URL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Don't throw on 429
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 Rate Limit Test (5 requests/minute)');
    console.log('='.repeat(60));

    // Step 2: Send 6 rapid requests
    console.log('\n2️⃣ Sending 6 rapid requests...\n');
    const results = [];

    for (let i = 1; i <= 6; i++) {
      try {
        const startTime = Date.now();
        const response = await gatewayApi.get('/test');
        const endTime = Date.now();
        
        const result = {
          request: i,
          status: response.status,
          time: endTime - startTime,
          headers: {
            'x-ratelimit-limit': response.headers['x-ratelimit-limit'],
            'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
            'retry-after': response.headers['retry-after']
          }
        };
        
        results.push(result);
        
        if (response.status === 200) {
          console.log(`✅ Request ${i}: Status ${response.status} (Remaining: ${response.headers['x-ratelimit-remaining']})`);
        } else if (response.status === 429) {
          console.log(`🚫 Request ${i}: Status ${response.status} - Rate limit exceeded`);
          console.log(`   Retry-After: ${response.headers['retry-after']} seconds`);
          console.log(`   Message: ${response.data?.message || 'N/A'}`);
        } else {
          console.log(`❓ Request ${i}: Status ${response.status}`);
        }
        
        // Small delay to ensure requests are sequential
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Request ${i} failed:`, error.message);
      }
    }

    // Step 3: Verify results
    console.log('\n3️⃣ Verifying results...');
    const successCount = results.filter(r => r.status === 200).length;
    const rateLimitedCount = results.filter(r => r.status === 429).length;

    console.log(`\n📊 Summary:`);
    console.log(`   Successful (200): ${successCount}`);
    console.log(`   Rate Limited (429): ${rateLimitedCount}`);
    
    if (successCount === 5 && rateLimitedCount === 1) {
      console.log('✅ Test passed! First 5 requests succeeded, 6th was rate limited.');
    } else {
      console.log('⚠️  Test results differ from expected (5 successes, 1 rate limited)');
    }

    // Step 4: Wait and test again
    console.log('\n4️⃣ Waiting 60 seconds before testing again...');
    console.log('   (This will verify that rate limit resets)');
    
    const retryAfter = results[5]?.headers['retry-after'] || 60;
    const waitTime = Math.min(parseInt(retryAfter) + 1, 61); // Wait a bit more than retry-after
    
    console.log(`   Waiting ${waitTime} seconds...`);
    for (let i = waitTime; i > 0; i--) {
      process.stdout.write(`\r   ${i} seconds remaining...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    process.stdout.write('\r   Done waiting!                    \n');

    // Step 5: Test that requests are allowed again
    console.log('\n5️⃣ Testing that requests are allowed again...\n');
    try {
      const response = await gatewayApi.get('/test');
      if (response.status === 200) {
        console.log('✅ Request succeeded after wait!');
        console.log(`   Status: ${response.status}`);
        console.log(`   Remaining: ${response.headers['x-ratelimit-remaining']}`);
      } else {
        console.log(`⚠️  Request status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Rate limit test completed!');
    console.log('='.repeat(60));

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

testRateLimit();