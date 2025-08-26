const redisManager = require("./src/utils/redis.js");

async function quickRedisTest() {
  try {
    // Test connection
    const connected = await redisManager.connect();
    if (!connected) {
      return;
    }

    // Test ping
    const ping = await redisManager.ping();
    // Test session storage
    const sessionData = { userId: "test123", username: "testuser" };
    await redisManager.setSession("test-session", sessionData, 60);
    const retrieved = await redisManager.getSession("test-session");
    await redisManager.deleteSession("test-session");

    // Test game state caching
    const gameState = {
      id: "test-game",
      players: ["user1", "user2"],
      status: "active",
    };
    await redisManager.cacheGameState("test-game", gameState, 60);
    const cachedState = await redisManager.getGameState("test-game");
    await redisManager.deleteGameState("test-game");

    // Test active players tracking
    const playerData = { id: "user1", username: "player1" };
    await redisManager.addActivePlayer("user1", playerData);
    const activePlayers = await redisManager.getActivePlayers();
    const playerCount = await redisManager.getActivePlayerCount();
    await redisManager.removeActivePlayer("user1");

    // Test active games tracking
    const gameData = { id: "game1", players: ["user1", "user2"] };
    await redisManager.addActiveGame("game1", gameData);
    const activeGames = await redisManager.getActiveGames();
    const gameCount = await redisManager.getActiveGameCount();
    await redisManager.removeActiveGame("game1");

    // Test leaderboard caching
    const leaderboardData = [
      { userId: "user1", username: "player1", score: 1500 },
      { userId: "user2", username: "player2", score: 1200 },
    ];
    await redisManager.cacheLeaderboard("test", leaderboardData, 60);
    const leaderboard = await redisManager.getLeaderboard("test");
    await redisManager.del("leaderboard:test");

    // Test performance caching
    const userData = {
      id: "user1",
      username: "testuser",
      email: "test@example.com",
    };
    await redisManager.cacheUserProfile("user1", userData, 60);
    const profile = await redisManager.getUserProfile("user1");
    await redisManager.del("user:user1");

    // Test stats
    const stats = await redisManager.getStats();
    // Cleanup
    await redisManager.flushAll();
    await redisManager.disconnect();

    } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

quickRedisTest();
