import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3000';
const TARGET_SERVICE_URL = 'http://localhost:4000';

// Test data
const testUser = {
  name: 'Gateway Test User',
  email: 'gatewaytest@example.com',
  password: 'password123'
};

let authToken = '';
let apiKey = '';
let routeId = '';

async function testGateway() {
  try {
    console.log('🧪 Testing API Gateway Routing & Proxy\n');
    console.log('='.repeat(60));

    // Step 1: Signup/Login
    console.log('\n1️⃣ Setting up test user...');
    try {
      await axios.post(`${GATEWAY_URL}/auth/signup`, testUser);
      console.log('✅ User created');
    } catch (error) {
      if (error.response?.status !== 409) throw error;
      console.log('ℹ️ User already exists');
    }

    const loginResponse = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = loginResponse.data.token;
    console.log('✅ Logged in successfully');

    const api = axios.create({
      baseURL: GATEWAY_URL,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 2: Create API Client
    console.log('\n2️⃣ Creating API client...');
    const clientResponse = await api.post('/api/clients', {
      name: 'Gateway Test Client'
    });
    apiKey = clientResponse.data.apiKey;
    console.log('✅ API client created');
    console.log(`   API Key: ${apiKey.substring(0, 30)}...`);

    // Step 3: Create Route
    console.log('\n3️⃣ Creating gateway route...');
    const routeResponse = await api.post('/api/routes', {
      pathPrefix: '/users',
      targetUrl: TARGET_SERVICE_URL,
      methods: ['GET', 'POST']
    });
    routeId = routeResponse.data.routeId;
    console.log('✅ Route created successfully');
    console.log('📋 Route:', JSON.stringify(routeResponse.data, null, 2));

    // Configure API calls with API key
    const gatewayApi = axios.create({
      baseURL: GATEWAY_URL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('🚀 Testing Gateway Proxy');
    console.log('='.repeat(60));

    // Step 4: Test GET /users (proxied)
    console.log('\n4️⃣ GET /users - Test route forwarding');
    try {
      const getUsersResponse = await gatewayApi.get('/users');
      console.log('✅ Request forwarded successfully!');
      console.log('📋 Response:', JSON.stringify(getUsersResponse.data, null, 2));
      console.log(`   Status: ${getUsersResponse.status}`);
    } catch (error) {
      if (error.response) {
        console.error('❌ Error:', error.response.status, error.response.data);
      } else {
        console.error('❌ Error:', error.message);
      }
      throw error;
    }

    // Step 5: Test POST /users (proxied)
    console.log('\n5️⃣ POST /users - Test POST request forwarding');
    try {
      const postUsersResponse = await gatewayApi.post('/users', {
        name: 'John Doe',
        email: 'john@example.com'
      });
      console.log('✅ POST request forwarded successfully!');
      console.log('📋 Response:', JSON.stringify(postUsersResponse.data, null, 2));
      console.log(`   Status: ${postUsersResponse.status}`);
    } catch (error) {
      if (error.response) {
        console.error('❌ Error:', error.response.status, error.response.data);
      } else {
        console.error('❌ Error:', error.message);
      }
      throw error;
    }

    // Step 6: Test GET /users/:id (path matching)
    console.log('\n6️⃣ GET /users/123 - Test path matching with remaining path');
    try {
      const getUserResponse = await gatewayApi.get('/users/123');
      console.log('✅ Path matching works correctly!');
      console.log('📋 Response:', JSON.stringify(getUserResponse.data, null, 2));
      console.log(`   Status: ${getUserResponse.status}`);
    } catch (error) {
      if (error.response) {
        console.error('❌ Error:', error.response.status, error.response.data);
      } else {
        console.error('❌ Error:', error.message);
      }
    }

    // Step 7: Test query parameters
    console.log('\n7️⃣ GET /users?limit=10&page=1 - Test query parameters');
    try {
      const queryResponse = await gatewayApi.get('/users', {
        params: { limit: 10, page: 1 }
      });
      console.log('✅ Query parameters forwarded correctly!');
      console.log('📋 Response:', JSON.stringify(queryResponse.data, null, 2));
    } catch (error) {
      if (error.response) {
        console.error('❌ Error:', error.response.status, error.response.data);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔍 Testing Error Cases');
    console.log('='.repeat(60));

    // Step 8: Test route not found
    console.log('\n8️⃣ GET /nonexistent - Test route not found');
    try {
      await gatewayApi.get('/nonexistent');
      console.error('❌ Should have returned 404');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Route not found (expected):', error.response.data.message);
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Step 9: Test method not allowed
    console.log('\n9️⃣ PUT /users - Test method not allowed');
    try {
      await gatewayApi.put('/users', { name: 'Test' });
      console.error('❌ Should have returned 405');
    } catch (error) {
      if (error.response?.status === 405) {
        console.log('✅ Method not allowed (expected):', error.response.data.message);
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Step 10: Test without API key
    console.log('\n🔟 GET /users - Test without API key');
    try {
      await axios.get(`${GATEWAY_URL}/users`);
      console.error('❌ Should have returned 401');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Unauthorized (expected):', error.response.data.message);
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Step 11: List routes
    console.log('\n1️⃣1️⃣ GET /api/routes - List all routes');
    try {
      const routesResponse = await api.get('/api/routes');
      console.log('✅ Routes retrieved successfully!');
      console.log('📋 Routes:', JSON.stringify(routesResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
    }

    // Step 12: Delete route
    if (routeId) {
      console.log('\n1️⃣2️⃣ DELETE /api/routes/:id - Delete route');
      try {
        const deleteResponse = await api.delete(`/api/routes/${routeId}`);
        console.log('✅ Route deleted successfully!');
        console.log('📋 Response:', JSON.stringify(deleteResponse.data, null, 2));
      } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 All Gateway tests completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test suite failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data);
    } else if (error.request) {
      console.error('   Server not responding.');
      console.error('   Make sure:');
      console.error('   1. Gateway server is running on port 3000');
      console.error('   2. Target service is running on port 4000 (node test-target-service.js)');
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

testGateway();