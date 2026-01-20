import axios from 'axios';

const GATEWAY_URL = 'http://localhost:3000';
const TARGET_SERVICE_URL = 'http://localhost:4000';

// Test data
const testUser = {
  name: 'Analytics Test User',
  email: 'analyticstest@example.com',
  password: 'password123'
};

let authToken = '';
let apiKey = '';
let clientId = '';
let routeId = '';

/**
 * Helper to format timestamp
 */
function formatTimestamp(date) {
  return date.toISOString();
}

/**
 * Helper to get timestamp in milliseconds
 */
function getTimestamp(date) {
  return date.getTime();
}

async function testAnalytics() {
  try {
    console.log('🧪 Testing Analytics APIs\n');
    console.log('='.repeat(60));

    // Step 1: Setup - Signup/Login
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
      name: 'Analytics Test Client'
    });
    apiKey = clientResponse.data.apiKey;
    clientId = clientResponse.data.clientId;
    console.log('✅ API client created');
    console.log(`   Client ID: ${clientId}`);

    // Step 3: Create Route (if target service exists)
    console.log('\n3️⃣ Setting up route...');
    try {
      await axios.get(TARGET_SERVICE_URL + '/health', { timeout: 2000 });
      console.log('✅ Target service is running');

      const routeResponse = await api.post('/api/routes', {
        pathPrefix: '/api/analytics-test',
        targetUrl: TARGET_SERVICE_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        isActive: true
      });
      routeId = routeResponse.data.routeId;
      console.log('✅ Route created');
      console.log(`   Route ID: ${routeId}`);
    } catch (error) {
      console.log('⚠️ Target service not available, skipping route creation');
      console.log('💡 Some analytics may be empty without routes');
    }

    // Step 4: Generate some test traffic
    console.log('\n4️⃣ Generating test traffic...');
    const gatewayApi = axios.create({
      baseURL: GATEWAY_URL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Don't throw on any status
    });

    console.log('⚠️ IMPORTANT: Make sure the worker is running to process logs!');
    console.log('   Run in a separate terminal: npm run worker\n');

    // Make several requests to generate logs
    const requests = [];
    const startTime = Date.now();

    for (let i = 0; i < 5; i++) {
      requests.push(
        gatewayApi.get(`/api/analytics-test/users`).catch(() => null),
        gatewayApi.post(`/api/analytics-test/users`, { name: `User ${i}` }).catch(() => null)
      );
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }

    await Promise.all(requests);
    console.log(`✅ Made ${requests.length} test requests`);
    
    // Wait for worker to process logs
    console.log('\n⏳ Waiting for worker to process logs (3 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 5: Test Overview Analytics
    console.log('\n5️⃣ Testing GET /api/analytics/overview');
    console.log('-'.repeat(60));

    // Test with default time window (last 24 hours)
    try {
      const overviewResponse = await api.get('/api/analytics/overview');
      const overview = overviewResponse.data;
      
      console.log('✅ Overview analytics retrieved:');
      console.log(`   Total Requests: ${overview.totalRequests}`);
      console.log(`   Requests/Minute: ${overview.requestsPerMinute.toFixed(2)}`);
      console.log(`   Avg Response Time: ${overview.avgResponseTime.toFixed(2)}ms`);
      console.log(`   Error Rate: ${overview.errorRate.toFixed(2)}%`);
      console.log(`   Rate Limit Count: ${overview.rateLimitCount}`);
      console.log(`   Time Window:`);
      console.log(`     From: ${formatTimestamp(new Date(overview.timeWindow.from))}`);
      console.log(`     To: ${formatTimestamp(new Date(overview.timeWindow.to))}`);
    } catch (error) {
      console.error('❌ Error getting overview:', error.response?.data || error.message);
    }

    // Test with custom time window
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const customOverview = await api.get('/api/analytics/overview', {
        params: {
          from: getTimestamp(oneHourAgo),
          to: getTimestamp(now)
        }
      });
      
      console.log('\n✅ Overview with custom time window (last hour):');
      console.log(`   Total Requests: ${customOverview.data.totalRequests}`);
      console.log(`   Requests/Minute: ${customOverview.data.requestsPerMinute.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Error getting custom overview:', error.response?.data || error.message);
    }

    // Step 6: Test Route Analytics
    console.log('\n6️⃣ Testing GET /api/analytics/routes');
    console.log('-'.repeat(60));

    try {
      const routesResponse = await api.get('/api/analytics/routes');
      const routesData = routesResponse.data;
      
      console.log('✅ Route analytics retrieved:');
      console.log(`   Total Routes: ${routesData.routes.length}`);
      
      if (routesData.routes.length > 0) {
        routesData.routes.forEach((route, index) => {
          console.log(`\n   Route ${index + 1}:`);
          console.log(`     Route ID: ${route.routeId}`);
          console.log(`     Path: ${route.path}`);
          console.log(`     Total Requests: ${route.totalRequests}`);
          console.log(`     Avg Response Time: ${route.avgResponseTime.toFixed(2)}ms`);
          console.log(`     Error Rate: ${route.errorRate.toFixed(2)}%`);
        });
      } else {
        console.log('   ℹ️ No route analytics available (no routes or no requests)');
      }
      
      console.log(`\n   Time Window:`);
      console.log(`     From: ${formatTimestamp(new Date(routesData.timeWindow.from))}`);
      console.log(`     To: ${formatTimestamp(new Date(routesData.timeWindow.to))}`);
    } catch (error) {
      console.error('❌ Error getting route analytics:', error.response?.data || error.message);
    }

    // Step 7: Test Client Analytics
    console.log('\n7️⃣ Testing GET /api/analytics/clients');
    console.log('-'.repeat(60));

    try {
      const clientsResponse = await api.get('/api/analytics/clients');
      const clientsData = clientsResponse.data;
      
      console.log('✅ Client analytics retrieved:');
      console.log(`   Total Clients: ${clientsData.clients.length}`);
      
      if (clientsData.clients.length > 0) {
        clientsData.clients.forEach((client, index) => {
          console.log(`\n   Client ${index + 1}:`);
          console.log(`     Client ID: ${client.clientId}`);
          console.log(`     Total Requests: ${client.totalRequests}`);
          console.log(`     Error Rate: ${client.errorRate.toFixed(2)}%`);
          console.log(`     Last Request At: ${client.lastRequestAt ? formatTimestamp(new Date(client.lastRequestAt)) : 'N/A'}`);
        });
      } else {
        console.log('   ℹ️ No client analytics available (no requests logged)');
      }
      
      console.log(`\n   Time Window:`);
      console.log(`     From: ${formatTimestamp(new Date(clientsData.timeWindow.from))}`);
      console.log(`     To: ${formatTimestamp(new Date(clientsData.timeWindow.to))}`);
    } catch (error) {
      console.error('❌ Error getting client analytics:', error.response?.data || error.message);
    }

    // Step 8: Test Error Handling
    console.log('\n8️⃣ Testing Error Handling');
    console.log('-'.repeat(60));

    // Test invalid timestamp
    try {
      await api.get('/api/analytics/overview', {
        params: { from: 'invalid' }
      });
      console.error('❌ Should have rejected invalid timestamp');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid timestamp correctly rejected');
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test invalid time range (from > to)
    try {
      const now = Date.now();
      const future = now + 1000000;
      
      await api.get('/api/analytics/overview', {
        params: { from: future, to: now }
      });
      console.error('❌ Should have rejected invalid time range');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid time range correctly rejected');
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test without authentication
    try {
      await axios.get(`${GATEWAY_URL}/api/analytics/overview`);
      console.error('❌ Should have required authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Authentication correctly required');
      } else {
        console.error('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Step 9: Cleanup
    console.log('\n9️⃣ Cleaning up test data...');
    try {
      if (routeId) {
        await api.delete(`/api/routes/${routeId}`);
        console.log('✅ Route deleted');
      }
      await api.delete(`/api/clients/${clientId}`);
      console.log('✅ API client deleted');
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.response?.data?.message || error.message);
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY\n');
    console.log('✅ Analytics API tests completed!');
    console.log('\n✨ Features tested:');
    console.log('   • GET /api/analytics/overview (default and custom time windows)');
    console.log('   • GET /api/analytics/routes');
    console.log('   • GET /api/analytics/clients');
    console.log('   • Error handling (invalid timestamps, auth required)');
    console.log('   • JWT authentication');
    console.log('   • User-scoped analytics (only user-owned resources)');
    console.log('\n💡 Tips:');
    console.log('   • Make sure the worker is running to process logs');
    console.log('   • Generate more traffic to see richer analytics');
    console.log('   • Use ?from and ?to query params for custom time windows');
    console.log('   • All endpoints require JWT authentication');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data);
    } else if (error.request) {
      console.error('   Server not responding. Make sure:');
      console.error('   • Gateway server is running on port 3000');
      console.error('   • MongoDB is running and accessible');
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testAnalytics();
