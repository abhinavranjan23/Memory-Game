const express = require("express");
const { Game } = require("../models/Game.js");
const { User } = require("../models/User.js");
const auth = require("../middleware/auth.js");
const antiCheatSystem = require("../utils/antiCheat.js");
// Global variable to store socket.io instance
let io;

// Function to set socket.io instance
const setSocketIO = (socketIO) => {
  io = socketIO;
};

const router = express.Router();

// Optional auth middleware for routes that can work with or without auth
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return next(); // Continue without auth
    }

    // Try to authenticate, but don't fail if token is invalid
    await auth(req, res, next);
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
};

// Get available rooms (both public and private) - NO AUTH REQUIRED (but optional for personalized results)
router.get("/rooms", optionalAuth, async (req, res) => {
  try {
    const games = await Game.find({
      $and: [
        { "gameState.status": { $in: ["waiting", "starting"] } },
        { status: { $nin: ["completed", "finished"] } },
        { "gameState.status": { $nin: ["completed", "finished"] } },
        // Show rooms that are not full (including empty rooms)
        { $expr: { $lt: [{ $size: "$players" }, "$settings.maxPlayers"] } },
        // Not older than 24 hours
        { createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        // Not stale (updated within last 1 hour)
        { updatedAt: { $gt: new Date(Date.now() - 1 * 60 * 60 * 1000) } },
      ],
    })
      .limit(20)
      .select("roomId players gameState settings createdAt isPrivate")
      .sort({ createdAt: -1 })
      .exec();

    const rooms = games.map((game) => ({
      roomId: game.roomId,
      playerCount: game.players.length,
      maxPlayers: game.settings.maxPlayers,
      gameMode: game.settings.gameMode,
      boardSize: game.settings.boardSize,
      theme: game.settings.theme,
      status: game.gameState.status,
      createdAt: game.createdAt,
      isJoinable: game.players.length < game.settings.maxPlayers,
      isPrivate: game.isPrivate,
      hasPassword: game.isPrivate,
      settings: game.settings, // Include the full settings object
    }));

    console.log(`✅ Retrieved ${rooms.length} available rooms`);
    res.status(200).json({
      message: "Available rooms retrieved successfully",
      rooms,
      totalCount: rooms.length,
    });
  } catch (error) {
    console.error("❌ Get rooms error:", error);
    res.status(500).json({
      message: "Failed to retrieve rooms",
    });
  }
});

// Create new game room - REQUIRES AUTH
router.post("/create", auth, async (req, res) => {
  try {
    const { isPrivate = false, password = null, settings = {} } = req.body;
    if (await antiCheatSystem.isUserBlocked(req.user.id)) {
      console.warn(
        `�� Blocked user ${req.user.username} (${hostId}) attempted to create room`
      );
      return res.status(403).json({
        message:
          "Your account has been blocked due to suspicious activity. Please contact an administrator.",
        error: "USER_BLOCKED",
      });
    }

    // Validate settings
    const gameSettings = {
      maxPlayers: Math.min(Math.max(settings.maxPlayers || 2, 2), 4),
      boardSize: ["4x4", "6x6", "8x8"].includes(settings.boardSize)
        ? settings.boardSize
        : "4x4",
      gameMode: ["classic", "blitz", "sudden-death", "powerup-frenzy"].includes(
        settings.gameMode
      )
        ? settings.gameMode
        : "classic",
      theme: settings.theme || "emojis",
      powerUpsEnabled:
        settings.gameMode === "powerup-frenzy" ||
        Boolean(settings.powerUpsEnabled),
      timeLimit: ["blitz", "powerup-frenzy"].includes(settings.gameMode)
        ? settings.timeLimit || 60
        : null,
    };

    // Generate unique room ID
    const roomId = `room_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;

    // Create game
    const game = new Game({
      roomId,
      hostId: req.user.id,
      isPrivate,
      password: isPrivate && password ? password.trim() : null,
      settings: gameSettings,
      players: [
        {
          userId: req.user.id,
          username: req.user.username,
          avatar:
            req.user.avatar ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user.username}`,
          isHost: true,
          isGuest: req.user.isGuest,
          score: 0,
          matches: 0,
          flips: 0,
          powerUps: [],
        },
      ],
      gameState: {
        status: "waiting",
        currentTurn: 0,
        flippedCards: [],
        matchedPairs: 0,
        totalPairs: 0,
      },
    });

    await game.save();

    // Emit room-updated event to all clients if socket.io is available
    if (io) {
      io.emit("room-updated", {
        roomId: game.roomId,
        playerCount: game.players.length,
        maxPlayers: game.settings.maxPlayers,
        isJoinable: game.players.length < game.settings.maxPlayers,
        gameMode: game.settings.gameMode,
        status: game.gameState.status,
        boardSize: game.settings.boardSize,
        theme: game.settings.theme,
        isPrivate: game.isPrivate,
        hasPassword: game.isPrivate,
        settings: {
          powerUpsEnabled:
            game.settings.gameMode === "powerup-frenzy" ||
            game.settings.powerUpsEnabled,
          chatEnabled: game.settings.chatEnabled,
          isRanked: game.settings.isRanked,
        },
        createdAt: game.createdAt,
      });
    }

    res.status(201).json({
      message: "Game room created successfully",
      game: {
        roomId: game.roomId,
        isPrivate: game.isPrivate,
        settings: game.settings,
        players: game.players,
        gameState: game.gameState,
        createdAt: game.createdAt,
      },
    });
  } catch (error) {
    console.error("Create game error:", error);
    res.status(500).json({
      message: "Failed to create game room",
    });
  }
});

// Join game room - REQUIRES AUTH
router.post("/join/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;

    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({
        message: "Game room not found",
      });
    }

    // Check if game is full
    if (game.players.length >= game.settings.maxPlayers) {
      return res.status(400).json({
        message: "Game room is full",
      });
    }

    // Check if player is already in the game
    const existingPlayer = game.players.find((p) => p.userId === req.user.id);
    if (existingPlayer) {
      return res.status(400).json({
        message: "You are already in this game",
      });
    }

    // Check password for private rooms
    if (
      game.isPrivate &&
      game.password &&
      game.password.trim() !== (password || "").trim()
    ) {
      return res.status(401).json({
        message: "Invalid room password",
      });
    }

    // Check game status
    if (!["waiting", "starting"].includes(game.gameState.status)) {
      return res.status(400).json({
        message: "Cannot join game in progress",
      });
    }

    // Add player to game
    const newPlayer = {
      userId: req.user.id,
      username: req.user.username,
      avatar:
        req.user.avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user.username}`,
      isHost: false,
      isGuest: req.user.isGuest,
      score: 0,
      matches: 0,
      flips: 0,
      powerUps: [],
    };

    game.addPlayer(newPlayer.userId, newPlayer.username, newPlayer.avatar);
    await game.save();

    res.status(200).json({
      message: "Joined game successfully",
      game: {
        roomId: game.roomId,
        isPrivate: game.isPrivate,
        settings: game.settings,
        players: game.players,
        gameState: game.gameState,
      },
    });
  } catch (error) {
    console.error("Join game error:", error);
    res.status(500).json({
      message: "Failed to join game",
    });
  }
});

// Leave game room - REQUIRES AUTH
router.post("/leave/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({
        message: "Game room not found",
      });
    }

    // Check if player is in the game
    const playerIndex = game.players.findIndex((p) => p.userId === req.user.id);
    if (playerIndex === -1) {
      return res.status(400).json({
        message: "You are not in this game",
      });
    }

    const isHost = game.players[playerIndex].isHost;

    // Remove player
    game.removePlayer(req.user.id);

    // If host left and there are other players, assign new host
    if (isHost && game.players.length > 0) {
      game.players[0].isHost = true;
      game.hostId = game.players[0].userId;
    }

    // If no players left, delete the game instead of marking as completed
    if (game.players.length === 0) {
      console.log(
        `Last player left game ${roomId} via API - deleting from database`
      );

      // Delete the game from database
      await Game.findByIdAndDelete(game._id);

      return res.status(200).json({
        message: "Left game successfully - game deleted",
        gameDeleted: true,
      });
    }

    await game.save();

    res.status(200).json({
      message: "Left game successfully",
      gameDeleted: false,
    });
  } catch (error) {
    console.error("Leave game error:", error);
    res.status(500).json({
      message: "Failed to leave game",
    });
  }
});

// Get game details - REQUIRES AUTH
router.get("/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({
        message: "Game not found",
      });
    }

    // Check if user is a player in this game
    const player = game.players.find((p) => p.userId === req.user.id);
    if (!player) {
      return res.status(403).json({
        message: "You are not a player in this game",
      });
    }

    res.status(200).json({
      message: "Game details retrieved successfully",
      game: {
        roomId: game.roomId,
        isPrivate: game.isPrivate,
        settings: game.settings,
        players: game.players,
        gameState: game.gameState,
        createdAt: game.createdAt,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
      },
    });
  } catch (error) {
    console.error("Get game details error:", error);
    res.status(500).json({
      message: "Failed to get game details",
    });
  }
});

// Get game statistics - REQUIRES AUTH
router.get("/stats/user", auth, async (req, res) => {
  try {
    const { timeframe = "all" } = req.query;

    // For guest users, return basic stats
    if (req.user.isGuest) {
      return res.status(200).json({
        message: "User statistics retrieved successfully",
        statistics: {
          gamesPlayed: 0,
          gamesWon: 0,
          winRate: 0,
          totalScore: 0,
          averageScore: 0,
          bestScore: 0,
          totalFlips: 0,
          totalMatches: 0,
          averageFlipTime: 0,
          longestMatchStreak: 0,
          powerUpsUsed: 0,
          perfectGames: 0,
          timeframe,
        },
      });
    }

    // Get user from database to access stored stats
    const user = await User.findById(req.user.id).select("stats");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Use stored stats from user document for consistency
    const stats = {
      gamesPlayed: user.stats.gamesPlayed || 0,
      gamesWon: user.stats.gamesWon || 0,
      winRate: user.stats.winRate || 0,
      totalScore: user.stats.totalScore || 0,
      bestScore: user.stats.bestScore || 0,
      averageFlipTime: user.stats.averageFlipTime || 0,
      longestMatchStreak: user.stats.bestMatchStreak || 0,
      powerUpsUsed: user.stats.powerUpsUsed || 0,
      perfectGames: user.stats.perfectGames || 0,
      // Calculate average score from total score and games played
      averageScore:
        user.stats.gamesPlayed > 0
          ? Math.round(user.stats.totalScore / user.stats.gamesPlayed)
          : 0,
      // For backward compatibility, include totalFlips and totalMatches
      totalFlips: 0, // These would need to be calculated from game history if needed
      totalMatches: 0, // These would need to be calculated from game history if needed
      timeframe,
    };

    res.status(200).json({
      message: "User statistics retrieved successfully",
      statistics: stats,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      message: "Failed to retrieve user statistics",
      error: error.message,
    });
  }
});

// Get global game statistics - NO AUTH REQUIRED
router.get("/stats/global", async (req, res) => {
  try {
    const totalGames = await Game.countDocuments();
    const totalPlayers = await User.countDocuments({ isGuest: false });

    // Debug: Check all games and their statuses
    const allGames = await Game.find({})
      .select("roomId gameState.status status createdAt updatedAt players")
      .limit(10);
    console.log(
      "Sample of all games:",
      allGames.map((g) => ({
        roomId: g.roomId,
        gameStateStatus: g.gameState?.status,
        topLevelStatus: g.status,
        playerCount: g.players?.length || 0,
        createdAt: g.createdAt,
      }))
    );

    // Count active games - use same logic as lobby query, but only recent games
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const activeGames = await Game.countDocuments({
      "gameState.status": { $in: ["waiting", "starting"] },
      "players.0": { $exists: true }, // Ensure there's at least one player
      updatedAt: { $gte: oneHourAgo }, // Only count games updated in the last hour
    });

    console.log("Active games count:", activeGames);

    // Debug: Log active games details

    // Get detailed info about what's being counted as active
    const activeGamesDetails = await Game.find({
      "gameState.status": { $in: ["waiting", "starting"] },
      "players.0": { $exists: true }, // Ensure there's at least one player
      updatedAt: { $gte: oneHourAgo }, // Only count games updated in the last hour
    }).select("roomId gameState.status status createdAt updatedAt players");

    console.log(
      "Active games details:",
      activeGamesDetails.map((g) => ({
        roomId: g.roomId,
        gameStateStatus: g.gameState?.status,
        topLevelStatus: g.status,
        playerCount: g.players?.length || 0,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }))
    );

    // Get average game duration - check both gameState.status and top-level status
    const finishedGames = await Game.find({
      $or: [
        { "gameState.status": "finished" },
        { status: "finished" },
        { status: "completed" },
      ],
    }).select("startedAt endedAt createdAt updatedAt");

    let averageGameDuration = 0;
    let validGames = [];
    if (finishedGames.length > 0) {
      validGames = finishedGames.filter((game) => {
        // Only use games that have proper startedAt and endedAt timestamps
        return game.endedAt && game.startedAt;
      });

      if (validGames.length > 0) {
        const totalDuration = validGames.reduce((sum, game) => {
          const duration = new Date(game.endedAt) - new Date(game.startedAt);
          return sum + duration;
        }, 0);
        averageGameDuration = Math.round(totalDuration / validGames.length);
      }
    }

    console.log("Average game duration (ms):", averageGameDuration);
    console.log("Valid games count:", validGames.length);
    console.log("Total games count:", finishedGames.length);
    if (validGames.length > 0) {
      console.log(
        "Sample game durations:",
        validGames.slice(0, 3).map((game) => ({
          roomId: game.roomId,
          startedAt: game.startedAt,
          endedAt: game.endedAt,
          duration: new Date(game.endedAt) - new Date(game.startedAt),
        }))
      );
    }

    res.status(200).json({
      message: "Global statistics retrieved successfully",
      statistics: {
        totalGames,
        totalPlayers,
        activeGames,
        averageGameDuration,
        finishedGames: finishedGames.length,
      },
    });
  } catch (error) {
    console.error("Get global stats error:", error);
    res.status(500).json({
      message: "Failed to retrieve global statistics",
    });
  }
});

// Get leaderboard - NO AUTH REQUIRED (but personalized if authenticated)
router.get("/leaderboard/global", optionalAuth, async (req, res) => {
  try {
    const { limit = 50, page = 1, timeframe = "all" } = req.query;

    // Ensure all users have proper stats initialized
    await User.updateMany(
      {
        isGuest: false,
        $or: [
          { stats: { $exists: false } },
          { "stats.gamesPlayed": { $exists: false } },
        ],
      },
      {
        $set: {
          stats: {
            gamesPlayed: 0,
            gamesWon: 0,
            winRate: 0,
            totalScore: 0,
            averageFlipTime: 0,
            bestMatchStreak: 0,
            perfectGames: 0,
            powerUpsUsed: 0,
          },
        },
      }
    );

    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    let dateFilter = {};
    const now = new Date();

    switch (timeframe) {
      case "week":
        dateFilter = {
          lastActive: {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        };
        break;
      case "month":
        dateFilter = {
          lastActive: {
            $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        };
        break;
    }

    // Get users for different leaderboard types
    const totalScoreLeaderboard = await User.find({
      isGuest: false,
      $or: [
        { "stats.gamesPlayed": { $gt: 0 } },
        { "stats.totalScore": { $gt: 0 } },
      ],
      "privacySettings.showInLeaderboards": true,
      ...dateFilter,
    })
      .select("username avatar stats")
      .sort({ "stats.totalScore": -1 })
      .skip(skip)
      .limit(limitNum);

    // Debug: Log leaderboard counts
    console.log("Total score leaderboard count:", totalScoreLeaderboard.length);

    const winRateLeaderboard = await User.find({
      isGuest: false,
      $or: [
        { "stats.gamesPlayed": { $gte: 1 } },
        { "stats.gamesWon": { $gt: 0 } },
      ],
      "privacySettings.showInLeaderboards": true,
      ...dateFilter,
    })
      .select("username avatar stats")
      .sort({ "stats.winRate": -1, "stats.gamesPlayed": -1 })
      .skip(skip)
      .limit(limitNum);

    console.log("Win rate leaderboard count:", winRateLeaderboard.length);

    const gamesPlayedLeaderboard = await User.find({
      isGuest: false,
      $or: [
        { "stats.gamesPlayed": { $gt: 0 } },
        { "stats.totalScore": { $gt: 0 } },
      ],
      "privacySettings.showInLeaderboards": true,
      ...dateFilter,
    })
      .select("username avatar stats")
      .sort({ "stats.gamesPlayed": -1 })
      .skip(skip)
      .limit(limitNum);

    // Format leaderboards
    const formatLeaderboard = (users, scoreField) => {
      return users.map((user, index) => ({
        rank: skip + index + 1,
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        totalScore: user.stats?.totalScore || 0,
        gamesPlayed: user.stats?.gamesPlayed || 0,
        winRate: Math.round(user.stats?.winRate || 0),
        [scoreField]: user.stats?.[scoreField] || 0,
      }));
    };

    // Check pagination
    const totalUsers = await User.countDocuments({
      isGuest: false,
      $or: [
        { "stats.gamesPlayed": { $gt: 0 } },
        { "stats.totalScore": { $gt: 0 } },
      ],
      ...dateFilter,
    });

    const hasMore = skip + limitNum < totalUsers;

    res.status(200).json({
      message: "Leaderboard retrieved successfully",
      leaderboards: {
        totalScore: formatLeaderboard(totalScoreLeaderboard, "totalScore"),
        winRate: formatLeaderboard(winRateLeaderboard, "winRate"),
        gamesPlayed: formatLeaderboard(gamesPlayedLeaderboard, "gamesPlayed"),
      },
      pagination: {
        currentPage: pageNum,
        limit: limitNum,
        totalItems: totalUsers,
        hasMore,
      },
      timeframe,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      message: "Failed to retrieve leaderboard",
    });
  }
});

// Get match history for authenticated user - REQUIRES AUTH
router.get("/history/matches", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, gameMode, result } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    // Build query to find completed games where the user participated (NO TIME LIMITS)
    let query = {
      "players.userId": req.user.id.toString(),
      // Ensure players array exists and is not empty
      players: { $exists: true, $ne: null, $ne: [] },
      $or: [
        // Games that have ended (have endedAt timestamp)
        { endedAt: { $exists: true, $ne: null } },
        // Games with a winner
        { "gameState.winner": { $exists: true, $ne: null } },
        // Games that are finished/completed
        {
          "gameState.status": {
            $in: ["finished", "completed", "sudden-death"],
          },
        },
        { status: { $in: ["finished", "completed"] } },
        // Games that have been played (have startedAt) and are not in waiting/starting status
        {
          $and: [
            { startedAt: { $exists: true, $ne: null } },
            { "gameState.status": { $nin: ["waiting", "starting"] } },
            { status: { $nin: ["waiting", "starting"] } },
          ],
        },
        // Games that have players with scores > 0 (indicating they were played)
        { "players.score": { $gt: 0 } },
        // Include any game where the user participated and it's not currently waiting/starting
        {
          $and: [
            { "gameState.status": { $nin: ["waiting", "starting"] } },
            { status: { $nin: ["waiting", "starting"] } },
          ],
        },
      ],
    };

    // Add filters if provided
    if (gameMode) {
      query["settings.gameMode"] = gameMode;
    }

    // Get games with pagination
    let games = await Game.find(query)
      .sort({ endedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // If no games found with the complex query, try a simpler query
    if (games.length === 0) {
      console.log(
        `🔍 No games found with complex query, trying simpler query for user ${req.user.id}`
      );

      const simpleQuery = {
        "players.userId": req.user.id.toString(),
        players: { $exists: true, $ne: null, $ne: [] },
        $or: [
          { "gameState.status": { $nin: ["waiting", "starting"] } },
          { status: { $nin: ["waiting", "starting"] } },
          { "players.score": { $gt: 0 } },
          { startedAt: { $exists: true, $ne: null } },
          { endedAt: { $exists: true, $ne: null } },
          { "gameState.winner": { $exists: true, $ne: null } },
        ],
      };

      games = await Game.find(simpleQuery)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      console.log(
        `🔍 Simple query found ${games.length} games for user ${req.user.id}`
      );
    }

    // Debug: Log query and results
    console.log(
      `🔍 Match history query for user ${req.user.id}:`,
      JSON.stringify(query, null, 2)
    );
    console.log(`📊 Found ${games.length} games for user ${req.user.id}`);

    // Debug: Check what games exist for this user (without any filters)
    const allUserGames = await Game.find({
      "players.userId": req.user.id.toString(),
    })
      .select(
        "roomId gameState.status status startedAt endedAt players.score updatedAt"
      )
      .limit(5);

    console.log(
      `🔍 All games for user ${req.user.id} (first 5):`,
      allUserGames.map((g) => ({
        roomId: g.roomId,
        gameStateStatus: g.gameState?.status,
        status: g.status,
        startedAt: g.startedAt,
        endedAt: g.endedAt,
        playerScores: g.players?.map((p) => ({
          userId: p.userId,
          score: p.score,
        })),
        updatedAt: g.updatedAt,
      }))
    );

    // Debug: Log each game's key fields
    games.forEach((game, index) => {
      console.log(`Game ${index + 1}:`, {
        roomId: game.roomId,
        status: game.status,
        gameStateStatus: game.gameState?.status,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        winner: game.gameState?.winner,
        playersCount: game.players?.length,
        playerScores: game.players?.map((p) => ({
          userId: p.userId,
          score: p.score,
          matches: p.matches,
        })),
        updatedAt: game.updatedAt,
      });
    });

    // Transform games into match history format
    const matches = games
      .map((game) => {
        try {
          // Find the current user's player data
          const userPlayer = game.players.find(
            (p) => p.userId === req.user.id.toString()
          );
          if (!userPlayer) {
            console.log(
              `❌ User ${req.user.id} not found in game ${game.roomId}`
            );
            return null;
          }

          console.log(
            `✅ Processing game ${game.roomId} for user ${req.user.id}:`,
            {
              userScore: userPlayer.score,
              userMatches: userPlayer.matches,
              gameStatus: game.gameState?.status,
              gameEndedAt: game.endedAt,
            }
          );

          // Get opponents (all other players)
          // Use stored opponents information if available, otherwise use current players
          let opponents = [];
          if (
            game.gameState?.opponentsForHistory &&
            game.gameState.opponentsForHistory.length > 0
          ) {
            // Use stored opponents information (includes players who left)
            opponents = game.gameState.opponentsForHistory
              .filter((p) => p.userId !== req.user.id.toString())
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
              .filter((p) => p.userId !== req.user.id.toString())
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

          // Determine if user won
          const userWon = determinePlayerWon(game, req.user.id.toString());

          // Calculate game duration
          let duration = 0;
          if (game.startedAt && game.endedAt) {
            duration = Math.round(
              (new Date(game.endedAt) - new Date(game.startedAt)) / 1000
            );
          }

          // Get game mode and board size
          const gameMode = game.settings?.gameMode || "classic";
          const boardSize = game.settings?.boardSize || "4x4";

          return {
            gameId: game.roomId,
            playedAt: game.endedAt || game.updatedAt,
            gameMode,
            boardSize,
            result: userWon ? "won" : "lost",
            score: userPlayer.score || 0,
            matches: userPlayer.matches || 0,
            flips: userPlayer.flips || 0,
            playerCount: game.players.length,
            duration,
            opponents,
            completionReason:
              game.gameState?.completionReason || "game_completed",
            // Add additional fields for better tracking
            startedAt: game.startedAt,
            endedAt: game.endedAt,
            gameStatus: game.gameState?.status || game.status,
            winner: game.gameState?.winner,
          };
        } catch (error) {
          console.error(`Error processing game ${game.roomId}:`, error);
          return null;
        }
      })
      .filter((match) => match !== null); // Remove any null matches

    // Get total count for pagination with the same query logic
    const totalMatches = await Game.countDocuments(query);

    console.log(
      `✅ Retrieved ${matches.length} matches for user ${req.user.id}`
    );
    res.status(200).json({
      message: "Match history retrieved successfully",
      matches,
      pagination: {
        currentPage: pageNum,
        limit: limitNum,
        totalItems: totalMatches,
        hasMore: skip + limitNum < totalMatches,
      },
      filters: {
        gameMode,
        result,
      },
    });
  } catch (error) {
    console.error("❌ Match history error:", error);
    res.status(500).json({
      message: "Failed to retrieve match history",
      error: error.message,
    });
  }
});

// Helper function to determine if a player won a game
function determinePlayerWon(game, userId) {
  // Check if there's an explicit winner
  if (game.gameState?.winner) {
    return game.gameState.winner === userId;
  }

  // Check if game is finished/completed/sudden-death
  if (
    game.gameState?.status === "finished" ||
    game.gameState?.status === "completed" ||
    game.gameState?.status === "sudden-death" ||
    game.status === "completed"
  ) {
    const player = game.players.find((p) => p.userId === userId);
    if (!player) return false;

    // If game is finished, determine winner by score
    const maxScore = Math.max(...game.players.map((p) => p.score || 0));
    return player.score === maxScore && player.score > 0;
  }

  // For games that have endedAt timestamp but no explicit winner, check if user has the highest score
  if (game.endedAt) {
    const player = game.players.find((p) => p.userId === userId);
    if (!player) return false;

    const maxScore = Math.max(...game.players.map((p) => p.score || 0));
    return player.score === maxScore && player.score > 0;
  }

  // For games that are still in progress, return false
  return false;
}

// Cleanup old inactive games - ADMIN ONLY
router.post("/cleanup", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find old games that are still in waiting/starting status
    const oldGames = await Game.find({
      "gameState.status": { $in: ["waiting", "starting"] },
      updatedAt: { $lt: oneHourAgo },
    });

    console.log(`🔍 Found ${oldGames.length} old inactive games to cleanup`);

    // Delete old inactive games
    const result = await Game.deleteMany({
      "gameState.status": { $in: ["waiting", "starting"] },
      updatedAt: { $lt: oneHourAgo },
    });

    console.log(`✅ Cleaned up ${result.deletedCount} old games`);

    res.status(200).json({
      message: "Cleanup completed",
      deletedCount: result.deletedCount,
      oldGamesCount: oldGames.length,
    });
  } catch (error) {
    console.error("❌ Cleanup error:", error);
    res.status(500).json({
      message: "Failed to cleanup old games",
    });
  }
});

// Export the setter function
router.setSocketIO = setSocketIO;

// Ensure the function is properly attached
if (typeof router.setSocketIO !== "function") {
  console.error("setSocketIO function not properly attached to router");
}

module.exports = router;
