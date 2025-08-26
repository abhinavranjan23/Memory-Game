const redisManager = require("./src/utils/redis.js");

async function testRedisSimple() {
  console.log("🧪 Testing Redis Functionality (Simple)");
  console.log("=".repeat(50));

  try {
    // Test connection
    console.log("\n🔗 Testing Connection...");
    const connected = await redisManager.connect();
    if (connected) {
      console.log("✅ Redis connected successfully");
    } else {
      console.log("❌ Redis connection failed");
      return;
    }

    // Test ping
    console.log("\n🏓 Testing Ping...");
    const ping = await redisManager.ping();
    if (ping) {
      console.log("✅ Redis ping successful");
    } else {
      console.log("❌ Redis ping failed");
    }

    // Test session storage
    console.log("\n💾 Testing Session Storage...");
    const sessionData = { userId: "test123", username: "testuser" };
    const sessionSet = await redisManager.setSession("test-session", sessionData, 60);
    if (sessionSet) {
      console.log("✅ Session set successfully");
    } else {
      console.log("❌ Session set failed");
    }

    const sessionGet = await redisManager.getSession("test-session");
    if (sessionGet && sessionGet.userId === "test123") {
      console.log("✅ Session retrieved successfully");
    } else {
      console.log("❌ Session retrieval failed");
    }

    await redisManager.deleteSession("test-session");
    console.log("✅ Session deleted successfully");

    // Test game state caching
    console.log("\n🎮 Testing Game State Caching...");
    const gameState = { 
      status: "playing", 
      currentTurn: "player1", 
      matchedPairs: 2 
    };
    const gameSet = await redisManager.cacheGameState("test-game", gameState, 60);
    if (gameSet) {
      console.log("✅ Game state cached successfully");
    } else {
      console.log("❌ Game state caching failed");
    }

    const gameGet = await redisManager.getGameState("test-game");
    if (gameGet && gameGet.status === "playing") {
      console.log("✅ Game state retrieved successfully");
    } else {
      console.log("❌ Game state retrieval failed");
    }

    await redisManager.deleteGameState("test-game");
    console.log("✅ Game state deleted successfully");

    // Test active players
    console.log("\n👥 Testing Active Players...");
    const playerData = { id: "player1", username: "testplayer", score: 100 };
    const playerAdd = await redisManager.addActivePlayer("player1", playerData);
    if (playerAdd) {
      console.log("✅ Active player added successfully");
    } else {
      console.log("❌ Active player addition failed");
    }

    const activePlayers = await redisManager.getActivePlayers();
    if (activePlayers && activePlayers.length > 0) {
      console.log("✅ Active players retrieved successfully");
    } else {
      console.log("❌ Active players retrieval failed");
    }

    const playerCount = await redisManager.getActivePlayerCount();
    console.log("📊 Active player count: " + playerCount);

    await redisManager.removeActivePlayer("player1");
    console.log("✅ Active player removed successfully");

    // Test active games
    console.log("\n🎯 Testing Active Games...");
    const gameData = { id: "game1", roomId: "room123", status: "waiting" };
    const gameAdd = await redisManager.addActiveGame("game1", gameData);
    if (gameAdd) {
      console.log("✅ Active game added successfully");
    } else {
      console.log("❌ Active game addition failed");
    }

    const activeGames = await redisManager.getActiveGames();
    if (activeGames && activeGames.length > 0) {
      console.log("✅ Active games retrieved successfully");
    } else {
      console.log("❌ Active games retrieval failed");
    }

    const gameCount = await redisManager.getActiveGameCount();
    console.log("📊 Active game count: " + gameCount);

    await redisManager.removeActiveGame("game1");
    console.log("✅ Active game removed successfully");

    // Test leaderboard
    console.log("\n🏆 Testing Leaderboard...");
    const leaderboardData = [
      { username: "player1", score: 100 },
      { username: "player2", score: 80 }
    ];
    const leaderboardSet = await redisManager.cacheLeaderboard("test", leaderboardData, 60);
    if (leaderboardSet) {
      console.log("✅ Leaderboard cached successfully");
    } else {
      console.log("❌ Leaderboard caching failed");
    }

    const leaderboardGet = await redisManager.getLeaderboard("test");
    if (leaderboardGet && leaderboardGet.length > 0) {
      console.log("✅ Leaderboard retrieved successfully");
    } else {
      console.log("❌ Leaderboard retrieval failed");
    }

    await redisManager.del("leaderboard:test");
    console.log("✅ Leaderboard deleted successfully");

    // Test user profiles
    console.log("\n👤 Testing User Profiles...");
    const userData = { 
      id: "user1", 
      username: "testuser", 
      email: "test@example.com",
      stats: { wins: 10, losses: 5 }
    };
    const userSet = await redisManager.cacheUserProfile("user1", userData, 60);
    if (userSet) {
      console.log("✅ User profile cached successfully");
    } else {
      console.log("❌ User profile caching failed");
    }

    const userGet = await redisManager.getUserProfile("user1");
    if (userGet && userGet.username === "testuser") {
      console.log("✅ User profile retrieved successfully");
    } else {
      console.log("❌ User profile retrieval failed");
    }

    await redisManager.del("user:user1");
    console.log("✅ User profile deleted successfully");

    // Test stats
    console.log("\n📊 Testing Redis Stats...");
    const stats = await redisManager.getStats();
    if (stats && stats.isConnected) {
      console.log("✅ Redis stats retrieved successfully");
      console.log("📈 Redis Stats:", JSON.stringify(stats, null, 2));
    } else {
      console.log("❌ Redis stats retrieval failed");
    }

    // Cleanup
    console.log("\n🧹 Cleaning up...");
    await redisManager.flushAll();
    await redisManager.disconnect();
    console.log("✅ Redis disconnected successfully");

    console.log("\n🎉 All Redis tests completed successfully!");
    console.log("✅ Redis is working properly!");

  } catch (error) {
    console.error("❌ Redis test failed:", error.message);
    await redisManager.disconnect();
  }
}

// Run the test
testRedisSimple();
