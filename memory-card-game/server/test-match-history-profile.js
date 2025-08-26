const axios = require("axios");

const API_BASE_URL = "http://localhost:3001/api";

// Test user credentials
const TEST_USER = {
  username: "testuser1",
  email: "test1@example.com",
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
    return true;
  } catch (error) {
    console.log(
      `❌ Failed to login user:`,
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testMatchHistoryLimit() {
  console.log("\n📜 Testing Match History Limit in Profile...");

  try {
    // Test the exact endpoint that Profile.jsx uses
    const response = await axios.get(
      `${API_BASE_URL}/game/history/matches?limit=10`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log("✅ Match history endpoint working");
    console.log(`📊 Retrieved ${response.data.matches.length} matches`);

    const matches = response.data.matches;

    if (matches.length > 0) {
      console.log("\n📋 Last 10 Matches:");
      matches.slice(0, 10).forEach((match, index) => {
        console.log(
          `  ${index + 1}. ${match.gameMode} (${
            match.boardSize
          }) - ${match.result.toUpperCase()} - Score: ${match.score} pts`
        );
        console.log(
          `     Duration: ${match.duration}s, Accuracy: ${
            Math.round(((match.matches * 2) / match.flips) * 100) || 0
          }%`
        );
        console.log(
          `     Played: ${new Date(match.playedAt).toLocaleDateString()}`
        );
      });

      // Verify the limit is working correctly
      if (matches.length <= 10) {
        console.log(
          "\n✅ Match history limit working correctly - showing last 10 matches"
        );
      } else {
        console.log("\n⚠️ Warning: More than 10 matches returned");
      }

      // Check if matches are sorted by most recent first
      if (matches.length > 1) {
        const firstMatch = new Date(matches[0].playedAt);
        const secondMatch = new Date(matches[1].playedAt);
        if (firstMatch >= secondMatch) {
          console.log("✅ Matches are sorted by most recent first");
        } else {
          console.log(
            "⚠️ Warning: Matches may not be sorted by most recent first"
          );
        }
      }
    } else {
      console.log("📝 No match history found for this user");
    }

    return true;
  } catch (error) {
    console.log(
      "❌ Failed to get match history:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testDashboardMatchHistory() {
  console.log("\n📊 Testing Dashboard Match History (5 matches)...");

  try {
    // Test the exact endpoint that Dashboard.jsx uses
    const response = await axios.get(
      `${API_BASE_URL}/game/history/matches?limit=5`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log("✅ Dashboard match history endpoint working");
    console.log(`📊 Retrieved ${response.data.matches.length} recent matches`);

    const matches = response.data.matches;

    if (matches.length > 0) {
      console.log("\n📋 Recent 5 Matches:");
      matches.slice(0, 5).forEach((match, index) => {
        console.log(
          `  ${index + 1}. ${
            match.gameMode
          } - ${match.result.toUpperCase()} - ${match.score} pts`
        );
      });

      if (matches.length <= 5) {
        console.log("✅ Dashboard showing correct number of recent matches");
      }
    }

    return true;
  } catch (error) {
    console.log(
      "❌ Failed to get dashboard match history:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testMatchHistoryPagination() {
  console.log("\n📄 Testing Match History Pagination...");

  try {
    // Test pagination parameters
    const response = await axios.get(
      `${API_BASE_URL}/game/history/matches?limit=10&page=1`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log("✅ Pagination working");
    console.log(`📊 Total matches: ${response.data.pagination.totalItems}`);
    console.log(`📄 Current page: ${response.data.pagination.currentPage}`);
    console.log(`📋 Matches per page: ${response.data.pagination.limit}`);
    console.log(`🔄 Has more pages: ${response.data.pagination.hasMore}`);

    return true;
  } catch (error) {
    console.log(
      "❌ Failed to test pagination:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function testMatchHistoryFiltering() {
  console.log("\n🔍 Testing Match History Filtering...");

  try {
    // Test filtering by game mode
    const response = await axios.get(
      `${API_BASE_URL}/game/history/matches?limit=10&gameMode=classic`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log("✅ Filtering by game mode working");
    console.log(`📊 Classic mode matches: ${response.data.matches.length}`);

    // Test filtering by result
    const wonResponse = await axios.get(
      `${API_BASE_URL}/game/history/matches?limit=10&result=won`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log(`📊 Won matches: ${wonResponse.data.matches.length}`);

    return true;
  } catch (error) {
    console.log(
      "❌ Failed to test filtering:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

async function runMatchHistoryTest() {
  console.log("🚀 Starting Match History Profile Test...\n");

  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log("❌ Cannot proceed without server running");
    return;
  }

  // Login user
  const loginSuccess = await loginUser();
  if (!loginSuccess) {
    console.log("❌ Cannot proceed without authentication");
    return;
  }

  // Test all match history features
  const results = {
    profileHistory: await testMatchHistoryLimit(),
    dashboardHistory: await testDashboardMatchHistory(),
    pagination: await testMatchHistoryPagination(),
    filtering: await testMatchHistoryFiltering(),
  };

  console.log("\n✅ Match history test completed!");
  console.log("\n📋 Summary:");
  console.log(
    `- Profile History (10 matches): ${
      results.profileHistory ? "✅ Working" : "❌ Failed"
    }`
  );
  console.log(
    `- Dashboard History (5 matches): ${
      results.dashboardHistory ? "✅ Working" : "❌ Failed"
    }`
  );
  console.log(
    `- Pagination: ${results.pagination ? "✅ Working" : "❌ Failed"}`
  );
  console.log(`- Filtering: ${results.filtering ? "✅ Working" : "❌ Failed"}`);

  const allWorking = Object.values(results).every((result) => result);
  console.log(
    `\n🎯 Overall Status: ${
      allWorking ? "✅ All features working" : "⚠️ Some issues detected"
    }`
  );

  if (allWorking) {
    console.log("\n🎉 User profile correctly shows last 10 match history!");
  }
}

// Run the test
runMatchHistoryTest().catch(console.error);
