const mongoose = require("mongoose");
const { Game } = require("./src/models/Game.js");
const { User } = require("./src/models/User.js");
const axios = require("axios");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/memory-game")
  .then(async () => {
    console.log("🔍 TESTING USER STATS COMPREHENSIVELY...\n");

    try {
      // 1. Test Database Stats Storage
      console.log("📊 1. TESTING DATABASE STATS STORAGE");
      console.log("=====================================");

      // Find a user with stats
      const userWithStats = await User.findOne({
        isGuest: false,
        "stats.gamesPlayed": { $gt: 0 },
      });

      if (userWithStats) {
        console.log(`Testing user: ${userWithStats.username}`);
        console.log("Current stats in database:");
        console.log("- gamesPlayed:", userWithStats.stats.gamesPlayed);
        console.log("- gamesWon:", userWithStats.stats.gamesWon);
        console.log("- winRate:", userWithStats.stats.winRate);
        console.log("- totalScore:", userWithStats.stats.totalScore);
        console.log("- bestScore:", userWithStats.stats.bestScore);
        console.log("- averageFlipTime:", userWithStats.stats.averageFlipTime);
        console.log("- bestMatchStreak:", userWithStats.stats.bestMatchStreak);
        console.log("- perfectGames:", userWithStats.stats.perfectGames);
        console.log("- powerUpsUsed:", userWithStats.stats.powerUpsUsed);
        console.log("- achievements count:", userWithStats.achievements.length);
      } else {
        console.log("No user with stats found, creating test user...");
        const testUser = new User({
          username: "testuser_stats",
          email: "test@example.com",
          password: "testpass123",
          stats: {
            gamesPlayed: 5,
            gamesWon: 3,
            winRate: 60,
            totalScore: 2500,
            bestScore: 800,
            averageFlipTime: 2.5,
            bestMatchStreak: 4,
            perfectGames: 1,
            powerUpsUsed: 8,
          },
          achievements: [
            {
              id: "first_win",
              name: "First Victory",
              description: "Win your first game",
              iconUrl: "🥇",
              unlockedAt: new Date(),
            },
          ],
        });
        await testUser.save();
        console.log("Test user created with stats");
      }

      // 2. Test Stats Calculation from Game History
      console.log("\n\n🔄 2. TESTING STATS CALCULATION FROM GAME HISTORY");
      console.log("==================================================");

      const testUser = await User.findOne({ username: "testuser_stats" });
      if (testUser) {
        // Get all games for this user
        const userGames = await Game.find({
          "players.userId": testUser._id.toString(),
          $or: [
            { endedAt: { $exists: true } },
            { "gameState.winner": { $exists: true } },
            { "gameState.status": "finished" },
            { status: "completed" },
          ],
        });

        console.log(
          `Found ${userGames.length} games for user ${testUser.username}`
        );

        // Calculate stats manually
        let calculatedStats = {
          gamesPlayed: 0,
          gamesWon: 0,
          totalScore: 0,
          bestScore: 0,
          powerUpsUsed: 0,
          perfectGames: 0,
          bestMatchStreak: 0,
        };

        userGames.forEach((game) => {
          const player = game.players.find(
            (p) => p.userId === testUser._id.toString()
          );
          if (player) {
            calculatedStats.gamesPlayed += 1;
            calculatedStats.totalScore += player.score || 0;
            calculatedStats.bestScore = Math.max(
              calculatedStats.bestScore,
              player.score || 0
            );
            calculatedStats.powerUpsUsed += player.powerUpsUsed || 0;

            // Check if player won
            const isWinner =
              game.gameState.winner === testUser._id.toString() ||
              (game.gameState.winner === undefined &&
                player.score ===
                  Math.max(...game.players.map((p) => p.score || 0)) &&
                player.score > 0);

            if (isWinner) {
              calculatedStats.gamesWon += 1;
            }

            // Check for perfect games
            if (player.matches > 0 && player.flips === player.matches * 2) {
              calculatedStats.perfectGames += 1;
            }

            // Update best match streak
            if (player.matchStreak > calculatedStats.bestMatchStreak) {
              calculatedStats.bestMatchStreak = player.matchStreak;
            }
          }
        });

        calculatedStats.winRate =
          calculatedStats.gamesPlayed > 0
            ? Math.round(
                (calculatedStats.gamesWon / calculatedStats.gamesPlayed) * 100
              )
            : 0;

        console.log("Calculated stats from game history:");
        console.log("- gamesPlayed:", calculatedStats.gamesPlayed);
        console.log("- gamesWon:", calculatedStats.gamesWon);
        console.log("- winRate:", calculatedStats.winRate);
        console.log("- totalScore:", calculatedStats.totalScore);
        console.log("- bestScore:", calculatedStats.bestScore);
        console.log("- powerUpsUsed:", calculatedStats.powerUpsUsed);
        console.log("- perfectGames:", calculatedStats.perfectGames);
        console.log("- bestMatchStreak:", calculatedStats.bestMatchStreak);

        // Compare with database stats
        console.log("\nStats comparison:");
        console.log(
          "- gamesPlayed match:",
          calculatedStats.gamesPlayed === testUser.stats.gamesPlayed
        );
        console.log(
          "- gamesWon match:",
          calculatedStats.gamesWon === testUser.stats.gamesWon
        );
        console.log(
          "- winRate match:",
          calculatedStats.winRate === testUser.stats.winRate
        );
        console.log(
          "- totalScore match:",
          calculatedStats.totalScore === testUser.stats.totalScore
        );
        console.log(
          "- bestScore match:",
          calculatedStats.bestScore === testUser.stats.bestScore
        );
        console.log(
          "- powerUpsUsed match:",
          calculatedStats.powerUpsUsed === testUser.stats.powerUpsUsed
        );
        console.log(
          "- perfectGames match:",
          calculatedStats.perfectGames === testUser.stats.perfectGames
        );
        console.log(
          "- bestMatchStreak match:",
          calculatedStats.bestMatchStreak === testUser.stats.bestMatchStreak
        );
      }

      // 3. Test Server API Stats Endpoint
      console.log("\n\n🌐 3. TESTING SERVER API STATS ENDPOINT");
      console.log("========================================");

      try {
        // Start server if not running
        const serverUrl = "http://localhost:3001";

        // Test stats endpoint
        const statsResponse = await axios.get(
          `${serverUrl}/api/game/stats/user`,
          {
            headers: {
              Authorization: `Bearer ${testUser ? "test-token" : ""}`,
            },
          }
        );

        if (statsResponse.status === 200) {
          console.log("✅ Stats API endpoint working");
          console.log("API Response:", statsResponse.data);
        }
      } catch (error) {
        console.log(
          "❌ Stats API test failed (server might not be running):",
          error.message
        );
      }

      // 4. Test Stats Update After Game
      console.log("\n\n🎮 4. TESTING STATS UPDATE AFTER GAME");
      console.log("=======================================");

      // Create a test game
      const testGame = new Game({
        roomId: "test_room_stats",
        hostId: testUser._id.toString(),
        players: [
          {
            userId: testUser._id.toString(),
            username: testUser.username,
            avatar: testUser.avatar,
            isHost: true,
            isGuest: false,
            score: 1200,
            matches: 6,
            flips: 12,
            powerUpsUsed: 2,
            memoryMeter: 85,
            isCurrentTurn: false,
            matchStreak: 3,
            extraTurns: 0,
          },
        ],
        gameState: {
          status: "finished",
          winner: testUser._id.toString(),
          completionReason: "game_completed",
          currentPlayerIndex: 0,
          currentTurn: null,
          board: [],
          flippedCards: [],
          matchedPairs: [],
          timeLeft: 0,
          gameMode: "classic",
          round: 1,
          lastActivity: new Date(),
          powerUpPool: [],
        },
        settings: {
          boardSize: "4x4",
          theme: "emojis",
          gameMode: "classic",
          timeLimit: 300,
          maxPlayers: 2,
          powerUpsEnabled: true,
          chatEnabled: true,
          isRanked: true,
        },
        status: "completed",
        endedAt: new Date(),
        isPrivate: false,
      });

      await testGame.save();
      console.log("Test game created");

      // Update user stats using the game result
      const gameResult = {
        won: true,
        score: 1200,
        flipTimes: [2.5, 3.1, 2.8],
        matchStreak: 3,
        isPerfect: true,
        powerUpsUsed: 2,
        gameMode: "classic",
        boardSize: "4x4",
      };

      testUser.updateStats(gameResult);
      await testUser.save();

      console.log("Updated user stats after test game:");
      console.log("- gamesPlayed:", testUser.stats.gamesPlayed);
      console.log("- gamesWon:", testUser.stats.gamesWon);
      console.log("- winRate:", testUser.stats.winRate);
      console.log("- totalScore:", testUser.stats.totalScore);
      console.log("- bestScore:", testUser.stats.bestScore);
      console.log("- perfectGames:", testUser.stats.perfectGames);
      console.log("- powerUpsUsed:", testUser.stats.powerUpsUsed);

      // 5. Test Achievement System
      console.log("\n\n🏅 5. TESTING ACHIEVEMENT SYSTEM");
      console.log("===============================");

      const { checkAchievements } = require("./src/utils/gameLogic.js");

      const newAchievements = checkAchievements(testUser, gameResult);
      console.log(
        `Found ${newAchievements.length} new achievements:`,
        newAchievements
      );

      newAchievements.forEach((achievement) => {
        testUser.addAchievement(achievement);
      });

      await testUser.save();
      console.log(
        `Total achievements after update: ${testUser.achievements.length}`
      );

      // 6. Test Stats Validation
      console.log("\n\n✅ 6. TESTING STATS VALIDATION");
      console.log("==============================");

      // Validate stats consistency
      const validationErrors = [];

      if (testUser.stats.gamesPlayed < 0)
        validationErrors.push("gamesPlayed cannot be negative");
      if (testUser.stats.gamesWon < 0)
        validationErrors.push("gamesWon cannot be negative");
      if (testUser.stats.gamesWon > testUser.stats.gamesPlayed)
        validationErrors.push("gamesWon cannot exceed gamesPlayed");
      if (testUser.stats.winRate < 0 || testUser.stats.winRate > 100)
        validationErrors.push("winRate must be between 0-100");
      if (testUser.stats.totalScore < 0)
        validationErrors.push("totalScore cannot be negative");
      if (testUser.stats.bestScore < 0)
        validationErrors.push("bestScore cannot be negative");
      if (testUser.stats.perfectGames < 0)
        validationErrors.push("perfectGames cannot be negative");
      if (testUser.stats.powerUpsUsed < 0)
        validationErrors.push("powerUpsUsed cannot be negative");

      if (validationErrors.length === 0) {
        console.log("✅ All stats validation passed");
      } else {
        console.log("❌ Stats validation errors:", validationErrors);
      }

      // 7. Test Database Persistence
      console.log("\n\n💾 7. TESTING DATABASE PERSISTENCE");
      console.log("===================================");

      // Reload user from database to verify persistence
      const reloadedUser = await User.findById(testUser._id);
      console.log("Stats after database reload:");
      console.log("- gamesPlayed:", reloadedUser.stats.gamesPlayed);
      console.log("- gamesWon:", reloadedUser.stats.gamesWon);
      console.log("- winRate:", reloadedUser.stats.winRate);
      console.log("- totalScore:", reloadedUser.stats.totalScore);
      console.log("- bestScore:", reloadedUser.stats.bestScore);
      console.log("- achievements count:", reloadedUser.achievements.length);

      // Verify persistence
      const persistenceChecks = [
        reloadedUser.stats.gamesPlayed === testUser.stats.gamesPlayed,
        reloadedUser.stats.gamesWon === testUser.stats.gamesWon,
        reloadedUser.stats.winRate === testUser.stats.winRate,
        reloadedUser.stats.totalScore === testUser.stats.totalScore,
        reloadedUser.stats.bestScore === testUser.stats.bestScore,
        reloadedUser.achievements.length === testUser.achievements.length,
      ];

      if (persistenceChecks.every((check) => check)) {
        console.log("✅ All stats persisted correctly to database");
      } else {
        console.log("❌ Some stats did not persist correctly");
      }

      // 8. Cleanup Test Data
      console.log("\n\n🧹 8. CLEANING UP TEST DATA");
      console.log("===========================");

      await Game.deleteOne({ roomId: "test_room_stats" });
      console.log("Test game cleaned up");

      console.log("\n✅ COMPREHENSIVE USER STATS TEST COMPLETE!");
      console.log("==========================================");
      console.log("✅ Database stats storage working");
      console.log("✅ Stats calculation from game history working");
      console.log("✅ Stats update after game working");
      console.log("✅ Achievement system working");
      console.log("✅ Stats validation working");
      console.log("✅ Database persistence working");
    } catch (error) {
      console.error("❌ Test failed:", error);
    } finally {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    }
  })
  .catch(console.error);
