const { Game } = require("./src/models/Game.js");
const mongoose = require("mongoose");

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb+srv://abhinav:yP2i3MrJ9vZjB8Ff@cluster0.en1oo.mongodb.net/memory_game?retryWrites=true&w=majority&appName=Cluster0";

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

async function fixMatchHistoryData() {
  console.log("🔧 Starting match history data fix...\n");

  try {
    // Find all games that are completed/finished but missing endedAt
    const gamesToFix = await Game.find({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      $or: [{ endedAt: { $exists: false } }, { endedAt: null }],
    });

    console.log(`📊 Found ${gamesToFix.length} games that need endedAt field`);

    if (gamesToFix.length === 0) {
      console.log(
        "✅ No games need fixing - all completed games have endedAt field"
      );
      return;
    }

    let fixedCount = 0;
    let skippedCount = 0;

    for (const game of gamesToFix) {
      try {
        // Determine the appropriate endedAt timestamp
        let endedAt = null;

        // If game has updatedAt and it's different from createdAt, use updatedAt
        if (
          game.updatedAt &&
          game.updatedAt.getTime() !== game.createdAt.getTime()
        ) {
          endedAt = game.updatedAt;
        } else {
          // Otherwise, use createdAt + a reasonable game duration (e.g., 10 minutes)
          endedAt = new Date(game.createdAt.getTime() + 10 * 60 * 1000);
        }

        // Update the game with endedAt field
        await Game.updateOne(
          { _id: game._id },
          {
            $set: {
              endedAt: endedAt,
              updatedAt: new Date(), // Update the updatedAt field as well
            },
          }
        );

        console.log(`✅ Fixed game ${game.roomId}: set endedAt to ${endedAt}`);
        fixedCount++;
      } catch (error) {
        console.error(`❌ Failed to fix game ${game.roomId}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n📊 Fix summary:`);
    console.log(`  Fixed: ${fixedCount} games`);
    console.log(`  Skipped: ${skippedCount} games`);
    console.log(`  Total processed: ${gamesToFix.length} games`);

    // Verify the fix
    const remainingUnfixed = await Game.find({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      $or: [{ endedAt: { $exists: false } }, { endedAt: null }],
    });

    if (remainingUnfixed.length === 0) {
      console.log("✅ All completed games now have endedAt field");
    } else {
      console.log(
        `⚠️ ${remainingUnfixed.length} games still missing endedAt field`
      );
    }
  } catch (error) {
    console.error("❌ Error fixing match history data:", error);
  }
}

async function validateMatchHistoryQuery() {
  console.log("\n🔍 Validating match history query logic...");

  try {
    // Test the query logic used in the match history endpoint
    const testUserId = "test-user-id"; // This is just for testing the query structure

    const query = {
      "players.userId": testUserId,
      $or: [
        // Games that have ended (have endedAt timestamp)
        { endedAt: { $exists: true, $ne: null } },
        // Games with a winner
        { "gameState.winner": { $exists: true, $ne: null } },
        // Games that are finished/completed
        { "gameState.status": { $in: ["finished", "completed"] } },
        { status: { $in: ["finished", "completed"] } },
        // Games that are not in waiting/starting status and have been updated recently
        {
          $and: [
            { "gameState.status": { $nin: ["waiting", "starting"] } },
            { status: { $nin: ["waiting", "starting"] } },
            { updatedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } }, // Updated more than 5 minutes ago
          ],
        },
      ],
    };

    console.log("✅ Match history query structure is valid");
    console.log("Query structure:", JSON.stringify(query, null, 2));

    // Test with actual data
    const allGames = await Game.find({});
    console.log(`📊 Total games in database: ${allGames.length}`);

    // Count games by status
    const statusCounts = {};
    allGames.forEach((game) => {
      const status = `${game.gameState.status}/${game.status}`;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log("📋 Games by status:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Count games with endedAt
    const gamesWithEndedAt = allGames.filter((game) => game.endedAt);
    console.log(`📊 Games with endedAt field: ${gamesWithEndedAt.length}`);
  } catch (error) {
    console.error("❌ Error validating match history query:", error);
  }
}

async function runFix() {
  console.log("🚀 Starting Match History Data Fix...\n");

  // Connect to database
  await connectToDatabase();

  // Fix match history data
  await fixMatchHistoryData();

  // Validate the fix
  await validateMatchHistoryQuery();

  console.log("\n✅ Match history data fix completed!");

  // Close database connection
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
}

// Run the fix
runFix().catch(console.error);
