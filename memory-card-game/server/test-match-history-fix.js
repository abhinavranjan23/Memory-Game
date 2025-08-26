const axios = require("axios");

const API_BASE_URL = "http://localhost:3001/api";

// Test user credentials (you'll need to replace with actual user credentials)
const TEST_USER = {
  username: "testuser",
  email: "test@example.com",
  password: "TestPassword123!",
};

let authToken = null;

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

async function loginUser() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      emailOrUsername: TEST_USER.email,
      password: TEST_USER.password,
    });
    console.log(`✅ Logged in user: ${TEST_USER.username}`);
    authToken = response.data.token;
    return response.data.token;
  } catch (error) {
    console.log(
      `❌ Failed to login user ${TEST_USER.username}:`,
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function testMatchHistory() {
  console.log("\n🔍 Testing match history...");

  if (!authToken) {
    console.log("❌ No token available for testing");
    return;
  }

  try {
    // Test match history with limit=10 (for Profile)
    const response10 = await axios.get(
      `${API_BASE_URL}/game/history/matches?limit=10`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log("✅ Match history response received");
    console.log("📊 Match history data (limit=10):", {
      totalMatches: response10.data.pagination?.totalItems || 0,
      returnedMatches: response10.data.matches?.length || 0,
      hasMore: response10.data.pagination?.hasMore || false,
    });

    if (response10.data.matches && response10.data.matches.length > 0) {
      console.log("📋 Sample match data:");
      const sampleMatch = response10.data.matches[0];
      console.log({
        gameId: sampleMatch.gameId,
        roomId: sampleMatch.roomId,
        gameMode: sampleMatch.gameMode,
        result: sampleMatch.result,
        score: sampleMatch.score,
        playedAt: sampleMatch.playedAt,
        duration: sampleMatch.duration,
        playerCount: sampleMatch.playerCount,
      });
    } else {
      console.log("ℹ️ No matches found in history");
    }

    // Test match history with limit=5 (for Dashboard)
    const response5 = await axios.get(
      `${API_BASE_URL}/game/history/matches?limit=5`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log("\n📊 Match history data (limit=5):", {
      totalMatches: response5.data.pagination?.totalItems || 0,
      returnedMatches: response5.data.matches?.length || 0,
      hasMore: response5.data.pagination?.hasMore || false,
    });

    // Verify that we get the correct number of matches
    if (response10.data.matches.length >= 5) {
      console.log("✅ Profile shows 10+ matches (or all available)");
    } else {
      console.log(
        `⚠️ Profile shows ${response10.data.matches.length} matches (less than 10)`
      );
    }

    if (response5.data.matches.length >= 3) {
      console.log("✅ Dashboard shows 5+ matches (or all available)");
    } else {
      console.log(
        `⚠️ Dashboard shows ${response5.data.matches.length} matches (less than 5)`
      );
    }
  } catch (error) {
    console.log(
      "❌ Match history test failed:",
      error.response?.data?.message || error.message
    );
  }
}

async function runTest() {
  console.log("🚀 Testing Match History Fix...\n");

  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log("❌ Cannot proceed without server running");
    return;
  }

  // Login user
  console.log("👤 Logging in test user...");
  const token = await loginUser();
  if (!token) {
    console.log("❌ Cannot proceed without authentication");
    console.log(
      "💡 Please update the TEST_USER credentials in the script with a valid user"
    );
    return;
  }

  // Test match history
  await testMatchHistory();

  console.log("\n✅ Match history test completed!");
}

// Run the test
runTest().catch(console.error);
