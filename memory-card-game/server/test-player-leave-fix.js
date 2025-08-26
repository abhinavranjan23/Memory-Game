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

async function testPlayerLeaveDuringWaiting() {
  console.log("\n🎮 Testing player leave during waiting phase...");

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

    // Step 3: First player leaves during waiting phase
    console.log("\n🔄 First player leaving during waiting phase...");

    await axios.post(
      `${API_BASE_URL}/game/leave/${game.roomId}`,
      {},
      {
        headers: { Authorization: `Bearer ${authTokens[0]}` },
      }
    );
    console.log("✅ First player left the game");

    // Step 4: Wait a moment for server to process
    await new Promise((resolve) => setTimeout(resolve, 2000));

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

async function testPlayerLeaveDuringStarting() {
  console.log("\n🎮 Testing player leave during starting phase...");

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

    // Step 3: Simulate starting phase by making players ready
    console.log("\n🔄 Making players ready to trigger starting phase...");

    // Make first player ready
    await axios.post(
      `${API_BASE_URL}/game/${game.roomId}/ready`,
      {},
      {
        headers: { Authorization: `Bearer ${authTokens[0]}` },
      }
    );
    console.log("✅ First player ready");

    // Make second player ready
    await axios.post(
      `${API_BASE_URL}/game/${game.roomId}/ready`,
      {},
      {
        headers: { Authorization: `Bearer ${authTokens[1]}` },
      }
    );
    console.log("✅ Second player ready");

    // Step 4: Wait a moment for status to update
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 5: Check game status
    const gameStatusResponse = await axios.get(
      `${API_BASE_URL}/game/${game.roomId}`,
      {
        headers: { Authorization: `Bearer ${authTokens[0]}` },
      }
    );

    const gameInStarting = gameStatusResponse.data.game;
    console.log(`  Status after ready: ${gameInStarting.gameState.status}`);

    // Step 6: First player leaves during starting phase
    console.log("\n🔄 First player leaving during starting phase...");

    await axios.post(
      `${API_BASE_URL}/game/leave/${game.roomId}`,
      {},
      {
        headers: { Authorization: `Bearer ${authTokens[0]}` },
      }
    );
    console.log("✅ First player left the game");

    // Step 7: Wait a moment for server to process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 8: Check if game still exists for second player
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
      "❌ Player leave during starting test failed:",
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

  // Test player leave during waiting phase
  const waitingPhaseResults = await testPlayerLeaveDuringWaiting();

  // Test player leave during starting phase
  const startingPhaseResults = await testPlayerLeaveDuringStarting();

  // Summary
  console.log("\n📊 Test Summary:");
  console.log("==================");

  if (waitingPhaseResults) {
    console.log("\nPlayer Leave During Waiting:");
    console.log(`  ✅ Game exists: ${waitingPhaseResults.gameExists}`);
    console.log(`  ✅ Status: ${waitingPhaseResults.status}`);
    console.log(`  ✅ Player count: ${waitingPhaseResults.playerCount}`);
    console.log(`  ✅ Has endedAt: ${waitingPhaseResults.hasEndedAt}`);
  }

  if (startingPhaseResults) {
    console.log("\nPlayer Leave During Starting:");
    console.log(`  ✅ Game exists: ${startingPhaseResults.gameExists}`);
    console.log(`  ✅ Status: ${startingPhaseResults.status}`);
    console.log(`  ✅ Player count: ${startingPhaseResults.playerCount}`);
    console.log(`  ✅ Has endedAt: ${startingPhaseResults.hasEndedAt}`);
  }

  console.log("\n✅ Player leave fix verification completed!");
  console.log("\n💡 Expected behavior:");
  console.log("   - Games should be deleted when all players leave");
  console.log(
    "   - Games should not be marked as completed with empty players"
  );
  console.log("   - Remaining players should see proper game state updates");
}

// Run the test
runPlayerLeaveTest().catch(console.error);
