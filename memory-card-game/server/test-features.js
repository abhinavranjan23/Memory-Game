const axios = require("axios");

const API_BASE_URL = "http://localhost:3001/api";

async function testFeatures() {
  console.log("🧪 Testing Memory Card Game Features...\n");

  try {
    // Test 1: Email/Username Login Feature
    console.log("1. Testing Email/Username Login Feature...");

    // Register a test user
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      username: "testuser123",
      email: "test@example.com",
      password: "TestPass123!",
    });

    console.log("✅ User registration successful");

    // Test login with email
    const emailLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      emailOrUsername: "test@example.com",
      password: "TestPass123!",
    });

    console.log("✅ Email login successful");

    // Test login with username
    const usernameLoginResponse = await axios.post(
      `${API_BASE_URL}/auth/login`,
      {
        emailOrUsername: "testuser123",
        password: "TestPass123!",
      }
    );

    console.log("✅ Username login successful");

    // Test 2: Username Validation
    console.log("\n2. Testing Username Validation...");

    // Test username availability check
    const usernameCheckResponse = await axios.get(
      `${API_BASE_URL}/auth/check-username/testuser456`
    );
    console.log("✅ Username availability check working");

    // Test 3: Create Room Feature
    console.log("\n3. Testing Create Room Feature...");

    const token = emailLoginResponse.data.token;
    const createRoomResponse = await axios.post(
      `${API_BASE_URL}/game/create`,
      {
        isPrivate: false,
        settings: {
          maxPlayers: 2,
          boardSize: "4x4",
          gameMode: "classic",
          theme: "emojis",
          powerUpsEnabled: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("✅ Room creation successful");
    console.log("   Room ID:", createRoomResponse.data.game.roomId);

    // Test 4: Privacy Settings
    console.log("\n4. Testing Privacy Settings...");

    const updateProfileResponse = await axios.patch(
      `${API_BASE_URL}/auth/profile`,
      {
        privacySettings: {
          showInLeaderboards: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("✅ Privacy settings update successful");

    // Test 5: Leaderboard Privacy
    console.log("\n5. Testing Leaderboard Privacy...");

    const leaderboardResponse = await axios.get(
      `${API_BASE_URL}/game/leaderboard/global`
    );
    console.log("✅ Leaderboard access successful");

    console.log("\n🎉 All core features are working!");
  } catch (error) {
    console.error(
      "❌ Test failed:",
      error.response?.data?.message || error.message
    );

    if (error.response?.status === 401) {
      console.log(
        "💡 Make sure the server is running and authentication is working"
      );
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get("http://localhost:3001/health");
    console.log("✅ Server is running");
    return true;
  } catch (error) {
    console.log("❌ Server is not running. Please start the server first.");
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testFeatures();
  }
}

main();
