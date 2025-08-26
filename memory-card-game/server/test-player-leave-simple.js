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

async function testPlayerLeaveScenario() {
  console.log("\n🎮 Testing player leave scenario...");

  if (!authTokens[0] || !authTokens[1]) {
    console.log("❌ Need both users logged in for this test");
    return null;
  }

  try {
    // Step 1: Create a game
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
    console.log(`  Initial status: ${game.gameState.status}`);
    console.log(`  Initial players: ${game.players.length}`);

    // Step 2: Join the game with second player
    const joinResponse = await axios.post(
      `${API_BASE_URL}/game/join/${game.roomId}`,
      {},
      {
        headers: { Authorization: `Bearer ${authTokens[1]}` },
      }
    );

    const joinedGame = joinResponse.data.game;
    console.log(`✅ Second player joined`);
    console.log(`  Players: ${joinedGame.players.length}`);
    console.log(`  Status: ${joinedGame.gameState.status}`);

    // Step 3: First player leaves
    console.log("\n🔄 First player leaving...");

    await axios.post(
      `${API_BASE_URL}/game/leave/${game.roomId}`,
      {},
      {
        headers: { Authorization: `Bearer ${authTokens[0]}` },
      }
    );
    console.log("✅ First player left the game");

    // Step 4: Wait a moment for server to process
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 5: Check if game still exists for second player
    console.log("\n📋 Checking game status after first player left...");

    try {
      const gameDetailsResponse = await axios.get(
        `${API_BASE_URL}/game/${game.roomId}`,
        {
          headers: { Authorization: `Bearer ${authTokens[1]}` },
        }
      );

      const remainingGame = gameDetailsResponse.data.game;
      console.log(`  Game still exists: ${!!remainingGame}`);
      console.log(
        `  Status: ${remainingGame.gameState.status}/${remainingGame.status}`
      );
      console.log(`  Players: ${remainingGame.players.length}`);
      console.log(`  EndedAt: ${remainingGame.endedAt || "No endedAt"}`);

      return {
        gameExists: true,
        status: remainingGame.status,
        gameStateStatus: remainingGame.gameState.status,
        playerCount: remainingGame.players.length,
        hasEndedAt: !!remainingGame.endedAt,
      };
    } catch (error) {
      if (error.response?.status === 404) {
        console.log("  Game was deleted (expected behavior)");
        return {
          gameExists: false,
          status: "deleted",
          gameStateStatus: "deleted",
          playerCount: 0,
          hasEndedAt: false,
        };
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.log(
      "❌ Player leave test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function testMatchHistoryAfterLeave() {
  console.log("\n📈 Testing match history after player leave...");

  if (!authTokens[0]) {
    console.log("❌ No valid token for testing");
    return null;
  }

  try {
    // Test match history
    const response = await axios.get(
      `${API_BASE_URL}/game/history/matches?limit=5`,
      {
        headers: { Authorization: `Bearer ${authTokens[0]}` },
      }
    );

    const matches = response.data.matches || [];
    console.log(`📊 Match history results: ${matches.length} matches`);

    if (matches.length > 0) {
      const latestMatch = matches[0];
      console.log("\n📋 Latest match details:");
      console.log(`  Game ID: ${latestMatch.gameId}`);
      console.log(`  Room ID: ${latestMatch.roomId}`);
      console.log(`  Result: ${latestMatch.result}`);
      console.log(`  Score: ${latestMatch.score}`);
      console.log(`  Played At: ${latestMatch.playedAt}`);
      console.log(`  Duration: ${latestMatch.duration}`);
    }

    return {
      matchCount: matches.length,
      hasMatches: matches.length > 0,
    };
  } catch (error) {
    console.log(
      "❌ Match history test failed:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function runPlayerLeaveTest() {
  console.log("🚀 Starting Player Leave Fix Verification Test...\n");

  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log("❌ Cannot proceed without server running");
    return;
  }

  // Login users
  await loginUsers();

  // Test player leave scenario
  const leaveResults = await testPlayerLeaveScenario();

  // Test match history after leave
  const matchHistoryResults = await testMatchHistoryAfterLeave();

  // Summary
  console.log("\n📊 Test Summary:");
  console.log("==================");

  if (leaveResults) {
    console.log("\nPlayer Leave Scenario:");
    console.log(`  ✅ Game exists: ${leaveResults.gameExists}`);
    console.log(`  ✅ Status: ${leaveResults.status}`);
    console.log(`  ✅ Player count: ${leaveResults.playerCount}`);
    console.log(`  ✅ Has endedAt: ${leaveResults.hasEndedAt}`);

    // Check if the fix is working
    if (!leaveResults.gameExists) {
      console.log("  ✅ FIX WORKING: Game was properly deleted");
    } else if (leaveResults.playerCount === 0) {
      console.log("  ❌ ISSUE: Game exists but has no players");
    } else if (leaveResults.hasEndedAt) {
      console.log("  ❌ ISSUE: Game marked as completed with endedAt");
    } else {
      console.log("  ⚠️ Game still exists with players (may be expected)");
    }
  }

  if (matchHistoryResults) {
    console.log("\nMatch History:");
    console.log(`  ✅ Match count: ${matchHistoryResults.matchCount}`);
    console.log(`  ✅ Has matches: ${matchHistoryResults.hasMatches}`);
  }

  console.log("\n✅ Player leave fix verification completed!");
  console.log("\n💡 Expected behavior:");
  console.log(
    "   - Games should be deleted when players leave during waiting phase"
  );
  console.log(
    "   - Games should not be marked as completed with empty players"
  );
  console.log("   - Match history should not include invalid games");
}

// Run the test
runPlayerLeaveTest().catch(console.error);
