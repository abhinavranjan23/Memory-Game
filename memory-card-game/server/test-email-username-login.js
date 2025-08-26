const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testEmailUsernameLogin() {
  try {
    // Test 1: Register a new user
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'password123'
    });
    // Test 2: Login with email
    const emailLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      emailOrUsername: 'test@example.com',
      password: 'password123'
    });
    // Test 3: Login with username
    const usernameLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      emailOrUsername: 'testuser123',
      password: 'password123'
    });
    // Test 4: Test invalid email/username
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        emailOrUsername: 'nonexistent@example.com',
        password: 'password123'
      });
      } catch (error) {
      if (error.response?.status === 401) {
        } else {
        }
    }

    // Test 5: Test invalid password
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        emailOrUsername: 'testuser123',
        password: 'wrongpassword'
      });
      } catch (error) {
      if (error.response?.status === 401) {
        } else {
        }
    }

    // Test 6: Test missing fields
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        emailOrUsername: 'testuser123'
        // missing password
      });
      } catch (error) {
      if (error.response?.status === 400) {
        } else {
        }
    }

    } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testEmailUsernameLogin();
