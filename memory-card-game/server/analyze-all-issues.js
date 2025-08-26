const mongoose = require("mongoose");
const { Game } = require("./src/models/Game.js");
const { User } = require("./src/models/User.js");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/memory-game")
  .then(async () => {
    console.log("🔍 ANALYZING ALL ISSUES...\n");

    try {
      // 1. Check Game Schema and Data
      console.log("📊 1. GAME SCHEMA AND DATA ANALYSIS");
      console.log("=====================================");

      const games = await Game.find({}).limit(10);
      console.log(`Total games in database: ${await Game.countDocuments()}`);

      if (games.length > 0) {
        console.log("\nSample game structure:");
        const sampleGame = games[0];
        console.log(
          "- gameState fields:",
          Object.keys(sampleGame.gameState || {})
        );
        console.log(
          "- gameState.winner exists:",
          !!sampleGame.gameState?.winner
        );
        console.log(
          "- gameState.completionReason exists:",
          !!sampleGame.gameState?.completionReason
        );
        console.log("- hostId exists:", !!sampleGame.hostId);
        console.log(
          "- players with isHost:",
          sampleGame.players?.filter((p) => p.isHost).length || 0
        );
        console.log(
          "- players with isGuest:",
          sampleGame.players?.filter((p) => p.isGuest).length || 0
        );
        console.log(
          "- players with powerUpsUsed:",
          sampleGame.players?.filter((p) => p.powerUpsUsed > 0).length || 0
        );
      }

      // 2. Check User Schema and Stats
      console.log("\n\n👤 2. USER SCHEMA AND STATS ANALYSIS");
      console.log("=====================================");

      const users = await User.find({}).limit(10);
      console.log(`Total users in database: ${await User.countDocuments()}`);

      if (users.length > 0) {
        console.log("\nSample user structure:");
        const sampleUser = users[0];
        console.log("- stats fields:", Object.keys(sampleUser.stats || {}));
        console.log(
          "- achievements count:",
          sampleUser.achievements?.length || 0
        );
        console.log("- bestScore:", sampleUser.stats?.bestScore || 0);
        console.log("- gamesPlayed:", sampleUser.stats?.gamesPlayed || 0);
        console.log("- gamesWon:", sampleUser.stats?.gamesWon || 0);
      }

      // 3. Check Match History Issues
      console.log("\n\n📈 3. MATCH HISTORY ANALYSIS");
      console.log("=============================");

      const completedGames = await Game.find({
        $or: [
          { endedAt: { $exists: true } },
          { "gameState.winner": { $exists: true } },
          { "gameState.status": "finished" },
          { status: "completed" },
        ],
      }).limit(5);

      console.log(`Completed games found: ${completedGames.length}`);

      completedGames.forEach((game, index) => {
        console.log(`\nGame ${index + 1} (${game.roomId}):`);
        console.log(
          `- Status: ${game.status}, GameState: ${game.gameState?.status}`
        );
        console.log(`- Winner: ${game.gameState?.winner || "Not set"}`);
        console.log(`- Players: ${game.players?.length || 0}`);
        console.log(`- EndedAt: ${game.endedAt || "Not set"}`);
        console.log(
          `- CompletionReason: ${game.gameState?.completionReason || "Not set"}`
        );
      });

      // 4. Check Winner Assignment Issues
      console.log("\n\n🏆 4. WINNER ASSIGNMENT ANALYSIS");
      console.log("================================");

      const gamesWithWinners = await Game.find({
        "gameState.winner": { $exists: true, $ne: null },
      });

      console.log(`Games with winners: ${gamesWithWinners.length}`);

      const gamesWithoutWinners = await Game.find({
        $or: [{ "gameState.status": "finished" }, { status: "completed" }],
        "gameState.winner": { $exists: false },
      });

      console.log(
        `Completed games without winners: ${gamesWithoutWinners.length}`
      );

      // 5. Check Achievement Issues
      console.log("\n\n🏅 5. ACHIEVEMENT ANALYSIS");
      console.log("==========================");

      const usersWithAchievements = await User.find({
        "achievements.0": { $exists: true },
      });

      console.log(`Users with achievements: ${usersWithAchievements.length}`);

      if (usersWithAchievements.length > 0) {
        const sampleUserWithAchievements = usersWithAchievements[0];
        console.log("\nSample achievements:");
        sampleUserWithAchievements.achievements?.forEach(
          (achievement, index) => {
            console.log(
              `- ${index + 1}. ${achievement.name}: ${
                achievement.unlocked ? "Unlocked" : "Locked"
              }`
            );
          }
        );
      }

      // 6. Check Database Schema Issues
      console.log("\n\n🗄️ 6. DATABASE SCHEMA ANALYSIS");
      console.log("=============================");

      // Check if Game schema has all required fields
      const gameSchema = Game.schema.obj;
      console.log("Game schema fields:");
      console.log("- gameState.winner:", !!gameSchema.gameState?.winner);
      console.log(
        "- gameState.completionReason:",
        !!gameSchema.gameState?.completionReason
      );
      console.log("- hostId:", !!gameSchema.hostId);
      console.log("- players[].isHost:", !!gameSchema.players?.isHost);
      console.log("- players[].isGuest:", !!gameSchema.players?.isGuest);
      console.log(
        "- players[].powerUpsUsed:",
        !!gameSchema.players?.powerUpsUsed
      );

      // 7. Check for Data Inconsistencies
      console.log("\n\n⚠️ 7. DATA INCONSISTENCY ANALYSIS");
      console.log("==================================");

      const inconsistentGames = await Game.find({
        $or: [
          { players: { $size: 0 }, status: { $in: ["playing", "finished"] } },
          { "gameState.status": "finished", endedAt: { $exists: false } },
          {
            endedAt: { $exists: true },
            "gameState.winner": { $exists: false },
          },
        ],
      });

      console.log(`Inconsistent games found: ${inconsistentGames.length}`);

      // 8. Recommendations
      console.log("\n\n💡 8. RECOMMENDATIONS");
      console.log("=====================");

      if (gamesWithWinners.length === 0) {
        console.log(
          "❌ No games have winners assigned - winner assignment logic needs fixing"
        );
      }

      if (gamesWithoutWinners.length > 0) {
        console.log(
          "❌ Some completed games lack winners - need to fix winner assignment"
        );
      }

      if (usersWithAchievements.length === 0) {
        console.log(
          "❌ No users have achievements - achievement system may not be working"
        );
      }

      if (inconsistentGames.length > 0) {
        console.log("❌ Found inconsistent game data - need data cleanup");
      }

      console.log("\n✅ Analysis complete!");
    } catch (error) {
      console.error("❌ Analysis failed:", error);
    } finally {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    }
  })
  .catch(console.error);
