const axios = require("axios");
const { Game } = require("./src/models/Game.js");
const { User } = require("./src/models/User.js");
const mongoose = require("mongoose");

const API_BASE_URL = "http://localhost:3001/api";

// MongoDB connection string
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://abhinav:yP2i3MrJ9vZjB8Ff@cluster0.en1oo.mongodb.net/memory_game?retryWrites=true&w=majority&appName=Cluster0";

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
      console.log(`  Player 1: ${joinedGame.players[0].username}`);
      console.log(`  Player 2: ${joinedGame.players[1].username}`);

      // Verify player data integrity
      const player1 = joinedGame.players[0];
      const player2 = joinedGame.players[1];

      const player1Valid =
        player1.userId &&
        player1.username &&
        typeof player1.score === "number" &&
        typeof player1.matches === "number" &&
        typeof player1.flips === "number";

      const player2Valid =
        player2.userId &&
        player2.username &&
        typeof player2.score === "number" &&
        typeof player2.matches === "number" &&
        typeof player2.flips === "number";

      console.log(`  Player 1 data valid: ${player1Valid}`);
      console.log(`  Player 2 data valid: ${player2Valid}`);

      return {
        gameId: game.roomId,
        playerCount: joinedGame.players.length,
        playersValid: player1Valid && player2Valid,
      };
    }

    return {
      gameId: game.roomId,
      playerCount: game.players.length,
      playersValid: true,
    };
  } catch (error) {
    console.log(
      "❌ Player addition test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function testGameCompletion() {
  console.log("\n🎮 Testing game completion logic...");

  try {
    // Find a completed game in the database
    const completedGame = await Game.findOne({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      endedAt: { $exists: true, $ne: null },
      players: { $exists: true, $ne: null, $ne: [] },
    }).sort({ endedAt: -1 });

    if (!completedGame) {
      console.log("❌ No completed games found for testing");
      return null;
    }

    console.log(`✅ Found completed game: ${completedGame.roomId}`);
    console.log(
      `  Game status: ${completedGame.gameState.status}/${completedGame.status}`
    );
    console.log(`  Started at: ${completedGame.startedAt}`);
    console.log(`  Ended at: ${completedGame.endedAt}`);
    console.log(`  Player count: ${completedGame.players.length}`);

    // Verify endedAt field
    const hasEndedAt =
      completedGame.endedAt && completedGame.endedAt instanceof Date;
    console.log(`  Has endedAt field: ${hasEndedAt}`);

    // Verify game duration
    let duration = null;
    if (completedGame.startedAt && completedGame.endedAt) {
      duration = Math.round(
        (completedGame.endedAt - completedGame.startedAt) / 1000
      );
      console.log(`  Game duration: ${duration} seconds`);
    }

    // Verify player data after completion
    const playersValid = completedGame.players.every(
      (player) =>
        player.userId &&
        player.username &&
        typeof player.score === "number" &&
        typeof player.matches === "number" &&
        typeof player.flips === "number"
    );

    console.log(`  All players have valid data: ${playersValid}`);

    // Check for winner determination
    const hasWinner =
      completedGame.gameState.winner ||
      completedGame.players.some((p) => p.score > 0);
    console.log(`  Has winner determination: ${hasWinner}`);

    // Display player final stats
    console.log("\n📊 Final player statistics:");
    completedGame.players.forEach((player, index) => {
      console.log(`  Player ${index + 1}: ${player.username}`);
      console.log(`    Score: ${player.score}`);
      console.log(`    Matches: ${player.matches}`);
      console.log(`    Flips: ${player.flips}`);
      console.log(
        `    Accuracy: ${
          player.flips > 0
            ? Math.round(((player.matches * 2) / player.flips) * 100)
            : 0
        }%`
      );
    });

    return {
      gameId: completedGame.roomId,
      hasEndedAt,
      duration,
      playersValid,
      hasWinner,
      playerCount: completedGame.players.length,
    };
  } catch (error) {
    console.error("❌ Game completion test failed:", error);
    return null;
  }
}

async function testInconsistentGames() {
  console.log("\n🔧 Testing for inconsistent games...");

  try {
    // Find games with various issues
    const gamesWithEmptyPlayers = await Game.find({
      $or: [
        { players: { $exists: false } },
        { players: null },
        { players: { $size: 0 } },
      ],
    });

    const gamesWithoutEndedAt = await Game.find({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      $or: [{ endedAt: { $exists: false } }, { endedAt: null }],
    });

    const gamesWithInvalidPlayers = await Game.find({
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

    console.log("📊 Inconsistent games found:");
    console.log(`  Games with empty players: ${gamesWithEmptyPlayers.length}`);
    console.log(
      `  Completed games without endedAt: ${gamesWithoutEndedAt.length}`
    );
    console.log(
      `  Games with invalid players: ${gamesWithInvalidPlayers.length}`
    );

    if (gamesWithEmptyPlayers.length > 0) {
      console.log("\n📋 Sample games with empty players:");
      gamesWithEmptyPlayers.slice(0, 3).forEach((game, index) => {
        console.log(
          `  ${index + 1}. ${game.roomId}: ${game.gameState.status}/${
            game.status
          }`
        );
      });
    }

    if (gamesWithoutEndedAt.length > 0) {
      console.log("\n📋 Sample completed games without endedAt:");
      gamesWithoutEndedAt.slice(0, 3).forEach((game, index) => {
        console.log(
          `  ${index + 1}. ${game.roomId}: ${game.gameState.status}/${
            game.status
          }`
        );
      });
    }

    return {
      emptyPlayers: gamesWithEmptyPlayers.length,
      noEndedAt: gamesWithoutEndedAt.length,
      invalidPlayers: gamesWithInvalidPlayers.length,
    };
  } catch (error) {
    console.error("❌ Inconsistent games test failed:", error);
    return null;
  }
}

async function testMatchHistoryConsistency() {
  console.log("\n📈 Testing match history consistency...");

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
      "❌ Match history consistency test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function runComprehensiveTest() {
  console.log("🚀 Starting Player Management and Game Completion Test...\n");

  // Connect to database
  await connectToDatabase();

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

  // Test game completion
  const gameCompletionResults = await testGameCompletion();

  // Test inconsistent games
  const inconsistentGamesResults = await testInconsistentGames();

  // Test match history consistency
  const matchHistoryResults = await testMatchHistoryConsistency();

  // Summary
  console.log("\n📊 Test Summary:");
  console.log("==================");

  if (playerAdditionResults) {
    console.log("\nPlayer Addition:");
    console.log(`  ✅ Game created: ${playerAdditionResults.gameId}`);
    console.log(`  ✅ Player count: ${playerAdditionResults.playerCount}`);
    console.log(`  ✅ Players valid: ${playerAdditionResults.playersValid}`);
  }

  if (gameCompletionResults) {
    console.log("\nGame Completion:");
    console.log(`  ✅ Game ID: ${gameCompletionResults.gameId}`);
    console.log(`  ✅ Has endedAt: ${gameCompletionResults.hasEndedAt}`);
    console.log(`  ✅ Duration: ${gameCompletionResults.duration}s`);
    console.log(`  ✅ Players valid: ${gameCompletionResults.playersValid}`);
    console.log(`  ✅ Has winner: ${gameCompletionResults.hasWinner}`);
    console.log(`  ✅ Player count: ${gameCompletionResults.playerCount}`);
  }

  if (inconsistentGamesResults) {
    console.log("\nInconsistent Games:");
    console.log(`  ⚠️ Empty players: ${inconsistentGamesResults.emptyPlayers}`);
    console.log(`  ⚠️ No endedAt: ${inconsistentGamesResults.noEndedAt}`);
    console.log(
      `  ⚠️ Invalid players: ${inconsistentGamesResults.invalidPlayers}`
    );
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

  console.log("\n✅ Comprehensive test completed!");

  // Close database connection
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
}

// Run the test
runComprehensiveTest().catch(console.error);
