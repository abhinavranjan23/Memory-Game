const axios = require("axios");

const API_BASE_URL = "http://localhost:3001/api";

// Test user credentials (update these with valid credentials)
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

async function testMatchHistoryBeforeFix() {
  console.log("\n🔍 Testing match history before fix...");

  if (!authToken) {
    console.log("❌ No token available for testing");
    return;
  }

  try {
    // Test match history with different limits
    const [response5, response10] = await Promise.all([
      axios.get(`${API_BASE_URL}/game/history/matches?limit=5`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
      axios.get(`${API_BASE_URL}/game/history/matches?limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
    ]);

    console.log("✅ Match history responses received");

    const matches5 = response5.data.matches || [];
    const matches10 = response10.data.matches || [];

    console.log("📊 Match history data:");
    console.log(`  Dashboard (limit=5): ${matches5.length} matches`);
    console.log(`  Profile (limit=10): ${matches10.length} matches`);

    // Check consistency
    if (matches5.length > 0 && matches10.length > 0) {
      const first5Match = matches5[0];
      const first10Match = matches10[0];

      if (first5Match.gameId === first10Match.gameId) {
        console.log("✅ Dashboard and Profile show the same latest match");
      } else {
        console.log("❌ Dashboard and Profile show different latest matches");
        console.log(`  Dashboard latest: ${first5Match.gameId}`);
        console.log(`  Profile latest: ${first10Match.gameId}`);
      }
    }

    // Check data quality
    if (matches10.length > 0) {
      const sampleMatch = matches10[0];
      console.log("\n📋 Sample match data:");
      console.log(`  Game ID: ${sampleMatch.gameId}`);
      console.log(`  Room ID: ${sampleMatch.roomId}`);
      console.log(`  Result: ${sampleMatch.result}`);
      console.log(`  Score: ${sampleMatch.score}`);
      console.log(`  Player Count: ${sampleMatch.playerCount}`);
      console.log(`  Played At: ${sampleMatch.playedAt}`);
      console.log(`  Duration: ${sampleMatch.duration}`);
    }

    return {
      dashboardMatches: matches5.length,
      profileMatches: matches10.length,
      isConsistent:
        matches5.length > 0 &&
        matches10.length > 0 &&
        matches5[0]?.gameId === matches10[0]?.gameId,
    };
  } catch (error) {
    console.log(
      "❌ Match history test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function checkGameStats() {
  console.log("\n📈 Checking game statistics...");

  if (!authToken) {
    console.log("❌ No token available for testing");
    return;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/game/stats/user`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const stats = response.data.statistics;
    console.log("📊 User game statistics:");
    console.log(`  Games Played: ${stats.gamesPlayed}`);
    console.log(`  Games Won: ${stats.gamesWon}`);
    console.log(`  Win Rate: ${stats.winRate}%`);
    console.log(`  Total Score: ${stats.totalScore}`);
    console.log(`  Best Score: ${stats.bestScore}`);
    console.log(`  Average Score: ${stats.averageScore}`);

    return stats;
  } catch (error) {
    console.log(
      "❌ Game stats test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function runSimpleTest() {
  console.log("🚀 Starting Simple Match History Test...\n");

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
  const matchHistoryResults = await testMatchHistoryBeforeFix();

  // Check game stats
  const gameStats = await checkGameStats();

  // Summary
  console.log("\n📊 Test Summary:");
  console.log("==================");

  if (matchHistoryResults) {
    console.log("Match History:");
    console.log(
      `  ✅ Dashboard matches: ${matchHistoryResults.dashboardMatches}`
    );
    console.log(`  ✅ Profile matches: ${matchHistoryResults.profileMatches}`);

    if (matchHistoryResults.isConsistent) {
      console.log("  ✅ Dashboard and Profile are consistent");
    } else {
      console.log("  ❌ Dashboard and Profile are inconsistent");
    }
  }

  if (gameStats) {
    console.log("\nGame Statistics:");
    console.log(`  ✅ Games Played: ${gameStats.gamesPlayed}`);
    console.log(`  ✅ Games Won: ${gameStats.gamesWon}`);
    console.log(`  ✅ Win Rate: ${gameStats.winRate}%`);
  }

  console.log("\n✅ Simple test completed!");
  console.log("\n💡 To fix inconsistent games, run the server and then:");
  console.log("   1. node fix-inconsistent-games.js");
  console.log("   2. node fix-match-history-data.js");
  console.log("   3. Restart the server to apply all fixes");
}

// Run the test
runSimpleTest().catch(console.error);
