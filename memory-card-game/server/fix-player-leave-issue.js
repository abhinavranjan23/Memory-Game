const { Game } = require("./src/models/Game.js");
const mongoose = require("mongoose");

// MongoDB connection string
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://abhinav:yP2i3MrJ9vZjB8Ff@cluster0.en1oo.mongodb.net/memory_game?retryWrites=true&w=majority&appName=Cluster0";

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

async function fixPlayerLeaveIssues() {
  console.log("🔧 Starting player leave issues fix...\n");

  try {
    // Find games that are marked as completed but have empty players
    const problematicGames = await Game.find({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      $or: [
        { players: { $exists: false } },
        { players: null },
        { players: { $size: 0 } },
      ],
    });

    console.log(
      `📊 Found ${problematicGames.length} games with player leave issues`
    );

    if (problematicGames.length === 0) {
      console.log("✅ No problematic games found");
      return;
    }

    // Display problematic games
    console.log("\n📋 Problematic games found:");
    problematicGames.forEach((game, index) => {
      console.log(`${index + 1}. Room: ${game.roomId}`);
      console.log(`   Status: ${game.gameState.status}/${game.status}`);
      console.log(
        `   Players: ${game.players ? game.players.length : "null/undefined"}`
      );
      console.log(`   Created: ${game.createdAt}`);
      console.log(`   Ended: ${game.endedAt || "No endedAt"}`);
      console.log(`   Updated: ${game.updatedAt}`);
      console.log("");
    });

    let fixedCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    for (const game of problematicGames) {
      try {
        console.log(`🔧 Processing game ${game.roomId}...`);

        // Check if this game was created recently (within last hour) and has no players
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const isRecent = game.createdAt > oneHourAgo;
        const hasNoPlayers = !game.players || game.players.length === 0;

        if (isRecent && hasNoPlayers) {
          // This is likely a game where players left during waiting phase
          // We should delete these games as they're not valid completed games
          console.log(`   ❌ Recent game with no players - deleting`);
          await Game.deleteOne({ _id: game._id });
          console.log(`   ✅ Deleted invalid game ${game.roomId}`);
          deletedCount++;
        } else if (hasNoPlayers) {
          // Older games with no players - mark as invalid and delete
          console.log(`   ❌ Old game with no players - deleting`);
          await Game.deleteOne({ _id: game._id });
          console.log(`   ✅ Deleted old invalid game ${game.roomId}`);
          deletedCount++;
        } else {
          // Games with some players but marked as completed - try to fix
          console.log(
            `   ⚠️ Game with players but marked completed - attempting fix`
          );

          // Check if game should be in waiting status instead
          if (game.players.length < game.settings.maxPlayers) {
            // Reset to waiting status
            await Game.updateOne(
              { _id: game._id },
              {
                $set: {
                  "gameState.status": "waiting",
                  status: "waiting",
                  endedAt: null,
                  updatedAt: new Date(),
                },
              }
            );
            console.log(`   ✅ Reset game ${game.roomId} to waiting status`);
            fixedCount++;
          } else {
            console.log(
              `   ⚠️ Game ${game.roomId} has full players but marked completed - skipping`
            );
            skippedCount++;
          }
        }
      } catch (error) {
        console.error(
          `   ❌ Failed to process game ${game.roomId}:`,
          error.message
        );
        skippedCount++;
      }
    }

    console.log(`\n📊 Fix summary:`);
    console.log(`  Fixed: ${fixedCount} games`);
    console.log(`  Deleted: ${deletedCount} invalid games`);
    console.log(`  Skipped: ${skippedCount} games`);
    console.log(`  Total processed: ${problematicGames.length} games`);

    // Verify the fix
    const remainingProblematic = await Game.find({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      $or: [
        { players: { $exists: false } },
        { players: null },
        { players: { $size: 0 } },
      ],
    });

    if (remainingProblematic.length === 0) {
      console.log("✅ All player leave issues have been resolved");
    } else {
      console.log(
        `⚠️ ${remainingProblematic.length} games still have player leave issues`
      );
    }
  } catch (error) {
    console.error("❌ Error fixing player leave issues:", error);
  }
}

async function validateGameStates() {
  console.log("\n🔍 Validating game states...");

  try {
    // Check for games in waiting status with players
    const waitingGames = await Game.find({
      "gameState.status": "waiting",
      players: { $exists: true, $ne: null, $ne: [] },
    });

    console.log(
      `📊 Games in waiting status with players: ${waitingGames.length}`
    );

    // Check for games in completed status with players
    const completedGames = await Game.find({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      players: { $exists: true, $ne: null, $ne: [] },
    });

    console.log(
      `📊 Games in completed status with players: ${completedGames.length}`
    );

    // Check for games with endedAt field
    const gamesWithEndedAt = await Game.find({
      endedAt: { $exists: true, $ne: null },
    });

    console.log(`📊 Games with endedAt field: ${gamesWithEndedAt.length}`);

    // Validate that completed games have endedAt
    const completedWithoutEndedAt = await Game.find({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      $or: [{ endedAt: { $exists: false } }, { endedAt: null }],
    });

    console.log(
      `📊 Completed games without endedAt: ${completedWithoutEndedAt.length}`
    );

    if (completedWithoutEndedAt.length > 0) {
      console.log("\n📋 Completed games without endedAt:");
      completedWithoutEndedAt.slice(0, 5).forEach((game, index) => {
        console.log(
          `  ${index + 1}. ${game.roomId}: ${game.gameState.status}/${
            game.status
          }`
        );
      });
    }
  } catch (error) {
    console.error("❌ Error validating game states:", error);
  }
}

async function runFix() {
  console.log("🚀 Starting Player Leave Issues Fix...\n");

  // Connect to database
  await connectToDatabase();

  // Fix player leave issues
  await fixPlayerLeaveIssues();

  // Validate game states
  await validateGameStates();

  console.log("\n✅ Player leave issues fix completed!");

  // Close database connection
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
}

// Run the fix
runFix().catch(console.error);
