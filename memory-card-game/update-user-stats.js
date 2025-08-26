const mongoose = require("mongoose");
const { User } = require("./server/src/models/User.js");
const { Game } = require("./server/src/models/Game.js");

// MongoDB connection
const MONGODB_URI =
  "mongodb+srv://abhinav:yP2i3MrJ9vZjB8Ff@cluster0.en1oo.mongodb.net/memory_game?retryWrites=true&w=majority&appName=Cluster0";

async function updateUserStats() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get all users
    const users = await User.find({ isGuest: false });
    console.log(`Found ${users.length} users to update`);

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.username}`);

      // Get all games for this user
      const userGames = await Game.find({
        "players.userId": user._id.toString(),
        $and: [
          {
            $or: [
              { "gameState.status": { $nin: ["waiting", "starting"] } },
              { status: { $nin: ["waiting", "starting"] } },
            ],
          },
          {
            $or: [
              { "gameState.status": { $exists: true } },
              { status: { $exists: true } },
            ],
          },
        ],
      });

      console.log(`Found ${userGames.length} games for ${user.username}`);

      if (userGames.length > 0) {
        // Calculate best score from game history
        let bestScore = 0;
        let totalScore = 0;
        let gamesWon = 0;
        let gamesPlayed = userGames.length;

        userGames.forEach((game) => {
          const player = game.players.find(
            (p) => p.userId === user._id.toString()
          );
          if (player) {
            const score = player.score || 0;
            totalScore += score;
            bestScore = Math.max(bestScore, score);

            // Check if player won
            const isWinner =
              game.gameState.winner === user._id.toString() ||
              (game.gameState.winner === undefined &&
                player.score ===
                  Math.max(...game.players.map((p) => p.score || 0)));

            if (isWinner) {
              gamesWon++;
            }
          }
        });

        // Update user stats
        const winRate = gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0;

        // Ensure stats object exists
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

        // Update stats
        user.stats.gamesPlayed = gamesPlayed;
        user.stats.gamesWon = gamesWon;
        user.stats.winRate = Math.round(winRate);
        user.stats.totalScore = totalScore;
        user.stats.bestScore = bestScore;

        await user.save();
        console.log(
          `✅ Updated ${user.username}: ${gamesPlayed} games, ${gamesWon} wins, best score: ${bestScore}`
        );
      } else {
        console.log(`⚠️  No games found for ${user.username}`);
      }
    }

    console.log("\n🎉 User stats update completed!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the update
updateUserStats();
