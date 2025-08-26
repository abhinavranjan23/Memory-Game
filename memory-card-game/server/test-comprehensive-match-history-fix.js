const axios = require("axios");
const { Game } = require("./src/models/Game.js");
const mongoose = require("mongoose");

const API_BASE_URL = "http://localhost:3001/api";

// MongoDB connection string
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://abhinav:yP2i3MrJ9vZjB8Ff@cluster0.en1oo.mongodb.net/memory_game?retryWrites=true&w=majority&appName=Cluster0";

// Test user credentials (update these with valid credentials)
const TEST_USER = {
  username: "testuser",
  email: "test@example.com",
  password: "TestPassword123!",
};

let authToken = null;

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

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

async function testDatabaseIntegrity() {
  console.log("\n🗄️ Testing database integrity...");

  try {
    // Check for games with various issues
    const totalGames = await Game.countDocuments({});
    const completedGames = await Game.countDocuments({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
    });

    const gamesWithEmptyPlayers = await Game.countDocuments({
      $or: [
        { players: { $exists: false } },
        { players: null },
        { players: { $size: 0 } },
      ],
    });

    const gamesWithoutEndedAt = await Game.countDocuments({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      $or: [{ endedAt: { $exists: false } }, { endedAt: null }],
    });

    const gamesWithInvalidPlayers = await Game.countDocuments({
      players: {
        $elemMatch: {
          $or: [
            { userId: { $exists: false } },
            { userId: null },
            { username: { $exists: false } },
            { username: null },
          ],
        },
      },
    });

    console.log("📊 Database integrity check:");
    console.log(`  Total games: ${totalGames}`);
    console.log(`  Completed games: ${completedGames}`);
    console.log(`  Games with empty players: ${gamesWithEmptyPlayers}`);
    console.log(`  Completed games without endedAt: ${gamesWithoutEndedAt}`);
    console.log(`  Games with invalid players: ${gamesWithInvalidPlayers}`);

    // Check for specific issues
    if (gamesWithEmptyPlayers > 0) {
      console.log("⚠️ Found games with empty player arrays");
      const emptyPlayerGames = await Game.find({
        $or: [
          { players: { $exists: false } },
          { players: null },
          { players: { $size: 0 } },
        ],
      }).limit(5);

      console.log("📋 Sample games with empty players:");
      emptyPlayerGames.forEach((game, index) => {
        console.log(
          `  ${index + 1}. ${game.roomId}: ${game.gameState.status}/${
            game.status
          }`
        );
      });
    }

    if (gamesWithoutEndedAt > 0) {
      console.log("⚠️ Found completed games without endedAt field");
    }

    if (gamesWithInvalidPlayers > 0) {
      console.log("⚠️ Found games with invalid player data");
    }

    return {
      totalGames,
      completedGames,
      gamesWithEmptyPlayers,
      gamesWithoutEndedAt,
      gamesWithInvalidPlayers,
    };
  } catch (error) {
    console.error("❌ Database integrity test failed:", error);
    return null;
  }
}

async function testMatchHistoryAPI() {
  console.log("\n🔍 Testing match history API...");

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

    console.log("✅ Match history API responses received");

    const matches5 = response5.data.matches || [];
    const matches10 = response10.data.matches || [];

    console.log("📊 Match history API results:");
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
      console.log("\n📋 Sample match data quality:");

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

      // Check for null values
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

      // Check player count consistency
      if (sampleMatch.playerCount >= 1) {
        console.log("✅ Player count is valid");
      } else {
        console.log(`❌ Invalid player count: ${sampleMatch.playerCount}`);
      }
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
      "❌ Match history API test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function runComprehensiveTest() {
  console.log("🚀 Starting Comprehensive Match History Fix Test...\n");

  // Connect to database
  await connectToDatabase();

  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log("❌ Cannot proceed without server running");
    return;
  }

  // Test database integrity
  const integrityResults = await testDatabaseIntegrity();

  // Login user
  console.log("\n👤 Logging in test user...");
  const token = await loginUser();
  if (!token) {
    console.log("❌ Cannot proceed without authentication");
    console.log(
      "💡 Please update the TEST_USER credentials in the script with a valid user"
    );
    return;
  }

  // Test match history API
  const apiResults = await testMatchHistoryAPI();

  // Summary
  console.log("\n📊 Test Summary:");
  console.log("==================");

  if (integrityResults) {
    console.log("Database Integrity:");
    console.log(`  ✅ Total games: ${integrityResults.totalGames}`);
    console.log(`  ✅ Completed games: ${integrityResults.completedGames}`);

    if (integrityResults.gamesWithEmptyPlayers === 0) {
      console.log("  ✅ No games with empty players");
    } else {
      console.log(
        `  ⚠️ Games with empty players: ${integrityResults.gamesWithEmptyPlayers}`
      );
    }

    if (integrityResults.gamesWithoutEndedAt === 0) {
      console.log("  ✅ All completed games have endedAt");
    } else {
      console.log(
        `  ⚠️ Completed games without endedAt: ${integrityResults.gamesWithoutEndedAt}`
      );
    }

    if (integrityResults.gamesWithInvalidPlayers === 0) {
      console.log("  ✅ No games with invalid players");
    } else {
      console.log(
        `  ⚠️ Games with invalid players: ${integrityResults.gamesWithInvalidPlayers}`
      );
    }
  }

  if (apiResults) {
    console.log("\nAPI Results:");
    console.log(`  ✅ Dashboard matches: ${apiResults.dashboardMatches}`);
    console.log(`  ✅ Profile matches: ${apiResults.profileMatches}`);

    if (apiResults.isConsistent) {
      console.log("  ✅ Dashboard and Profile are consistent");
    } else {
      console.log("  ❌ Dashboard and Profile are inconsistent");
    }
  }

  console.log("\n✅ Comprehensive test completed!");

  // Close database connection
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
}

// Run the test
runComprehensiveTest().catch(console.error);
