const { Game } = require("./src/models/Game.js");

async function debugMatchHistory() {
  console.log("🔍 Debugging Match History Issue...\n");

  try {
    // First, let's see all games in the database
    const allGames = await Game.find({})
      .select(
        "roomId gameState.status status createdAt updatedAt endedAt players"
      )
      .limit(20);

    console.log(`📊 Total games in database: ${allGames.length}`);
    console.log("📋 Sample games:");
    allGames.slice(0, 5).forEach((game, index) => {
      console.log(`  ${index + 1}. Room: ${game.roomId}`);
      console.log(
        `     Game State Status: ${game.gameState?.status || "null"}`
      );
      console.log(`     Top Level Status: ${game.status || "null"}`);
      console.log(`     Players: ${game.players?.length || 0}`);
      console.log(`     Ended At: ${game.endedAt || "null"}`);
      console.log(`     Created: ${game.createdAt?.toISOString()}`);
      console.log("");
    });

    // Check for games with players
    const gamesWithPlayers = await Game.find({
      "players.0": { $exists: true },
    })
      .select("roomId gameState.status status players")
      .limit(10);

    console.log(`📊 Games with players: ${gamesWithPlayers.length}`);

    if (gamesWithPlayers.length > 0) {
      // Get a sample user ID from the first game
      const sampleUserId = gamesWithPlayers[0].players[0].userId;
      console.log(`🔍 Using sample user ID: ${sampleUserId}`);

      // Check all games for this user
      const userGames = await Game.find({
        "players.userId": sampleUserId,
      }).select(
        "roomId gameState.status status createdAt updatedAt endedAt players"
      );

      console.log(
        `📊 Total games for user ${sampleUserId}: ${userGames.length}`
      );
      console.log("📋 User games:");
      userGames.forEach((game, index) => {
        console.log(`  ${index + 1}. Room: ${game.roomId}`);
        console.log(
          `     Game State Status: ${game.gameState?.status || "null"}`
        );
        console.log(`     Top Level Status: ${game.status || "null"}`);
        console.log(`     Ended At: ${game.endedAt || "null"}`);
        console.log(`     Created: ${game.createdAt?.toISOString()}`);
        console.log(`     Updated: ${game.updatedAt?.toISOString()}`);
        console.log("");
      });

      // Test the current query logic
      const currentQuery = {
        "players.userId": sampleUserId,
        $or: [
          {
            "gameState.status": {
              $in: ["completed", "finished", "sudden-death"],
            },
          },
          { status: { $in: ["completed", "finished"] } },
          { endedAt: { $exists: true } },
          { "gameState.winner": { $exists: true } },
        ],
      };

      const currentQueryResults = await Game.find(currentQuery)
        .select("roomId gameState.status status endedAt createdAt")
        .sort({ endedAt: -1 })
        .limit(10);

      console.log(`📊 Current query results: ${currentQueryResults.length}`);
      console.log("📋 Current query results:");
      currentQueryResults.forEach((game, index) => {
        console.log(`  ${index + 1}. Room: ${game.roomId}`);
        console.log(
          `     Game State Status: ${game.gameState?.status || "null"}`
        );
        console.log(`     Top Level Status: ${game.status || "null"}`);
        console.log(`     Ended At: ${game.endedAt || "null"}`);
        console.log("");
      });

      // Test a more inclusive query
      const inclusiveQuery = {
        "players.userId": sampleUserId,
        $or: [
          { "gameState.status": { $nin: ["waiting", "starting"] } },
          { status: { $nin: ["waiting", "starting"] } },
          { endedAt: { $exists: true } },
          { "gameState.winner": { $exists: true } },
        ],
      };

      const inclusiveQueryResults = await Game.find(inclusiveQuery)
        .select("roomId gameState.status status endedAt createdAt")
        .sort({ endedAt: -1, createdAt: -1 })
        .limit(10);

      console.log(
        `📊 Inclusive query results: ${inclusiveQueryResults.length}`
      );
      console.log("📋 Inclusive query results:");
      inclusiveQueryResults.forEach((game, index) => {
        console.log(`  ${index + 1}. Room: ${game.roomId}`);
        console.log(
          `     Game State Status: ${game.gameState?.status || "null"}`
        );
        console.log(`     Top Level Status: ${game.status || "null"}`);
        console.log(`     Ended At: ${game.endedAt || "null"}`);
        console.log("");
      });

      // Check what games are being excluded
      const excludedGames = userGames.filter((game) => {
        const hasEndedAt = game.endedAt !== undefined;
        const hasWinner = game.gameState?.winner !== undefined;
        const isCompleted =
          game.gameState?.status === "completed" || game.status === "completed";
        const isFinished =
          game.gameState?.status === "finished" || game.status === "finished";
        const isSuddenDeath = game.gameState?.status === "sudden-death";

        return (
          !hasEndedAt &&
          !hasWinner &&
          !isCompleted &&
          !isFinished &&
          !isSuddenDeath
        );
      });

      console.log(`📊 Excluded games: ${excludedGames.length}`);
      if (excludedGames.length > 0) {
        console.log("📋 Excluded games:");
        excludedGames.forEach((game, index) => {
          console.log(`  ${index + 1}. Room: ${game.roomId}`);
          console.log(
            `     Game State Status: ${game.gameState?.status || "null"}`
          );
          console.log(`     Top Level Status: ${game.status || "null"}`);
          console.log(`     Ended At: ${game.endedAt || "null"}`);
          console.log(`     Winner: ${game.gameState?.winner || "null"}`);
          console.log("");
        });
      }
    } else {
      console.log("❌ No games with players found");
    }
  } catch (error) {
    console.log("❌ Debug failed:", error.message);
    console.error(error);
  }
}

// Run the debug
debugMatchHistory().catch(console.error);
