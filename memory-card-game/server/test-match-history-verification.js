const axios = require("axios");
const { Game } = require("./src/models/Game.js");
const { User } = require("./src/models/User.js");

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

async function testMatchHistoryConsistency() {
  console.log("\n🔍 Testing match history consistency...");

  if (!authToken) {
    console.log("❌ No token available for testing");
    return;
  }

  try {
    // Test match history with different limits
    const [response5, response10, response20] = await Promise.all([
      axios.get(`${API_BASE_URL}/game/history/matches?limit=5`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
      axios.get(`${API_BASE_URL}/game/history/matches?limit=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
      axios.get(`${API_BASE_URL}/game/history/matches?limit=20`, {
        headers: { Authorization: `Bearer ${authToken}` },
      }),
    ]);

    console.log("✅ All match history responses received");

    const matches5 = response5.data.matches || [];
    const matches10 = response10.data.matches || [];
    const matches20 = response20.data.matches || [];

    console.log("📊 Match history data:");
    console.log(`  Dashboard (limit=5): ${matches5.length} matches`);
    console.log(`  Profile (limit=10): ${matches10.length} matches`);
    console.log(`  Extended (limit=20): ${matches20.length} matches`);

    // Check consistency between different limits
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

    // Check if matches are properly sorted (most recent first)
    if (matches10.length > 1) {
      const isProperlySorted = matches10.every((match, index) => {
        if (index === 0) return true;
        const currentDate = new Date(match.playedAt);
        const previousDate = new Date(matches10[index - 1].playedAt);
        return currentDate <= previousDate;
      });

      if (isProperlySorted) {
        console.log(
          "✅ Matches are properly sorted by date (most recent first)"
        );
      } else {
        console.log("❌ Matches are not properly sorted by date");
      }
    }

    // Check data consistency
    if (matches10.length > 0) {
      const sampleMatch = matches10[0];
      console.log("\n📋 Sample match data validation:");

      const requiredFields = [
        "gameId",
        "roomId",
        "gameMode",
        "result",
        "score",
        "playedAt",
      ];
      const missingFields = requiredFields.filter(
        (field) => !sampleMatch[field]
      );

      if (missingFields.length === 0) {
        console.log("✅ All required fields are present");
      } else {
        console.log(`❌ Missing required fields: ${missingFields.join(", ")}`);
      }

      // Check for null/undefined values
      const nullFields = Object.entries(sampleMatch)
        .filter(([key, value]) => value === null || value === undefined)
        .map(([key]) => key);

      if (nullFields.length === 0) {
        console.log("✅ No null/undefined values found");
      } else {
        console.log(
          `⚠️ Found null/undefined values in fields: ${nullFields.join(", ")}`
        );
      }

      // Validate result field
      if (["won", "lost"].includes(sampleMatch.result)) {
        console.log("✅ Result field has valid value");
      } else {
        console.log(`❌ Invalid result value: ${sampleMatch.result}`);
      }

      // Validate score field
      if (typeof sampleMatch.score === "number" && sampleMatch.score >= 0) {
        console.log("✅ Score field has valid value");
      } else {
        console.log(`❌ Invalid score value: ${sampleMatch.score}`);
      }
    }

    // Test pagination
    if (response10.data.pagination) {
      const pagination = response10.data.pagination;
      console.log("\n📄 Pagination validation:");
      console.log(`  Current page: ${pagination.currentPage}`);
      console.log(`  Limit: ${pagination.limit}`);
      console.log(`  Total items: ${pagination.totalItems}`);
      console.log(`  Has more: ${pagination.hasMore}`);

      if (pagination.totalItems >= matches10.length) {
        console.log("✅ Pagination total matches returned count");
      } else {
        console.log("❌ Pagination total is less than returned matches");
      }
    }
  } catch (error) {
    console.log(
      "❌ Match history consistency test failed:",
      error.response?.data?.message || error.message
    );
  }
}

async function testDatabaseConsistency() {
  console.log("\n🗄️ Testing database consistency...");

  try {
    // Get user ID from token (you might need to decode the JWT or get it from the user endpoint)
    const userResponse = await axios.get(`${API_BASE_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const userId = userResponse.data.user.id;
    console.log(`User ID: ${userId}`);

    // Check all games for this user
    const allUserGames = await Game.find({
      "players.userId": userId.toString(),
    }).select(
      "roomId gameState.status status createdAt updatedAt endedAt players"
    );

    console.log(`📊 Total games in database for user: ${allUserGames.length}`);

    // Categorize games by status
    const gameStatuses = {};
    allUserGames.forEach((game) => {
      const status = `${game.gameState.status}/${game.status}`;
      gameStatuses[status] = (gameStatuses[status] || 0) + 1;
    });

    console.log("📋 Games by status:");
    Object.entries(gameStatuses).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Check for games with endedAt field
    const gamesWithEndedAt = allUserGames.filter((game) => game.endedAt);
    console.log(`📊 Games with endedAt field: ${gamesWithEndedAt.length}`);

    // Check for completed games without endedAt
    const completedWithoutEndedAt = allUserGames.filter(
      (game) =>
        (game.gameState.status === "finished" || game.status === "completed") &&
        !game.endedAt
    );

    if (completedWithoutEndedAt.length > 0) {
      console.log(
        `⚠️ Found ${completedWithoutEndedAt.length} completed games without endedAt field`
      );
      completedWithoutEndedAt.slice(0, 3).forEach((game) => {
        console.log(
          `  - ${game.roomId}: ${game.gameState.status}/${game.status}`
        );
      });
    } else {
      console.log("✅ All completed games have endedAt field");
    }

    // Check for games that should be in match history
    const shouldBeInHistory = allUserGames.filter((game) => {
      return (
        game.endedAt ||
        game.gameState.winner ||
        game.gameState.status === "finished" ||
        game.status === "completed" ||
        (game.gameState.status !== "waiting" &&
          game.status !== "starting" &&
          game.updatedAt < new Date(Date.now() - 5 * 60 * 1000))
      );
    });

    console.log(
      `📊 Games that should be in match history: ${shouldBeInHistory.length}`
    );
  } catch (error) {
    console.log(
      "❌ Database consistency test failed:",
      error.response?.data?.message || error.message
    );
  }
}

async function runVerificationTest() {
  console.log("🚀 Starting Match History Verification Test...\n");

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

  // Run tests
  await testMatchHistoryConsistency();
  await testDatabaseConsistency();

  console.log("\n✅ Match history verification test completed!");
}

// Run the test
runVerificationTest().catch(console.error);
