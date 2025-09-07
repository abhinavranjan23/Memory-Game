const express = require("express");
const { Game } = require("../models/Game.js");
const { User } = require("../models/User.js");
const auth = require("../middleware/auth.js");
const antiCheatSystem = require("../utils/antiCheat.js");

let io;

const setSocketIO = (socketIO) => {
  io = socketIO;
};

const router = express.Router();

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return next();
    }

    await auth(req, res, next);
  } catch (error) {
    next();
  }
};

router.get("/rooms", optionalAuth, async (req, res) => {
  try {
    const games = await Game.find({
      $and: [
        { "gameState.status": { $in: ["waiting", "starting"] } },
        { status: { $nin: ["completed", "finished"] } },
        { "gameState.status": { $nin: ["completed", "finished"] } },

        { $expr: { $lt: [{ $size: "$players" }, "$settings.maxPlayers"] } },

        { createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },

        { updatedAt: { $gt: new Date(Date.now() - 1 * 60 * 60 * 1000) } },
      ],
    })
      .limit(50)
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
      settings: game.settings,
    }));

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

    const roomId = `room_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;

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

    const existingPlayer = game.players.find((p) => p.userId === req.user.id);
    if (existingPlayer) {
      return res.status(400).json({
        message: "You are already in this game",
      });
    }

    if (
      game.isPrivate &&
      game.password &&
      game.password.trim() !== (password || "").trim()
    ) {
      return res.status(401).json({
        message: "Invalid room password",
      });
    }

    if (!["waiting", "starting"].includes(game.gameState.status)) {
      return res.status(400).json({
        message: "Cannot join game in progress",
      });
    }

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

// Leave game room
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

    game.removePlayer(req.user.id, true);

    if (isHost && game.players.length > 0) {
      game.players[0].isHost = true;
      game.hostId = game.players[0].userId;
    }

    if (game.players.length === 0) {
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

router.get("/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({
        message: "Game not found",
      });
    }

    let player = game.players.find((p) => p.userId === req.user.id);

    if (!player && game.opponentsForHistory) {
      player = game.opponentsForHistory.find((p) => p.userId === req.user.id);
    }

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
        opponentsForHistory: game.opponentsForHistory || [],
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

    const user = await User.findById(req.user.id).select("stats");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
      bestMemoryMeter: user.stats.bestMemoryMeter || 0,
      averageMemoryMeter: user.stats.averageMemoryMeter || 0,

      averageScore:
        user.stats.gamesPlayed > 0
          ? Math.round(user.stats.totalScore / user.stats.gamesPlayed)
          : 0,

      totalFlips: 0,
      totalMatches: 0,
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

router.get("/stats/global", async (req, res) => {
  try {
    const totalGames = await Game.countDocuments();
    const totalPlayers = await User.countDocuments({ isGuest: false });

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

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeGames = await Game.countDocuments({
      "gameState.status": { $in: ["waiting", "starting"] },
      "players.0": { $exists: true },
      updatedAt: { $gte: oneHourAgo },
    });

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

router.get("/leaderboard/global", optionalAuth, async (req, res) => {
  try {
    const { limit = 50, page = 1, timeframe = "all" } = req.query;

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

router.get("/history/matches", auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, gameMode, result } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;

    let query = {
      $and: [
        {
          $or: [
            { "players.userId": req.user.id.toString() },

            {
              "opponentsForHistory.userId": req.user.id.toString(),
            },
          ],
        },

        { players: { $exists: true, $ne: null } },

        {
          $or: [
            { endedAt: { $exists: true, $ne: null } },

            { "gameState.winner": { $exists: true, $ne: null } },

            {
              "gameState.status": {
                $in: ["finished", "completed", "sudden-death"],
              },
            },
            { status: { $in: ["finished", "completed"] } },

            {
              $and: [
                { startedAt: { $exists: true, $ne: null } },
                { "gameState.status": { $nin: ["waiting", "starting"] } },
                { status: { $nin: ["waiting", "starting"] } },
              ],
            },

            { "players.score": { $gt: 0 } },

            {
              $and: [
                { "gameState.status": { $nin: ["waiting", "starting"] } },
                { status: { $nin: ["waiting", "starting"] } },
              ],
            },
          ],
        },
      ],
    };

    if (gameMode) {
      query["settings.gameMode"] = gameMode;
    }

    let games = await Game.find(query)
      .sort({ endedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    if (games.length === 0) {
      const simpleQuery = {
        $and: [
          {
            $or: [
              { "players.userId": req.user.id.toString() },

              { "opponentsForHistory.userId": req.user.id.toString() },
            ],
          },

          { players: { $exists: true, $ne: null, $ne: [] } },

          {
            $or: [
              { "gameState.status": { $nin: ["waiting", "starting"] } },
              { status: { $nin: ["waiting", "starting"] } },
              { "players.score": { $gt: 0 } },
              { startedAt: { $exists: true, $ne: null } },
              { endedAt: { $exists: true, $ne: null } },
              { "gameState.winner": { $exists: true, $ne: null } },
            ],
          },
        ],
      };

      games = await Game.find(simpleQuery)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();
    }

    const allUserGames = await Game.find({
      "players.userId": req.user.id.toString(),
    })
      .select(
        "roomId gameState.status status startedAt endedAt players.score updatedAt"
      )
      .limit(5);

    const matches = games
      .map((game) => {
        try {
          let userPlayer = game.players.find(
            (p) => p.userId === req.user.id.toString()
          );

          if (!userPlayer && game.opponentsForHistory) {
            const userInHistory = game.opponentsForHistory.find(
              (p) => p.userId === req.user.id.toString()
            );
            if (userInHistory) {
              userPlayer = {
                userId: userInHistory.userId,
                username: userInHistory.username,
                score: userInHistory.score || 0,
                matches: userInHistory.matches || 0,
                flips: 0, // Not stored in opponentsForHistory, use 0
                leftEarly: userInHistory.leftEarly || false,
                disconnectedAt: userInHistory.disconnectedAt || null,
              };
            }
          }

          if (!userPlayer) {
            return null;
          }

          let opponents = [];

          const activeOpponents = game.players
            .filter((p) => p.userId !== req.user.id.toString())
            .map((opponent) => ({
              username: opponent.username,
              userId: opponent.userId,
              score: opponent.score || 0,
              matches: opponent.matches || 0,
              leftEarly: false,
              disconnectedAt: null,
            }));

          const historyOpponents = game.gameState?.opponentsForHistory
            ? game.gameState.opponentsForHistory
                .filter((p) => p.userId !== req.user.id.toString())
                .map((opponent) => ({
                  username: opponent.username,
                  userId: opponent.userId,
                  score: opponent.score || 0,
                  matches: opponent.matches || 0,
                  leftEarly: opponent.leftEarly || false,
                  disconnectedAt: opponent.disconnectedAt || null,
                }))
            : [];

          const allOpponents = [...activeOpponents, ...historyOpponents];
          const uniqueOpponents = allOpponents.filter(
            (opponent, index, self) =>
              index === self.findIndex((o) => o.userId === opponent.userId)
          );

          opponents = uniqueOpponents;

          const userWon = determinePlayerWon(game, req.user.id.toString());

          let duration = 0;
          if (game.startedAt && game.endedAt) {
            duration = Math.round(
              (new Date(game.endedAt) - new Date(game.startedAt)) / 1000
            );
          }

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
      .filter((match) => match !== null);

    const totalMatches = await Game.countDocuments(query);

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
    console.error(" Match history error:", error);
    res.status(500).json({
      message: "Failed to retrieve match history",
      error: error.message,
    });
  }
});

function determinePlayerWon(game, userId) {
  if (game.gameState?.winner) {
    return game.gameState.winner === userId;
  }

  if (
    game.gameState?.status === "finished" ||
    game.gameState?.status === "completed" ||
    game.gameState?.status === "sudden-death" ||
    game.status === "completed"
  ) {
    const player = game.players.find((p) => p.userId === userId);
    if (!player) return false;

    const maxScore = Math.max(...game.players.map((p) => p.score || 0));
    return player.score === maxScore && player.score > 0;
  }

  if (game.endedAt) {
    const player = game.players.find((p) => p.userId === userId);
    if (!player) return false;

    const maxScore = Math.max(...game.players.map((p) => p.score || 0));
    return player.score === maxScore && player.score > 0;
  }

  return false;
}

router.post("/cleanup", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const oldGames = await Game.find({
      "gameState.status": { $in: ["waiting", "starting"] },
      updatedAt: { $lt: oneHourAgo },
    });

    console.log(`🔍 Found ${oldGames.length} old inactive games to cleanup`);

    const result = await Game.deleteMany({
      "gameState.status": { $in: ["waiting", "starting"] },
      updatedAt: { $lt: oneHourAgo },
    });

    res.status(200).json({
      message: "Cleanup completed",
      deletedCount: result.deletedCount,
      oldGamesCount: oldGames.length,
    });
  } catch (error) {
    console.error(" Cleanup error:", error);
    res.status(500).json({
      message: "Failed to cleanup old games",
    });
  }
});

router.setSocketIO = setSocketIO;

if (typeof router.setSocketIO !== "function") {
  console.error("setSocketIO function not properly attached to router");
}

module.exports = router;
