import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

async function testLogin() {
  try {
    console.log('🧪 Testing Login Endpoint\n');

    // Step 1: First, create a user (signup)
    console.log('1️⃣ Creating user via signup...');
    try {
      const signupResponse = await axios.post(`${BASE_URL}/auth/signup`, testUser);
      console.log('✅ Signup successful:', signupResponse.data);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️ User already exists, continuing to login...');
      } else {
        throw error;
      }
    }

    console.log('\n2️⃣ Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    console.log('✅ Login successful!');
    console.log('📋 Response:', JSON.stringify(loginResponse.data, null, 2));
    console.log('\n🎉 Login test passed!');
    console.log('\n💡 You can use this token for authenticated requests:');
    console.log(`   Authorization: Bearer ${loginResponse.data.token}`);

  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data);
    } else if (error.request) {
      console.error('   Server not responding. Make sure the server is running on port 3000.');
    } else {
      console.error('   Error:', error.message);
    }
    process.exit(1);
  }
}

testLogin();