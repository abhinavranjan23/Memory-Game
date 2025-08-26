const redisManager = require("./src/utils/redis.js");

// Test configuration
const TEST_TIMEOUT = 10000;
const TEST_DELAY = 100;

// Utility function to delay execution
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
};

// Test helper functions
const assert = (condition, message) => {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    } else {
    testResults.failed++;
    testResults.errors.push(message);
    }
};

const assertEqual = (actual, expected, message) => {
  testResults.total++;
  if (actual === expected) {
    testResults.passed++;
    `);
  } else {
    testResults.failed++;
    testResults.errors.push(
      `${message} - Expected: ${expected}, Got: ${actual}`
    );
    }
};

const assertNotNull = (value, message) => {
  testResults.total++;
  if (value !== null && value !== undefined) {
    testResults.passed++;
    } else {
    testResults.failed++;
    testResults.errors.push(message);
    }
};

// Test functions
async function testRedisConnection() {
  try {
    const connected = await redisManager.connect();
    assert(connected, "Redis connection established");

    const ping = await redisManager.ping();
    assert(ping, "Redis ping successful");

    const stats = await redisManager.getStats();
    assert(stats.isConnected, "Redis stats show connected status");
  } catch (error) {
    }
}

async function testSessionStorage() {
  const sessionId = "test-session-123";
  const sessionData = {
    userId: "user123",
    username: "testuser",
    lastActivity: new Date().toISOString(),
  };

  try {
    // Test setting session
    const setResult = await redisManager.setSession(sessionId, sessionData, 60);
    assert(setResult, "Session set successfully");

    // Test getting session
    const retrievedSession = await redisManager.getSession(sessionId);
    assertNotNull(retrievedSession, "Session retrieved successfully");
    assertEqual(
      retrievedSession.userId,
      sessionData.userId,
      "Session data integrity maintained"
    );

    // Test deleting session
    const deleteResult = await redisManager.deleteSession(sessionId);
    assert(deleteResult, "Session deleted successfully");

    // Verify deletion
    const deletedSession = await redisManager.getSession(sessionId);
    assert(deletedSession === null, "Session properly deleted");
  } catch (error) {
    }
}

async function testRateLimiting() {
  const identifier = "test-ip-192.168.1.1";
  const maxRequests = 5;
  const windowMs = 10000; // 10 seconds

  try {
    // Test initial rate limit check
    const initialCheck = await redisManager.checkRateLimit(
      identifier,
      maxRequests,
      windowMs
    );
    assert(initialCheck.allowed, "Initial request allowed");
    assertEqual(
      initialCheck.remaining,
      maxRequests - 1,
      "Correct remaining requests"
    );

    // Test multiple requests
    for (let i = 0; i < 3; i++) {
      const check = await redisManager.checkRateLimit(
        identifier,
        maxRequests,
        windowMs
      );
      assert(check.allowed, `Request ${i + 2} allowed`);
    }

    // Test rate limit exceeded
    for (let i = 0; i < 2; i++) {
      const check = await redisManager.checkRateLimit(
        identifier,
        maxRequests,
        windowMs
      );
      if (i === 0) {
        assert(!check.allowed, "Rate limit exceeded");
        assertEqual(check.remaining, 0, "No remaining requests");
      }
    }

    // Wait for rate limit to reset
    await delay(11000);

    const resetCheck = await redisManager.checkRateLimit(
      identifier,
      maxRequests,
      windowMs
    );
    assert(resetCheck.allowed, "Rate limit reset after window");
  } catch (error) {
    }
}

async function testGameStateCaching() {
  const gameId = "test-game-456";
  const gameState = {
    id: gameId,
    players: ["user1", "user2"],
    currentTurn: "user1",
    board: [
      { id: 1, value: "A", isFlipped: false, isMatched: false },
      { id: 2, value: "A", isFlipped: false, isMatched: false },
    ],
    score: { user1: 0, user2: 0 },
    status: "active",
  };

  try {
    // Test caching game state
    const cacheResult = await redisManager.cacheGameState(
      gameId,
      gameState,
      60
    );
    assert(cacheResult, "Game state cached successfully");

    // Test retrieving game state
    const retrievedState = await redisManager.getGameState(gameId);
    assertNotNull(retrievedState, "Game state retrieved successfully");
    assertEqual(
      retrievedState.id,
      gameState.id,
      "Game state integrity maintained"
    );
    assertEqual(
      retrievedState.players.length,
      gameState.players.length,
      "Game state players count correct"
    );

    // Test updating game state
    const updatedState = { ...gameState, currentTurn: "user2" };
    const updateResult = await redisManager.cacheGameState(
      gameId,
      updatedState,
      60
    );
    assert(updateResult, "Game state updated successfully");

    const finalState = await redisManager.getGameState(gameId);
    assertEqual(finalState.currentTurn, "user2", "Game state update reflected");

    // Test deleting game state
    const deleteResult = await redisManager.deleteGameState(gameId);
    assert(deleteResult, "Game state deleted successfully");

    const deletedState = await redisManager.getGameState(gameId);
    assert(deletedState === null, "Game state properly deleted");
  } catch (error) {
    }
}

async function testActivePlayersTracking() {
  const players = [
    { id: "user1", username: "player1", lastSeen: new Date().toISOString() },
    { id: "user2", username: "player2", lastSeen: new Date().toISOString() },
    { id: "user3", username: "player3", lastSeen: new Date().toISOString() },
  ];

  try {
    // Test adding active players
    for (const player of players) {
      const addResult = await redisManager.addActivePlayer(player.id, player);
      assert(addResult, `Player ${player.username} added successfully`);
    }

    // Test getting active players
    const activePlayers = await redisManager.getActivePlayers();
    assertEqual(
      Object.keys(activePlayers).length,
      players.length,
      "Correct number of active players"
    );

    // Test getting active player count
    const playerCount = await redisManager.getActivePlayerCount();
    assertEqual(playerCount, players.length, "Correct active player count");

    // Test removing active player
    const removeResult = await redisManager.removeActivePlayer("user1");
    assert(removeResult, "Player removed successfully");

    const updatedCount = await redisManager.getActivePlayerCount();
    assertEqual(
      updatedCount,
      players.length - 1,
      "Player count decreased after removal"
    );

    // Clean up
    for (const player of players) {
      await redisManager.removeActivePlayer(player.id);
    }
  } catch (error) {
    }
}

async function testActiveGamesTracking() {
  const games = [
    { id: "game1", players: ["user1", "user2"], status: "active" },
    { id: "game2", players: ["user3", "user4"], status: "waiting" },
    { id: "game3", players: ["user5", "user6"], status: "active" },
  ];

  try {
    // Test adding active games
    for (const game of games) {
      const addResult = await redisManager.addActiveGame(game.id, game);
      assert(addResult, `Game ${game.id} added successfully`);
    }

    // Test getting active games
    const activeGames = await redisManager.getActiveGames();
    assertEqual(
      Object.keys(activeGames).length,
      games.length,
      "Correct number of active games"
    );

    // Test getting active game count
    const gameCount = await redisManager.getActiveGameCount();
    assertEqual(gameCount, games.length, "Correct active game count");

    // Test removing active game
    const removeResult = await redisManager.removeActiveGame("game1");
    assert(removeResult, "Game removed successfully");

    const updatedCount = await redisManager.getActiveGameCount();
    assertEqual(
      updatedCount,
      games.length - 1,
      "Game count decreased after removal"
    );

    // Clean up
    for (const game of games) {
      await redisManager.removeActiveGame(game.id);
    }
  } catch (error) {
    }
}

async function testLeaderboardCaching() {
  const leaderboardData = [
    { userId: "user1", username: "player1", score: 1500 },
    { userId: "user2", username: "player2", score: 1200 },
    { userId: "user3", username: "player3", score: 1800 },
  ];

  try {
    // Test caching leaderboard
    const cacheResult = await redisManager.cacheLeaderboard(
      "global",
      leaderboardData,
      60
    );
    assert(cacheResult, "Leaderboard cached successfully");

    // Test retrieving leaderboard
    const retrievedLeaderboard = await redisManager.getLeaderboard("global");
    assertNotNull(retrievedLeaderboard, "Leaderboard retrieved successfully");
    assertEqual(
      retrievedLeaderboard.length,
      leaderboardData.length,
      "Correct leaderboard size"
    );

    // Test updating player scores
    for (const player of leaderboardData) {
      const updateResult = await redisManager.updatePlayerScore(
        player.userId,
        player.score,
        "global"
      );
      assert(
        updateResult,
        `Player ${player.username} score updated successfully`
      );
    }

    // Test getting top players
    const topPlayers = await redisManager.getTopPlayers(3, "global");
    assertEqual(topPlayers.length, 3, "Correct number of top players");
    assertEqual(topPlayers[0].score, 1800, "Highest score player first");

    // Clean up
    await redisManager.del("leaderboard:global");
  } catch (error) {
    }
}

async function testPerformanceCaching() {
  const userId = "test-user-789";
  const userData = {
    id: userId,
    username: "testuser",
    email: "test@example.com",
    stats: {
      gamesPlayed: 50,
      gamesWon: 30,
      averageScore: 1250,
    },
    preferences: {
      theme: "dark",
      soundEnabled: true,
    },
  };

  try {
    // Test caching user profile
    const cacheResult = await redisManager.cacheUserProfile(
      userId,
      userData,
      60
    );
    assert(cacheResult, "User profile cached successfully");

    // Test retrieving user profile
    const retrievedProfile = await redisManager.getUserProfile(userId);
    assertNotNull(retrievedProfile, "User profile retrieved successfully");
    assertEqual(
      retrievedProfile.username,
      userData.username,
      "User profile integrity maintained"
    );
    assertEqual(
      retrievedProfile.stats.gamesPlayed,
      userData.stats.gamesPlayed,
      "User stats integrity maintained"
    );

    // Test cache performance (multiple retrievals)
    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      await redisManager.getUserProfile(userId);
    }
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 10;

    }ms`);
    assert(avgTime < 50, "Cache retrieval performance acceptable");

    // Clean up
    await redisManager.del(`user:${userId}`);
  } catch (error) {
    }
}

async function testRedisStats() {
  try {
    const stats = await redisManager.getStats();
    assertNotNull(stats, "Redis stats retrieved successfully");
    assert(
      typeof stats.isConnected === "boolean",
      "Connection status is boolean"
    );
    assert(
      typeof stats.activePlayers === "number",
      "Active players count is number"
    );
    assert(
      typeof stats.activeGames === "number",
      "Active games count is number"
    );
    assert(typeof stats.ping === "boolean", "Ping status is boolean");

    } catch (error) {
    }
}

async function runAllTests() {
  const startTime = Date.now();

  try {
    await testRedisConnection();
    await delay(TEST_DELAY);

    await testSessionStorage();
    await delay(TEST_DELAY);

    await testRateLimiting();
    await delay(TEST_DELAY);

    await testGameStateCaching();
    await delay(TEST_DELAY);

    await testActivePlayersTracking();
    await delay(TEST_DELAY);

    await testActiveGamesTracking();
    await delay(TEST_DELAY);

    await testLeaderboardCaching();
    await delay(TEST_DELAY);

    await testPerformanceCaching();
    await delay(TEST_DELAY);

    await testRedisStats();
  } catch (error) {
    console.error("❌ Test execution failed:", error);
  } finally {
    // Cleanup
    try {
      await redisManager.flushAll();
      await redisManager.disconnect();
    } catch (error) {
      }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Print test results
  );
  );
  *
      100
    ).toFixed(1)}%`
  );
  if (testResults.errors.length > 0) {
    testResults.errors.forEach((error, index) => {
      });
  }

  if (testResults.failed === 0) {
    } else {
    }

  );

  // Exit with appropriate code
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Handle process termination
process.on("SIGINT", async () => {
  try {
    await redisManager.disconnect();
  } catch (error) {
    }
  process.exit(1);
});

// Set timeout for the entire test suite
setTimeout(() => {
  process.exit(1);
}, TEST_TIMEOUT);

// Run the tests
runAllTests();
