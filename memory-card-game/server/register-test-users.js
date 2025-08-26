const axios = require("axios");

const API_BASE_URL = "http://localhost:3001/api";

// Test user credentials
const TEST_USERS = [
  {
    username: "testuser1",
    email: "test1@example.com",
    password: "TestPassword123!",
  },
  {
    username: "testuser2",
    email: "test2@example.com",
    password: "TestPassword123!",
  },
];

async function checkServer() {
  try {
    await axios.get("http://localhost:3001/health");
    console.log("✅ Server is running");
    return true;
  } catch (error) {
    console.log("❌ Server is not running");
    return false;
  }
}

async function registerUser(user) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      username: user.username,
      email: user.email,
      password: user.password,
    });
    console.log(`✅ Registered user: ${user.username}`);
    return response.data.token;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`⚠️ User ${user.username} already exists, trying to login...`);
      try {
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
          emailOrUsername: user.email,
          password: user.password,
        });
        console.log(`✅ Logged in existing user: ${user.username}`);
        return loginResponse.data.token;
      } catch (loginError) {
        console.log(`❌ Failed to login existing user ${user.username}:`, loginError.response?.data?.message || loginError.message);
        return null;
      }
    } else {
      console.log(`❌ Failed to register user ${user.username}:`, error.response?.data?.message || error.message);
      return null;
    }
  }
}

async function registerAllUsers() {
  console.log("🚀 Registering test users...\n");

  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log("❌ Cannot proceed without server running");
    return [];
  }

  const tokens = [];
  
  for (const user of TEST_USERS) {
    const token = await registerUser(user);
    tokens.push(token);
  }

  console.log(`\n📊 Registration Summary:`);
  console.log(`  Total users: ${TEST_USERS.length}`);
  console.log(`  Successful registrations/logins: ${tokens.filter(t => t).length}`);
  
  return tokens;
}

// Run the registration
registerAllUsers().catch(console.error);
