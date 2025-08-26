const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'privacy_test_user',
  email: 'privacy@test.com',
  password: 'testpassword123'
};

let authToken = null;
let userId = null;

// Helper function to make authenticated requests
const makeAuthRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    data
  };
  return axios(config);
};

// Test functions
const testUserRegistration = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, TEST_USER);
    authToken = response.data.token;
    userId = response.data.user.id;
    return true;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
      return await testUserLogin();
    }
    console.error('❌ Registration failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testUserLogin = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    authToken = response.data.token;
    userId = response.data.user.id;
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testPrivacySettingsUpdate = async () => {
  try {
    const privacySettings = {
      showInLeaderboards: false,
      allowFriendRequests: true,
      showOnlineStatus: false
    };

    const response = await makeAuthRequest('PATCH', '/auth/profile', { privacySettings });
    
    if (response.data.user.privacySettings.showInLeaderboards === false) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('❌ Privacy settings update failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testLeaderboardPrivacy = async () => {
  try {
    // First, check if user appears in leaderboard with showInLeaderboards: false
    const leaderboardResponse = await axios.get(`${BASE_URL}/game/leaderboard/global`);
    const leaderboards = leaderboardResponse.data.leaderboards;
    
    const userInLeaderboard = Object.values(leaderboards).some(leaderboard => 
      leaderboard.some(player => player.username === TEST_USER.username)
    );

    if (!userInLeaderboard) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('❌ Leaderboard privacy test failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testProfilePrivacy = async () => {
  try {
    // Try to access the user's public profile
    const response = await axios.get(`${BASE_URL}/user/${userId}/profile`);
    
    if (response.status === 404) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      return true;
    } else {
      console.error('❌ Profile privacy test failed:', error.response?.data?.message || error.message);
      return false;
    }
  }
};

const testPrivacySettingsToggle = async () => {
  try {
    // Toggle showInLeaderboards back to true
    const privacySettings = {
      showInLeaderboards: true,
      allowFriendRequests: true,
      showOnlineStatus: true
    };

    const response = await makeAuthRequest('PATCH', '/auth/profile', { privacySettings });
    
    if (response.data.user.privacySettings.showInLeaderboards === true) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('❌ Privacy settings toggle failed:', error.response?.data?.message || error.message);
    return false;
  }
};

const testProfileAccessAfterToggle = async () => {
  try {
    // Wait a moment for the database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to access the user's public profile again
    const response = await axios.get(`${BASE_URL}/user/${userId}/profile`);
    
    if (response.status === 200) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('❌ Profile access test failed:', error.response?.data?.message || error.message);
    return false;
  }
};

// Main test runner
const runPrivacyTests = async () => {
  const tests = [
    { name: 'User Registration/Login', test: testUserRegistration },
    { name: 'Privacy Settings Update', test: testPrivacySettingsUpdate },
    { name: 'Leaderboard Privacy', test: testLeaderboardPrivacy },
    { name: 'Profile Privacy', test: testProfilePrivacy },
    { name: 'Privacy Settings Toggle', test: testPrivacySettingsToggle },
    { name: 'Profile Access After Toggle', test: testProfileAccessAfterToggle }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const { name, test } of tests) {
    const result = await test();
    if (result) {
      passedTests++;
    }
    }

  if (passedTests === totalTests) {
    } else {
    }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runPrivacyTests().catch(console.error);
}

module.exports = { runPrivacyTests };
