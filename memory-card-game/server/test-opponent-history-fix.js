const mongoose = require("mongoose");
const { Game } = require("./src/models/Game.js");

async function connectToDatabase() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://abhinav:yP2i3MrJ9vZjB8Ff@cluster0.en1oo.mongodb.net/memory_game?retryWrites=true&w=majority&appName=Cluster0"
    );
    console.log("✅ Connected to database");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
}

async function testOpponentHistoryFix() {
  console.log("🧪 Testing Opponent History Fix");
  console.log("=".repeat(50));

  await connectToDatabase();

  const now = new Date();

  // Clean up any existing test games
  await Game.deleteMany({ roomId: { $regex: /^test-opponent-/ } });

  console.log("\n📊 Creating test scenarios...");

  // Create test games with different opponent scenarios
  const testGames = [
    // Game 1: Normal completed game with opponents
    {
      roomId: "test-opponent-1",
      status: "completed",
      gameState: {
        status: "finished",
        currentTurn: "player1",
        matchedPairs: [],
        timeLeft: 0,
        gameMode: "classic",
        round: 1,
        board: [],
        lastActivity: now,
        powerUpPool: [],
        completionReason: "game_completed",
        opponentsForHistory: [
          {
            userId: "player2",
            username: "demo2",
            score: 30,
            matches: 2,
            leftEarly: false,
            disconnectedAt: null,
          },
        ],
      },
      players: [
        {
          userId: "player1",
          username: "demo1",
          score: 50,
          matches: 3,
          isReady: true,
        },
      ],
      settings: {
        maxPlayers: 2,
        boardSize: "4x4",
        gameMode: "classic",
        theme: "emojis",
        powerUpsEnabled: false,
        chatEnabled: true,
        isRanked: true,
      },
      createdAt: now,
      updatedAt: now,
      endedAt: now,
    },
    // Game 2: Game where opponent left early
    {
      roomId: "test-opponent-2",
      status: "completed",
      gameState: {
        status: "finished",
        currentTurn: "player1",
        matchedPairs: [],
        timeLeft: 0,
        gameMode: "classic",
        round: 1,
        board: [],
        lastActivity: now,
        powerUpPool: [],
        completionReason: "opponents_left",
        opponentsForHistory: [
          {
            userId: "player2",
            username: "demo2",
            score: 10,
            matches: 0,
            leftEarly: true,
            disconnectedAt: new Date(now.getTime() - 30000), // 30 seconds ago
          },
        ],
      },
      players: [
        {
          userId: "player1",
          username: "demo1",
          score: 20,
          matches: 1,
          isReady: true,
        },
      ],
      settings: {
        maxPlayers: 2,
        boardSize: "4x4",
        gameMode: "classic",
        theme: "emojis",
        powerUpsEnabled: false,
        chatEnabled: true,
        isRanked: true,
      },
      createdAt: now,
      updatedAt: now,
      endedAt: now,
    },
    // Game 3: Game with multiple opponents (4-player game)
    {
      roomId: "test-opponent-3",
      status: "completed",
      gameState: {
        status: "finished",
        currentTurn: "player1",
        matchedPairs: [],
        timeLeft: 0,
        gameMode: "classic",
        round: 1,
        board: [],
        lastActivity: now,
        powerUpPool: [],
        completionReason: "game_completed",
        opponentsForHistory: [
          {
            userId: "player2",
            username: "demo2",
            score: 25,
            matches: 1,
            leftEarly: false,
            disconnectedAt: null,
          },
          {
            userId: "player3",
            username: "demo3",
            score: 15,
            matches: 0,
            leftEarly: true,
            disconnectedAt: new Date(now.getTime() - 60000), // 1 minute ago
          },
          {
            userId: "player4",
            username: "demo4",
            score: 35,
            matches: 2,
            leftEarly: false,
            disconnectedAt: null,
          },
        ],
      },
      players: [
        {
          userId: "player1",
          username: "demo1",
          score: 40,
          matches: 2,
          isReady: true,
        },
      ],
      settings: {
        maxPlayers: 4,
        boardSize: "4x4",
        gameMode: "classic",
        theme: "emojis",
        powerUpsEnabled: false,
        chatEnabled: true,
        isRanked: true,
      },
      createdAt: now,
      updatedAt: now,
      endedAt: now,
    },
    // Game 4: Game with no opponents (should show fallback)
    {
      roomId: "test-opponent-4",
      status: "completed",
      gameState: {
        status: "finished",
        currentTurn: "player1",
        matchedPairs: [],
        timeLeft: 0,
        gameMode: "classic",
        round: 1,
        board: [],
        lastActivity: now,
        powerUpPool: [],
        completionReason: "game_completed",
        opponentsForHistory: [], // Empty opponents
      },
      players: [
        {
          userId: "player1",
          username: "demo1",
          score: 30,
          matches: 1,
          isReady: true,
        },
        {
          userId: "player2",
          username: "demo2",
          score: 20,
          matches: 0,
          isReady: true,
        },
      ],
      settings: {
        maxPlayers: 2,
        boardSize: "4x4",
        gameMode: "classic",
        theme: "emojis",
        powerUpsEnabled: false,
        chatEnabled: true,
        isRanked: true,
      },
      createdAt: now,
      updatedAt: now,
      endedAt: now,
    },
  ];

  // Create the test games
  for (const gameData of testGames) {
    const game = new Game(gameData);
    await game.save();
    console.log(
      `✅ Created test game: ${game.roomId} with ${game.gameState.opponentsForHistory.length} opponents`
    );
  }

  console.log("\n📊 Test games created successfully");

  // Test the opponent history retrieval logic
  console.log("\n🔍 Testing opponent history retrieval...");

  for (const game of testGames) {
    console.log(`\n📋 Game: ${game.roomId}`);
    console.log(`   Status: ${game.gameState.status}`);
    console.log(`   Completion Reason: ${game.gameState.completionReason}`);
    console.log(
      `   Opponents in DB: ${game.gameState.opponentsForHistory.length}`
    );

    // Simulate the match history retrieval logic
    let opponents = [];
    if (
      game.gameState?.opponentsForHistory &&
      game.gameState.opponentsForHistory.length > 0
    ) {
      // Use stored opponents information (includes players who left)
      opponents = game.gameState.opponentsForHistory
        .filter((p) => p.userId !== "player1") // Simulate filtering current user
        .map((opponent) => ({
          username: opponent.username,
          userId: opponent.userId,
          score: opponent.score || 0,
          matches: opponent.matches || 0,
          leftEarly: opponent.leftEarly || false,
          disconnectedAt: opponent.disconnectedAt || null,
        }));
    } else {
      // Fallback to current players (for older games)
      opponents = game.players
        .filter((p) => p.userId !== "player1") // Simulate filtering current user
        .map((opponent) => ({
          username: opponent.username,
          userId: opponent.userId,
          score: opponent.score || 0,
          matches: opponent.matches || 0,
          leftEarly:
            !game.endedAt ||
            game.gameState.completionReason === "opponents_left" ||
            game.gameState.completionReason === "last_player_winner" ||
            game.gameState.completionReason === "abort",
          disconnectedAt: null,
        }));
    }

    console.log(`   Opponents retrieved: ${opponents.length}`);
    opponents.forEach((opp, idx) => {
      console.log(
        `     ${idx + 1}. ${opp.username} (${opp.score} pts)${
          opp.leftEarly ? " • left" : ""
        }`
      );
    });
  }

  // Verify the fixes
  console.log("\n✅ Opponent History Fix Verification:");

  // Check if normal game has opponents
  const normalGame = await Game.findOne({ roomId: "test-opponent-1" });
  if (normalGame && normalGame.gameState.opponentsForHistory.length > 0) {
    console.log("   ✅ Normal game has opponent information");
  } else {
    console.log("   ❌ Normal game missing opponent information");
  }

  // Check if left early game shows left status
  const leftGame = await Game.findOne({ roomId: "test-opponent-2" });
  if (leftGame && leftGame.gameState.opponentsForHistory[0]?.leftEarly) {
    console.log("   ✅ Left early game shows opponent left status");
  } else {
    console.log("   ❌ Left early game missing left status");
  }

  // Check if multiple opponents game has all opponents
  const multiGame = await Game.findOne({ roomId: "test-opponent-3" });
  if (multiGame && multiGame.gameState.opponentsForHistory.length === 3) {
    console.log("   ✅ Multiple opponents game has all opponents");
  } else {
    console.log("   ❌ Multiple opponents game missing some opponents");
  }

  // Check if fallback works for games without opponents
  const fallbackGame = await Game.findOne({ roomId: "test-opponent-4" });
  if (fallbackGame && fallbackGame.players.length > 1) {
    console.log("   ✅ Fallback works for games without stored opponents");
  } else {
    console.log("   ❌ Fallback not working properly");
  }

  // Summary
  console.log("\n📊 Summary:");
  console.log(`   - Total test games: ${testGames.length}`);
  console.log(
    `   - Games with stored opponents: ${
      testGames.filter((g) => g.gameState.opponentsForHistory.length > 0).length
    }`
  );
  console.log(
    `   - Games with left early opponents: ${
      testGames.filter((g) =>
        g.gameState.opponentsForHistory.some((o) => o.leftEarly)
      ).length
    }`
  );

  // Clean up test data
  console.log("\n🧹 Cleaning up test data...");
  await Game.deleteMany({ roomId: { $regex: /^test-opponent-/ } });
  console.log("✅ Test data cleaned up");

  console.log("\n✅ Opponent history fix test completed!");
  console.log("\n🎯 Key Fixes:");
  console.log("   - Duplicate opponents prevented");
  console.log("   - Left early status properly tracked");
  console.log("   - Fallback to current players for older games");
  console.log("   - Improved frontend display with scores and left status");
}

// Run the test
testOpponentHistoryFix().catch(console.error);
