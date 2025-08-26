const mongoose = require("mongoose");
const { Game } = require("./src/models/Game.js");
const { User } = require("./src/models/User.js");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/memory-game")
  .then(async () => {
    console.log("🔧 FIXING ALL ISSUES...\n");

    try {
      // 1. Fix Winner Assignment Issues
      console.log("🏆 1. FIXING WINNER ASSIGNMENT ISSUES");
      console.log("=====================================");

      // Find completed games without winners
      const gamesWithoutWinners = await Game.find({
        $or: [{ "gameState.status": "finished" }, { status: "completed" }],
        $or: [
          { "gameState.winner": { $exists: false } },
          { "gameState.winner": null },
        ],
      });

      console.log(
        `Found ${gamesWithoutWinners.length} completed games without winners`
      );

      for (const game of gamesWithoutWinners) {
        // Determine winner based on score
        const sortedPlayers = [...game.players].sort(
          (a, b) => b.score - a.score
        );

        if (sortedPlayers.length > 0 && sortedPlayers[0].score > 0) {
          // Set winner to player with highest score
          game.gameState.winner = sortedPlayers[0].userId;
          game.gameState.completionReason = "game_completed";
          console.log(
            `Fixed winner for game ${game.roomId}: ${sortedPlayers[0].username}`
          );
        } else if (game.players.length === 1) {
          // Only one player left - they are the winner
          game.gameState.winner = game.players[0].userId;
          game.gameState.completionReason = "opponents_left";
          console.log(
            `Fixed winner for game ${game.roomId}: ${game.players[0].username} (opponents left)`
          );
        } else {
          // No valid winner - mark as no winner
          game.gameState.completionReason = "no_winner";
          console.log(`Game ${game.roomId}: No valid winner found`);
        }

        await game.save();
      }

      // 2. Fix Match History Data Issues
      console.log("\n\n📈 2. FIXING MATCH HISTORY DATA ISSUES");
      console.log("========================================");

      // Find games with missing endedAt timestamps
      const gamesWithoutEndedAt = await Game.find({
        $or: [{ "gameState.status": "finished" }, { status: "completed" }],
        endedAt: { $exists: false },
      });

      console.log(
        `Found ${gamesWithoutEndedAt.length} games without endedAt timestamps`
      );

      for (const game of gamesWithoutEndedAt) {
        // Set endedAt to updatedAt if available, otherwise to current time
        game.endedAt = game.updatedAt || new Date();
        await game.save();
        console.log(`Fixed endedAt for game ${game.roomId}`);
      }

      // 3. Fix User Stats Issues
      console.log("\n\n👤 3. FIXING USER STATS ISSUES");
      console.log("===============================");

      // Find users with missing or incorrect stats
      const usersWithStatsIssues = await User.find({
        $or: [
          { stats: { $exists: false } },
          { "stats.gamesPlayed": { $exists: false } },
          { "stats.bestScore": { $exists: false } },
        ],
      });

      console.log(
        `Found ${usersWithStatsIssues.length} users with stats issues`
      );

      for (const user of usersWithStatsIssues) {
        // Initialize stats if missing
        if (!user.stats) {
          user.stats = {
            gamesPlayed: 0,
            gamesWon: 0,
            winRate: 0,
            totalScore: 0,
            bestScore: 0,
            averageFlipTime: 0,
            bestMatchStreak: 0,
            perfectGames: 0,
            powerUpsUsed: 0,
          };
        }

        // Ensure all stats fields exist
        const defaultStats = {
          gamesPlayed: 0,
          gamesWon: 0,
          winRate: 0,
          totalScore: 0,
          bestScore: 0,
          averageFlipTime: 0,
          bestMatchStreak: 0,
          perfectGames: 0,
          powerUpsUsed: 0,
        };

        for (const [key, defaultValue] of Object.entries(defaultStats)) {
          if (user.stats[key] === undefined) {
            user.stats[key] = defaultValue;
          }
        }

        await user.save();
        console.log(`Fixed stats for user ${user.username}`);
      }

      // 4. Recalculate User Stats from Game History
      console.log("\n\n🔄 4. RECALCULATING USER STATS FROM GAME HISTORY");
      console.log("==================================================");

      const allUsers = await User.find({ isGuest: false });

      for (const user of allUsers) {
        // Get all games for this user
        const userGames = await Game.find({
          "players.userId": user._id.toString(),
          $or: [
            { endedAt: { $exists: true } },
            { "gameState.winner": { $exists: true } },
            { "gameState.status": "finished" },
            { status: "completed" },
          ],
        });

        // Reset stats
        user.stats = {
          gamesPlayed: 0,
          gamesWon: 0,
          winRate: 0,
          totalScore: 0,
          bestScore: 0,
          averageFlipTime: 0,
          bestMatchStreak: 0,
          perfectGames: 0,
          powerUpsUsed: 0,
        };

        // Recalculate from game history
        for (const game of userGames) {
          const player = game.players.find(
            (p) => p.userId === user._id.toString()
          );
          if (player) {
            user.stats.gamesPlayed += 1;
            user.stats.totalScore += player.score || 0;
            user.stats.bestScore = Math.max(
              user.stats.bestScore,
              player.score || 0
            );
            user.stats.powerUpsUsed += player.powerUpsUsed || 0;

            // Check if player won
            const isWinner =
              game.gameState.winner === user._id.toString() ||
              (game.gameState.winner === undefined &&
                player.score ===
                  Math.max(...game.players.map((p) => p.score || 0)) &&
                player.score > 0);

            if (isWinner) {
              user.stats.gamesWon += 1;
            }

            // Check for perfect games
            if (player.matches > 0 && player.flips === player.matches * 2) {
              user.stats.perfectGames += 1;
            }

            // Update best match streak
            if (player.matchStreak > user.stats.bestMatchStreak) {
              user.stats.bestMatchStreak = player.matchStreak;
            }
          }
        }

        // Calculate win rate
        if (user.stats.gamesPlayed > 0) {
          user.stats.winRate = Math.round(
            (user.stats.gamesWon / user.stats.gamesPlayed) * 100
          );
        }

        await user.save();
        console.log(
          `Recalculated stats for ${user.username}: ${user.stats.gamesPlayed} games, ${user.stats.gamesWon} wins, best score: ${user.stats.bestScore}`
        );
      }

      // 5. Fix Achievement Issues
      console.log("\n\n🏅 5. FIXING ACHIEVEMENT ISSUES");
      console.log("===============================");

      const { checkAchievements } = require("./src/utils/gameLogic.js");

      for (const user of allUsers) {
        // Get user's game history
        const userGames = await Game.find({
          "players.userId": user._id.toString(),
          $or: [
            { endedAt: { $exists: true } },
            { "gameState.winner": { $exists: true } },
            { "gameState.status": "finished" },
            { status: "completed" },
          ],
        }).sort({ endedAt: 1 }); // Sort by completion time

        // Check achievements for each game
        for (const game of userGames) {
          const player = game.players.find(
            (p) => p.userId === user._id.toString()
          );
          if (player) {
            const isWinner =
              game.gameState.winner === user._id.toString() ||
              (game.gameState.winner === undefined &&
                player.score ===
                  Math.max(...game.players.map((p) => p.score || 0)) &&
                player.score > 0);

            const gameResult = {
              won: isWinner,
              score: player.score || 0,
              flipTimes: [0], // Simplified
              matchStreak: player.matchStreak || 0,
              isPerfect:
                player.matches > 0 && player.flips === player.matches * 2,
              powerUpsUsed: player.powerUpsUsed || 0,
              gameMode: game.settings.gameMode,
              boardSize: game.settings.boardSize,
            };

            // Check for new achievements
            const newAchievements = checkAchievements(user, gameResult);
            newAchievements.forEach((achievement) => {
              user.addAchievement(achievement);
            });
          }
        }

        await user.save();
        console.log(
          `Fixed achievements for ${user.username}: ${user.achievements.length} achievements`
        );
      }

      // 6. Fix Database Schema Issues
      console.log("\n\n🗄️ 6. FIXING DATABASE SCHEMA ISSUES");
      console.log("=====================================");

      // Ensure all games have proper schema fields
      const allGames = await Game.find({});

      for (const game of allGames) {
        let needsUpdate = false;

        // Ensure gameState exists
        if (!game.gameState) {
          game.gameState = {
            status: game.status || "waiting",
            currentPlayerIndex: 0,
            currentTurn: null,
            board: [],
            flippedCards: [],
            matchedPairs: [],
            timeLeft: 0,
            gameMode: game.settings?.gameMode || "classic",
            round: 1,
            lastActivity: new Date(),
            powerUpPool: [],
            winner: null,
            completionReason: null,
          };
          needsUpdate = true;
        }

        // Ensure players have all required fields
        if (game.players) {
          for (const player of game.players) {
            if (player.isHost === undefined) {
              player.isHost = false;
              needsUpdate = true;
            }
            if (player.isGuest === undefined) {
              player.isGuest = false;
              needsUpdate = true;
            }
            if (player.powerUpsUsed === undefined) {
              player.powerUpsUsed = 0;
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate) {
          await game.save();
          console.log(`Fixed schema issues for game ${game.roomId}`);
        }
      }

      console.log("\n✅ ALL ISSUES FIXED!");
      console.log("=====================");
      console.log("✅ Winner assignment fixed");
      console.log("✅ Match history data fixed");
      console.log("✅ User stats recalculated");
      console.log("✅ Achievements fixed");
      console.log("✅ Database schema issues fixed");
    } catch (error) {
      console.error("❌ Fix failed:", error);
    } finally {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    }
  })
  .catch(console.error);
