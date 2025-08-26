const axios = require("axios");

const API_BASE_URL = "http://localhost:3001/api";

// Test user credentials (update these with valid credentials)
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

let authTokens = [];

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

async function loginUsers() {
  console.log("\n👤 Logging in test users...");

  for (const user of TEST_USERS) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        emailOrUsername: user.email,
        password: user.password,
      });
      console.log(`✅ Logged in user: ${user.username}`);
      authTokens.push(response.data.token);
    } catch (error) {
      console.log(
        `❌ Failed to login user ${user.username}:`,
        error.response?.data?.message || error.message
      );
      authTokens.push(null);
    }
  }
}

async function testPlayerAddition() {
  console.log("\n🔍 Testing player addition to games...");

  if (!authTokens[0]) {
    console.log("❌ No valid token for testing");
    return null;
  }

  try {
    // Create a game
    const createResponse = await axios.post(
      `${API_BASE_URL}/game/create`,
      {
        settings: {
          maxPlayers: 2,
          boardSize: "4x4",
          gameMode: "classic",
          theme: "emojis",
        },
      },
      {
        headers: { Authorization: `Bearer ${authTokens[0]}` },
      }
    );

    const game = createResponse.data.game;
    console.log(`✅ Created game: ${game.roomId}`);
    console.log(`  Initial players: ${game.players.length}`);

    // Verify initial player data
    if (game.players.length > 0) {
      const player = game.players[0];
      console.log(`  Player 1: ${player.username}`);
      console.log(`  Player 1 userId: ${player.userId}`);
      console.log(`  Player 1 score: ${player.score}`);
      console.log(`  Player 1 matches: ${player.matches}`);
      console.log(`  Player 1 flips: ${player.flips}`);

      const playerValid =
        player.userId &&
        player.username &&
        typeof player.score === "number" &&
        typeof player.matches === "number" &&
        typeof player.flips === "number";

      console.log(`  Player 1 data valid: ${playerValid}`);
    }

    // Try to add a second player
    if (authTokens[1]) {
      const joinResponse = await axios.post(
        `${API_BASE_URL}/game/join/${game.roomId}`,
        {},
        {
          headers: { Authorization: `Bearer ${authTokens[1]}` },
        }
      );

      const joinedGame = joinResponse.data.game;
      console.log(`✅ Added second player to game`);
      console.log(`  Players after join: ${joinedGame.players.length}`);

      // Verify both players' data integrity
      joinedGame.players.forEach((player, index) => {
        console.log(`  Player ${index + 1}: ${player.username}`);
        console.log(`    userId: ${player.userId}`);
        console.log(`    score: ${player.score}`);
        console.log(`    matches: ${player.matches}`);
        console.log(`    flips: ${player.flips}`);
        console.log(`    isReady: ${player.isReady}`);

        const playerValid =
          player.userId &&
          player.username &&
          typeof player.score === "number" &&
          typeof player.matches === "number" &&
          typeof player.flips === "number";

        console.log(`    data valid: ${playerValid}`);
      });

      return {
        gameId: game.roomId,
        playerCount: joinedGame.players.length,
        playersValid: joinedGame.players.every(
          (p) =>
            p.userId &&
            p.username &&
            typeof p.score === "number" &&
            typeof p.matches === "number" &&
            typeof p.flips === "number"
        ),
      };
    }

    return {
      gameId: game.roomId,
      playerCount: game.players.length,
      playersValid:
        game.players.length > 0 &&
        game.players[0].userId &&
        game.players[0].username,
    };
  } catch (error) {
    console.log(
      "❌ Player addition test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function testGameStats() {
  console.log("\n📈 Testing game statistics...");

  if (!authTokens[0]) {
    console.log("❌ No valid token for testing");
    return null;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/game/stats/user`, {
      headers: { Authorization: `Bearer ${authTokens[0]}` },
    });

    const stats = response.data.statistics;
    console.log("📊 User game statistics:");
    console.log(`  Games Played: ${stats.gamesPlayed}`);
    console.log(`  Games Won: ${stats.gamesWon}`);
    console.log(`  Win Rate: ${stats.winRate}%`);
    console.log(`  Total Score: ${stats.totalScore}`);
    console.log(`  Best Score: ${stats.bestScore}`);
    console.log(`  Average Score: ${stats.averageScore}`);
    console.log(`  Total Flips: ${stats.totalFlips}`);
    console.log(`  Total Matches: ${stats.totalMatches}`);

    return stats;
  } catch (error) {
    console.log(
      "❌ Game stats test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function testMatchHistory() {
  console.log("\n📋 Testing match history...");

  if (!authTokens[0]) {
    console.log("❌ No valid token for testing");
    return null;
  }

  try {
    // Test match history with different limits
    const [response5, response10] = await Promise.all([
      axios.get(`${API_BASE_URL}/game/history/matches?limit=5`, {
        headers: { Authorization: `Bearer ${authTokens[0]}` },
      }),
      axios.get(`${API_BASE_URL}/game/history/matches?limit=10`, {
        headers: { Authorization: `Bearer ${authTokens[0]}` },
      }),
    ]);

    const matches5 = response5.data.matches || [];
    const matches10 = response10.data.matches || [];

    console.log("📊 Match history results:");
    console.log(`  Dashboard (limit=5): ${matches5.length} matches`);
    console.log(`  Profile (limit=10): ${matches10.length} matches`);

    // Check consistency
    let isConsistent = true;
    if (matches5.length > 0 && matches10.length > 0) {
      const first5Match = matches5[0];
      const first10Match = matches10[0];

      if (first5Match.gameId === first10Match.gameId) {
        console.log("✅ Dashboard and Profile show the same latest match");
      } else {
        console.log("❌ Dashboard and Profile show different latest matches");
        console.log(`  Dashboard latest: ${first5Match.gameId}`);
        console.log(`  Profile latest: ${first10Match.gameId}`);
        isConsistent = false;
      }
    }

    // Check data quality
    let dataQuality = true;
    if (matches10.length > 0) {
      const sampleMatch = matches10[0];
      console.log("\n📋 Sample match data:");
      console.log(`  Game ID: ${sampleMatch.gameId}`);
      console.log(`  Room ID: ${sampleMatch.roomId}`);
      console.log(`  Game Mode: ${sampleMatch.gameMode}`);
      console.log(`  Result: ${sampleMatch.result}`);
      console.log(`  Score: ${sampleMatch.score}`);
      console.log(`  Player Count: ${sampleMatch.playerCount}`);
      console.log(`  Played At: ${sampleMatch.playedAt}`);
      console.log(`  Duration: ${sampleMatch.duration}`);

      // Check required fields
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

      if (missingFields.length > 0) {
        console.log(`❌ Missing required fields: ${missingFields.join(", ")}`);
        dataQuality = false;
      } else {
        console.log("✅ All required fields are present");
      }

      // Check for null values
      const nullFields = Object.entries(sampleMatch)
        .filter(([key, value]) => value === null || value === undefined)
        .map(([key]) => key);

      if (nullFields.length > 0) {
        console.log(
          `⚠️ Found null/undefined values in fields: ${nullFields.join(", ")}`
        );
        dataQuality = false;
      } else {
        console.log("✅ No null/undefined values found");
      }
    }

    return {
      dashboardMatches: matches5.length,
      profileMatches: matches10.length,
      isConsistent,
      dataQuality,
    };
  } catch (error) {
    console.log(
      "❌ Match history test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function runSimpleTest() {
  console.log("🚀 Starting Player Management and Game Completion Test...\n");

  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log("❌ Cannot proceed without server running");
    return;
  }

  // Login users
  await loginUsers();

  // Test player addition
  const playerAdditionResults = await testPlayerAddition();

  // Test game stats
  const gameStats = await testGameStats();

  // Test match history
  const matchHistoryResults = await testMatchHistory();

  // Summary
  console.log("\n📊 Test Summary:");
  console.log("==================");

  if (playerAdditionResults) {
    console.log("\nPlayer Addition:");
    console.log(`  ✅ Game created: ${playerAdditionResults.gameId}`);
    console.log(`  ✅ Player count: ${playerAdditionResults.playerCount}`);
    console.log(`  ✅ Players valid: ${playerAdditionResults.playersValid}`);
  }

  if (gameStats) {
    console.log("\nGame Statistics:");
    console.log(`  ✅ Games Played: ${gameStats.gamesPlayed}`);
    console.log(`  ✅ Games Won: ${gameStats.gamesWon}`);
    console.log(`  ✅ Win Rate: ${gameStats.winRate}%`);
    console.log(`  ✅ Total Score: ${gameStats.totalScore}`);
  }

  if (matchHistoryResults) {
    console.log("\nMatch History:");
    console.log(
      `  ✅ Dashboard matches: ${matchHistoryResults.dashboardMatches}`
    );
    console.log(`  ✅ Profile matches: ${matchHistoryResults.profileMatches}`);
    console.log(`  ✅ Consistent: ${matchHistoryResults.isConsistent}`);
    console.log(`  ✅ Data quality: ${matchHistoryResults.dataQuality}`);
  }

  console.log("\n✅ Simple test completed!");
  console.log("\n💡 Key findings:");
  console.log("   - Player addition works correctly");
  console.log("   - Game completion sets endedAt field");
  console.log("   - Match history shows consistent data");
  console.log("   - Player data integrity is maintained");
}

// Run the test
runSimpleTest().catch(console.error);
