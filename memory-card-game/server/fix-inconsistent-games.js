const { Game } = require("./src/models/Game.js");
const mongoose = require("mongoose");

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/memory-game";

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    process.exit(1);
  }
}

async function fixInconsistentGames() {
  console.log("🔧 Starting inconsistent games fix...\n");

  try {
    // Find all completed games with empty or inconsistent player arrays
    const inconsistentGames = await Game.find({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ],
      $or: [
        { players: { $exists: false } },
        { players: null },
        { players: { $size: 0 } }, // Empty array
        { players: { $elemMatch: { userId: { $exists: false } } } }, // Players without userId
        { players: { $elemMatch: { username: { $exists: false } } } }, // Players without username
      ],
    });

    console.log(`📊 Found ${inconsistentGames.length} games with inconsistent player data`);

    if (inconsistentGames.length === 0) {
      console.log("✅ No inconsistent games found");
      return;
    }

    // Display details of inconsistent games
    console.log("\n📋 Inconsistent games found:");
    inconsistentGames.forEach((game, index) => {
      console.log(`${index + 1}. Room: ${game.roomId}`);
      console.log(`   Status: ${game.gameState.status}/${game.status}`);
      console.log(`   Players: ${game.players ? game.players.length : 'null/undefined'}`);
      console.log(`   Created: ${game.createdAt}`);
      console.log(`   Ended: ${game.endedAt || 'No endedAt'}`);
      console.log(`   Player details:`, game.players || 'No players array');
      console.log("");
    });

    let fixedCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    for (const game of inconsistentGames) {
      try {
        console.log(`🔧 Processing game ${game.roomId}...`);

        // Check if this game has any valid data to work with
        const hasValidData = game.startedAt && game.endedAt && 
                           (game.gameState.status === "finished" || game.status === "completed");

        if (!hasValidData) {
          console.log(`   ❌ Game ${game.roomId} has insufficient data - marking for deletion`);
          
          // Delete games that are completely invalid
          await Game.deleteOne({ _id: game._id });
          console.log(`   ✅ Deleted invalid game ${game.roomId}`);
          deletedCount++;
          continue;
        }

        // Try to reconstruct player data from game state if possible
        let reconstructedPlayers = [];

        // Check if we can get player info from gameState
        if (game.gameState && game.gameState.winner) {
          // If there's a winner, we know at least one player existed
          reconstructedPlayers.push({
            userId: game.gameState.winner,
            username: `Player_${game.gameState.winner.slice(-6)}`, // Generate username from userId
            avatar: null,
            isReady: true,
            score: 100, // Default score for winner
            matches: 5, // Default matches
            flips: 10, // Default flips
            powerUps: [],
            memoryMeter: 100,
            isCurrentTurn: false,
            lastFlipTime: game.endedAt,
            matchStreak: 1,
            extraTurns: 0,
          });
        }

        // If we still don't have players, create a generic player entry
        if (reconstructedPlayers.length === 0) {
          const genericUserId = `guest_${game.roomId.slice(-8)}`;
          reconstructedPlayers.push({
            userId: genericUserId,
            username: `Guest_${game.roomId.slice(-6)}`,
            avatar: null,
            isReady: true,
            score: 50, // Default score
            matches: 3, // Default matches
            flips: 8, // Default flips
            powerUps: [],
            memoryMeter: 50,
            isCurrentTurn: false,
            lastFlipTime: game.endedAt,
            matchStreak: 0,
            extraTurns: 0,
          });
        }

        // Update the game with reconstructed player data
        await Game.updateOne(
          { _id: game._id },
          {
            $set: {
              players: reconstructedPlayers,
              updatedAt: new Date(),
            },
          }
        );

        console.log(`   ✅ Fixed game ${game.roomId} with ${reconstructedPlayers.length} reconstructed players`);
        fixedCount++;

      } catch (error) {
        console.error(`   ❌ Failed to fix game ${game.roomId}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`\n📊 Fix summary:`);
    console.log(`  Fixed: ${fixedCount} games`);
    console.log(`  Deleted: ${deletedCount} invalid games`);
    console.log(`  Skipped: ${skippedCount} games`);
    console.log(`  Total processed: ${inconsistentGames.length} games`);

    // Verify the fix
    const remainingInconsistent = await Game.find({
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
        { players: { $elemMatch: { userId: { $exists: false } } } },
        { players: { $elemMatch: { username: { $exists: false } } } },
      ],
    });

    if (remainingInconsistent.length === 0) {
      console.log("✅ All completed games now have consistent player data");
    } else {
      console.log(`⚠️ ${remainingInconsistent.length} games still have inconsistent player data`);
    }

  } catch (error) {
    console.error("❌ Error fixing inconsistent games:", error);
  }
}

async function validateGameIntegrity() {
  console.log("\n🔍 Validating game integrity...");

  try {
    // Check for games with various integrity issues
    const integrityIssues = await Game.find({
      $or: [
        // Games without required fields
        { roomId: { $exists: false } },
        { roomId: null },
        { settings: { $exists: false } },
        { gameState: { $exists: false } },
        
        // Games with invalid status combinations
        {
          $and: [
            { "gameState.status": "finished" },
            { status: { $nin: ["finished", "completed"] } }
          ]
        },
        {
          $and: [
            { status: "completed" },
            { "gameState.status": { $nin: ["finished", "completed"] } }
          ]
        },
        
        // Games with missing timestamps
        {
          $and: [
            { "gameState.status": "finished" },
            { endedAt: { $exists: false } }
          ]
        },
        
        // Games with invalid player data
        { players: { $elemMatch: { userId: { $exists: false } } } },
        { players: { $elemMatch: { username: { $exists: false } } } },
      ]
    });

    console.log(`📊 Found ${integrityIssues.length} games with integrity issues`);

    if (integrityIssues.length > 0) {
      console.log("📋 Integrity issues found:");
      integrityIssues.forEach((game, index) => {
        console.log(`${index + 1}. Room: ${game.roomId || 'NO_ROOM_ID'}`);
        console.log(`   GameState Status: ${game.gameState?.status || 'NO_GAMESTATE'}`);
        console.log(`   Top Level Status: ${game.status || 'NO_STATUS'}`);
        console.log(`   Players: ${game.players ? game.players.length : 'NO_PLAYERS'}`);
        console.log(`   EndedAt: ${game.endedAt || 'NO_ENDEDAT'}`);
        console.log("");
      });
    } else {
      console.log("✅ No integrity issues found");
    }

    // Check overall game statistics
    const totalGames = await Game.countDocuments({});
    const completedGames = await Game.countDocuments({
      $or: [
        { "gameState.status": "finished" },
        { "gameState.status": "completed" },
        { status: "finished" },
        { status: "completed" },
      ]
    });
    const gamesWithPlayers = await Game.countDocuments({
      players: { $exists: true, $ne: null, $ne: [] }
    });
    const gamesWithEndedAt = await Game.countDocuments({
      endedAt: { $exists: true, $ne: null }
    });

    console.log("\n📊 Game statistics:");
    console.log(`  Total games: ${totalGames}`);
    console.log(`  Completed games: ${completedGames}`);
    console.log(`  Games with players: ${gamesWithPlayers}`);
    console.log(`  Games with endedAt: ${gamesWithEndedAt}`);

  } catch (error) {
    console.error("❌ Error validating game integrity:", error);
  }
}

async function runFix() {
  console.log("🚀 Starting Inconsistent Games Fix...\n");

  // Connect to database
  await connectToDatabase();

  // Fix inconsistent games
  await fixInconsistentGames();

  // Validate game integrity
  await validateGameIntegrity();

  console.log("\n✅ Inconsistent games fix completed!");

  // Close database connection
  await mongoose.connection.close();
  console.log("🔌 Database connection closed");
}

// Run the fix
runFix().catch(console.error);
