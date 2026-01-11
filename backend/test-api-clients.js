import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  name: 'API Test User',
  email: 'apitest@example.com',
  password: 'password123'
};

let authToken = '';
let userId = '';
let createdClientId = '';

async function testApiClients() {
  try {
    console.log('🧪 Testing API Client Endpoints\n');
    console.log('='.repeat(50));

    // Step 1: Signup (if needed)
    console.log('\n1️⃣ Creating/Verifying test user...');
    try {
      const signupResponse = await axios.post(`${BASE_URL}/auth/signup`, testUser);
      console.log('✅ User created:', signupResponse.data.userId);
      userId = signupResponse.data.userId;
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ User already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Step 2: Login to get token
    console.log('\n2️⃣ Logging in to get authentication token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    authToken = loginResponse.data.token;
    userId = loginResponse.data.userId;
    console.log('✅ Login successful!');
    console.log(`   Token: ${authToken.substring(0, 50)}...`);
    console.log(`   User ID: ${userId}`);

    // Configure axios to use the token
    const api = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log('📡 Testing API Client Endpoints');
    console.log('='.repeat(50));

    // Step 3: Create API Client (POST /api/clients)
    console.log('\n3️⃣ POST /api/clients - Create API Client');
    try {
      const createResponse = await api.post('/api/clients', {
        name: 'Test API Client 1'
      });
      console.log('✅ API Client created successfully!');
      console.log('📋 Response:', JSON.stringify(createResponse.data, null, 2));
      createdClientId = createResponse.data.clientId;
      const apiKey = createResponse.data.apiKey;
      console.log(`\n🔑 IMPORTANT: Save this API Key (shown only once):`);
      console.log(`   ${apiKey}`);
    } catch (error) {
      console.error('❌ Failed to create API client:');
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Message:', error.response.data);
      } else {
        console.error('   Error:', error.message);
      }
      throw error;
    }

    // Step 4: Create another client for testing
    console.log('\n4️⃣ POST /api/clients - Create Second API Client');
    try {
      const createResponse2 = await api.post('/api/clients', {
        name: 'Test API Client 2'
      });
      console.log('✅ Second API Client created successfully!');
      console.log('📋 Response:', JSON.stringify(createResponse2.data, null, 2));
    } catch (error) {
      console.error('❌ Failed to create second API client:');
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Message:', error.response.data);
      }
      throw error;
    }

    // Step 5: Get All Clients (GET /api/clients)
    console.log('\n5️⃣ GET /api/clients - Get All API Clients');
    try {
      const getResponse = await api.get('/api/clients');
      console.log('✅ Retrieved all API clients!');
      console.log('📋 Response:', JSON.stringify(getResponse.data, null, 2));
      console.log(`\n📊 Total clients: ${getResponse.data.length}`);
    } catch (error) {
      console.error('❌ Failed to get API clients:');
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Message:', error.response.data);
      } else {
        console.error('   Error:', error.message);
      }
      throw error;
    }

    // Step 6: Revoke Client (DELETE /api/clients/:id)
    if (createdClientId) {
      console.log('\n6️⃣ DELETE /api/clients/:id - Revoke API Client');
      try {
        const deleteResponse = await api.delete(`/api/clients/${createdClientId}`);
        console.log('✅ API Client revoked successfully!');
        console.log('📋 Response:', JSON.stringify(deleteResponse.data, null, 2));
      } catch (error) {
        console.error('❌ Failed to revoke API client:');
        if (error.response) {
          console.error('   Status:', error.response.status);
          console.error('   Message:', error.response.data);
        } else {
          console.error('   Error:', error.message);
        }
        throw error;
      }

      // Step 7: Verify client is revoked (GET again)
      console.log('\n7️⃣ GET /api/clients - Verify Client Revocation');
      try {
        const getResponseAfterDelete = await api.get('/api/clients');
        console.log('✅ Retrieved updated API clients list!');
        console.log('📋 Response:', JSON.stringify(getResponseAfterDelete.data, null, 2));
        
        const revokedClient = getResponseAfterDelete.data.find(c => c._id === createdClientId);
        if (revokedClient && !revokedClient.isActive) {
          console.log('✅ Client successfully marked as inactive (revoked)');
        }
      } catch (error) {
        console.error('❌ Failed to verify revocation:');
        if (error.response) {
          console.error('   Status:', error.response.status);
          console.error('   Message:', error.response.data);
        }
      }
    }

    // Step 8: Test error cases
    console.log('\n' + '='.repeat(50));
    console.log('🔍 Testing Error Cases');
    console.log('='.repeat(50));

    // Test creating client without name
    console.log('\n8️⃣ POST /api/clients - Test validation (missing name)');
    try {
      await api.post('/api/clients', {});
      console.error('❌ Should have failed validation');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Validation error caught (expected):', error.response.data.message);
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test unauthorized access (no token)
    console.log('\n9️⃣ GET /api/clients - Test unauthorized access (no token)');
    try {
      await axios.get(`${BASE_URL}/api/clients`);
      console.error('❌ Should have failed authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Unauthorized error caught (expected):', error.response.data.message);
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test invalid client ID for deletion
    console.log('\n🔟 DELETE /api/clients/:id - Test invalid client ID');
    try {
      await api.delete('/api/clients/invalid-id-12345');
      console.error('❌ Should have failed with 404');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Not found error caught (expected):', error.response.data.message);
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All API Client endpoint tests completed!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Test suite failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data);
    } else if (error.request) {
      console.error('   Server not responding. Make sure the server is running on port 3000.');
      console.error('   Start the server with: npm start');
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

testApiClients();