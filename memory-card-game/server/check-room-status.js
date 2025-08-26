const mongoose = require("mongoose");

async function checkRoomStatus() {
  try {
    await mongoose.connect("mongodb://localhost:27017/memory-game");
    console.log("Connected to MongoDB");

    const { Game } = require("./src/models/Game.js");

    // Get all games
    const allGames = await Game.find({});
    console.log("\n📊 Total games in database:", allGames.length);

    // Check by gameState.status
    const waitingGames = await Game.find({ "gameState.status": "waiting" });
    const startingGames = await Game.find({ "gameState.status": "starting" });
    const playingGames = await Game.find({ "gameState.status": "playing" });
    const finishedGames = await Game.find({ "gameState.status": "finished" });

    console.log("\n🎮 Games by gameState.status:");
    console.log("  Waiting:", waitingGames.length);
    console.log("  Starting:", startingGames.length);
    console.log("  Playing:", playingGames.length);
    console.log("  Finished:", finishedGames.length);

    // Check by main status field
    const completedGames = await Game.find({ status: "completed" });
    console.log("\n🏁 Games by main status:");
    console.log("  Completed:", completedGames.length);

    // Check empty games
    const emptyGames = await Game.find({ players: { $size: 0 } });
    console.log("\n🚫 Empty games (no players):", emptyGames.length);

    // Check games that should be cleaned up
    const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const oldInactiveGames = await Game.find({
      $or: [
        {
          "gameState.status": { $in: ["waiting", "starting"] },
          updatedAt: { $lt: cutoffTime },
          players: { $size: 0 },
        },
        {
          "gameState.status": { $in: ["waiting", "starting"] },
          updatedAt: { $lt: cutoffTime },
          "players.0": { $exists: false },
        },
      ],
    });

    console.log(
      "\n🧹 Games that should be cleaned up (old & inactive):",
      oldInactiveGames.length
    );

    // Check completed games that should be cleaned up
    const completedCutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const oldCompletedGames = await Game.find({
      $or: [{ status: "completed" }, { "gameState.status": "finished" }],
      updatedAt: { $lt: completedCutoffTime },
    });

    console.log(
      "\n🗑️ Old completed games (24+ hours):",
      oldCompletedGames.length
    );

    // Show some examples
    if (oldInactiveGames.length > 0) {
      console.log("\n📋 Examples of old inactive games:");
      oldInactiveGames.slice(0, 3).forEach((game) => {
        console.log(
          `  - ${game.roomId}: status=${game.gameState.status}, players=${game.players.length}, updated=${game.updatedAt}`
        );
      });
    }

    if (oldCompletedGames.length > 0) {
      console.log("\n📋 Examples of old completed games:");
      oldCompletedGames.slice(0, 3).forEach((game) => {
        console.log(
          `  - ${game.roomId}: status=${game.status}, gameState.status=${game.gameState.status}, ended=${game.endedAt}, updated=${game.updatedAt}`
        );
      });
    }

    // Check for inconsistencies
    const inconsistentGames = await Game.find({
      $or: [
        { status: "completed", "gameState.status": { $ne: "finished" } },
        { status: { $ne: "completed" }, "gameState.status": "finished" },
      ],
    });

    console.log(
      "\n⚠️ Games with inconsistent status:",
      inconsistentGames.length
    );
    if (inconsistentGames.length > 0) {
      inconsistentGames.slice(0, 3).forEach((game) => {
        console.log(
          `  - ${game.roomId}: status=${game.status}, gameState.status=${game.gameState.status}`
        );
      });
    }

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  } catch (error) {
    console.error("Error checking room status:", error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }
}

checkRoomStatus();
