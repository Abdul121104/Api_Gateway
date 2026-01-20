import axios from 'axios';
import mongoose from 'mongoose';
import RequestLog from './models/RequestLog.js';
import { ENV } from './config/env.js';

const GATEWAY_URL = 'http://localhost:3000';
const TARGET_SERVICE_URL = 'http://localhost:4000';

// Test data
const testUser = {
  name: 'Logging Test User',
  email: 'loggingtest@example.com',
  password: 'password123'
};

let authToken = '';
let apiKey = '';
let clientId = '';
let routeId = '';

/**
 * Connect to MongoDB for checking logs
 */
async function connectDB() {
  try {
    await mongoose.connect(ENV.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
}

/**
 * Wait for worker to process logs
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clean up old test logs
 */
async function cleanupOldLogs() {
  try {
    // Delete logs from our test client (if we know the clientId)
    if (clientId) {
      const result = await RequestLog.deleteMany({ clientId });
      console.log(`🧹 Cleaned up ${result.deletedCount} old test logs`);
    }
  } catch (error) {
    console.error('⚠️ Cleanup warning:', error.message);
  }
}

/**
 * Check if logs were created in MongoDB
 */
async function verifyLogs(expectCount, testName) {
  console.log(`\n🔍 Verifying logs for: ${testName}`);
  
  // Wait a bit for worker to process (BullMQ might take a moment)
  console.log('⏳ Waiting for worker to process logs...');
  await wait(3000); // Wait 3 seconds

  try {
    const logs = await RequestLog.find({ clientId }).sort({ createdAt: -1 }).limit(100);
    console.log(`📊 Found ${logs.length} log(s) in MongoDB`);

    if (logs.length < expectCount) {
      console.warn(`⚠️ Expected at least ${expectCount} log(s), but found ${logs.length}`);
      console.log('💡 Make sure the worker is running: npm run worker');
      return false;
    }

    // Check the most recent logs
    const recentLogs = logs.slice(0, expectCount);
    console.log('\n📝 Recent logs:');
    recentLogs.forEach((log, index) => {
      console.log(`\n  Log ${index + 1}:`);
      console.log(`    Method: ${log.method}`);
      console.log(`    Path: ${log.path}`);
      console.log(`    Status: ${log.statusCode}`);
      console.log(`    Response Time: ${log.responseTime}ms`);
      console.log(`    Client ID: ${log.clientId}`);
      console.log(`    Route ID: ${log.routeId || 'N/A'}`);
      console.log(`    IP: ${log.ip || 'N/A'}`);
      console.log(`    User Agent: ${log.userAgent ? log.userAgent.substring(0, 50) + '...' : 'N/A'}`);
      console.log(`    Created At: ${log.createdAt}`);
    });

    // Verify log data
    let allValid = true;
    recentLogs.forEach((log, index) => {
      if (!log.method || !log.path || !log.statusCode || !log.responseTime) {
        console.error(`❌ Log ${index + 1} is missing required fields`);
        allValid = false;
      }
      if (log.clientId?.toString() !== clientId) {
        console.error(`❌ Log ${index + 1} has incorrect clientId`);
        allValid = false;
      }
      if (log.responseTime < 0 || log.responseTime > 60000) {
        console.warn(`⚠️ Log ${index + 1} has suspicious response time: ${log.responseTime}ms`);
      }
    });

    return allValid;

  } catch (error) {
    console.error('❌ Error checking logs:', error.message);
    return false;
  }
}

async function testAsyncLogging() {
  try {
    console.log('🧪 Testing Async Request Logging with BullMQ\n');
    console.log('='.repeat(60));

    // Connect to MongoDB
    console.log('\n1️⃣ Connecting to MongoDB...');
    await connectDB();

    // Setup: Signup/Login
    console.log('\n2️⃣ Setting up test user...');
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

    // Create API Client
    console.log('\n3️⃣ Creating API client...');
    const clientResponse = await api.post('/api/clients', {
      name: 'Logging Test Client'
    });
    apiKey = clientResponse.data.apiKey;
    clientId = clientResponse.data.clientId;
    console.log('✅ API client created');
    console.log(`   Client ID: ${clientId}`);
    console.log(`   API Key: ${apiKey.substring(0, 20)}...`);

    // Clean up old logs from previous runs
    console.log('\n4️⃣ Cleaning up old test logs...');
    await cleanupOldLogs();

    // Create Route (if target service exists)
    console.log('\n5️⃣ Setting up route...');
    try {
      // Check if target service is running
      await axios.get(TARGET_SERVICE_URL + '/health', { timeout: 2000 });
      console.log('✅ Target service is running');

      const routeResponse = await api.post('/api/routes', {
        pathPrefix: '/api/test',
        targetUrl: TARGET_SERVICE_URL,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        isActive: true
      });
      routeId = routeResponse.data.routeId;
      console.log('✅ Route created');
      console.log(`   Route ID: ${routeId}`);
      console.log(`   Path Prefix: /api/test`);
      console.log(`   Target URL: ${TARGET_SERVICE_URL}`);
    } catch (error) {
      console.log('⚠️ Target service not available, skipping route creation');
      console.log('💡 To fully test logging, start the target service on port 4000');
    }

    // Make requests through gateway
    console.log('\n6️⃣ Making requests through gateway...');
    console.log('⚠️ IMPORTANT: Make sure the worker is running!');
    console.log('   Run in a separate terminal: npm run worker\n');

    const gatewayApi = axios.create({
      baseURL: GATEWAY_URL,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true // Don't throw on any status
    });

    let requestCount = 0;

    // Test 1: GET request (200 OK or 404 if route doesn't exist)
    console.log('📤 Request 1: GET /api/test/users');
    requestCount++;
    const startTime1 = Date.now();
    try {
      const res1 = await gatewayApi.get('/api/test/users');
      const responseTime1 = Date.now() - startTime1;
      console.log(`   ✅ Response: ${res1.status} (${responseTime1}ms)`);
    } catch (error) {
      console.log(`   ⚠️ Error: ${error.message}`);
    }

    await wait(500); // Small delay between requests

    // Test 2: POST request
    console.log('\n📤 Request 2: POST /api/test/users');
    requestCount++;
    const startTime2 = Date.now();
    try {
      const res2 = await gatewayApi.post('/api/test/users', {
        name: 'Test User',
        email: 'test@example.com'
      });
      const responseTime2 = Date.now() - startTime2;
      console.log(`   ✅ Response: ${res2.status} (${responseTime2}ms)`);
    } catch (error) {
      console.log(`   ⚠️ Error: ${error.message}`);
    }

    await wait(500);

    // Test 3: GET request with query params
    console.log('\n📤 Request 3: GET /api/test/users?page=1&limit=10');
    requestCount++;
    const startTime3 = Date.now();
    try {
      const res3 = await gatewayApi.get('/api/test/users?page=1&limit=10');
      const responseTime3 = Date.now() - startTime3;
      console.log(`   ✅ Response: ${res3.status} (${responseTime3}ms)`);
    } catch (error) {
      console.log(`   ⚠️ Error: ${error.message}`);
    }

    await wait(500);

    // Test 4: 404 request (route not found)
    console.log('\n📤 Request 4: GET /api/nonexistent');
    requestCount++;
    const startTime4 = Date.now();
    try {
      const res4 = await gatewayApi.get('/api/nonexistent');
      const responseTime4 = Date.now() - startTime4;
      console.log(`   ✅ Response: ${res4.status} (${responseTime4}ms)`);
      console.log(`   ℹ️ Note: 404 responses are still logged`);
    } catch (error) {
      console.log(`   ⚠️ Error: ${error.message}`);
    }

    console.log(`\n✅ Made ${requestCount} requests through gateway`);

    // Verify logs were created
    console.log('\n7️⃣ Verifying logs in MongoDB...');
    const logsValid = await verifyLogs(requestCount, 'All gateway requests');

    // Additional checks
    console.log('\n8️⃣ Running additional checks...');
    
    // Check log indexes
    const indexInfo = await RequestLog.collection.getIndexes();
    console.log('✅ Log indexes:', Object.keys(indexInfo).join(', '));

    // Check for logs with routeId (if route was created)
    if (routeId) {
      const logsWithRoute = await RequestLog.countDocuments({ routeId });
      console.log(`✅ Logs with routeId: ${logsWithRoute}`);
    }

    // Check response time distribution
    const logs = await RequestLog.find({ clientId }).sort({ createdAt: -1 }).limit(10);
    if (logs.length > 0) {
      const avgResponseTime = logs.reduce((sum, log) => sum + log.responseTime, 0) / logs.length;
      console.log(`✅ Average response time: ${avgResponseTime.toFixed(2)}ms`);
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY\n');
    
    if (logsValid) {
      console.log('✅ All tests passed!');
      console.log('\n✨ Async logging is working correctly:');
      console.log('   • Requests are being logged to BullMQ queue');
      console.log('   • Worker is processing jobs from the queue');
      console.log('   • Logs are being saved to MongoDB');
      console.log('   • Log data is accurate and complete');
    } else {
      console.log('⚠️ Some tests had issues');
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Make sure the worker is running: npm run worker');
      console.log('   2. Check Redis is running and accessible');
      console.log('   3. Check MongoDB is running and accessible');
      console.log('   4. Check worker logs for errors');
    }

    // Cleanup
    console.log('\n9️⃣ Cleaning up test data...');
    try {
      if (routeId) {
        await api.delete(`/api/routes/${routeId}`);
        console.log('✅ Route deleted');
      }
      await api.delete(`/api/clients/${clientId}`);
      console.log('✅ API client deleted');
      
      // Optionally delete logs
      const deleteLogs = process.env.DELETE_TEST_LOGS === 'true';
      if (deleteLogs) {
        await RequestLog.deleteMany({ clientId });
        console.log('✅ Test logs deleted');
      } else {
        console.log('ℹ️ Test logs kept (set DELETE_TEST_LOGS=true to auto-delete)');
      }
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    }

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data);
    } else if (error.request) {
      console.error('   Server not responding. Make sure:');
      console.error('   • Gateway server is running on port 3000');
      console.error('   • MongoDB is running and accessible');
      console.error('   • Redis is running and accessible');
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testAsyncLogging();
