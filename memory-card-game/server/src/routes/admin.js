import { createRequire } from "module";
const require = createRequire(import.meta.url);

const express = require("express");
import { Game } from "../models/Game.js";
import { User } from "../models/User.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticate);
router.use(requireAdmin);

// Get admin dashboard statistics - REQUIRES ADMIN AUTH
router.get("/dashboard", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const guestUsers = await User.countDocuments({ isGuest: true });
    const registeredUsers = totalUsers - guestUsers;
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    const totalGames = await Game.countDocuments();
    const activeGames = await Game.countDocuments({
      "gameState.status": { $in: ["waiting", "starting", "playing"] },
    });
    const finishedGames = await Game.countDocuments({
      "gameState.status": "finished",
    });
    const todayGames = await Game.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    // Get recent activity
    const recentGames = await Game.find()
      .select("roomId players gameState settings createdAt endedAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    const recentUsers = await User.find({ isGuest: false })
      .select("username avatar createdAt lastActive")
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    // Get popular game modes
    const gameModeCounts = await Game.aggregate([
      { $match: { "gameState.status": "finished" } },
      { $group: { _id: "$settings.gameMode", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      dashboard: {
        users: {
          total: totalUsers,
          registered: registeredUsers,
          guests: guestUsers,
          activeToday: activeUsers,
        },
        games: {
          total: totalGames,
          active: activeGames,
          finished: finishedGames,
          todayCreated: todayGames,
        },
        recentActivity: {
          games: recentGames.map((game) => ({
            roomId: game.roomId,
            playerCount: game.players.length,
            gameMode: game.settings.gameMode,
            status: game.gameState.status,
            createdAt: game.createdAt,
            endedAt: game.endedAt,
            players: game.players.map((p) => p.username),
          })),
          users: recentUsers.map((user) => ({
            username: user.username,
            avatar: user.avatar,
            joinedAt: user.createdAt,
            lastActive: user.lastActive,
          })),
        },
        popularGameModes: gameModeCounts,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

// Get all games with filtering - REQUIRES ADMIN AUTH
router.get("/games", async (req, res) => {
  try {
    const { status, gameMode, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (status) filter["gameState.status"] = status;
    if (gameMode) filter["settings.gameMode"] = gameMode;

    const games = await Game.find(filter)
      .select("roomId players gameState settings createdAt endedAt isPrivate")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    const total = await Game.countDocuments(filter);

    res.status(200).json({
      games: games.map((game) => ({
        id: game._id,
        roomId: game.roomId,
        playerCount: game.players.length,
        players: game.players.map((p) => ({
          username: p.username,
          score: p.score,
          isReady: p.isReady,
        })),
        status: game.gameState.status,
        gameMode: game.settings.gameMode,
        boardSize: game.settings.boardSize,
        isPrivate: game.isPrivate,
        createdAt: game.createdAt,
        endedAt: game.endedAt,
        duration:
          game.endedAt && game.createdAt
            ? Math.round((game.endedAt - game.createdAt) / 1000)
            : null,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Admin games error:", error);
    res.status(500).json({ message: "Failed to fetch games data" });
  }
});

// Get all users with filtering - REQUIRES ADMIN AUTH
router.get("/users", async (req, res) => {
  try {
    const { isGuest, isAdmin, page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let filter = {};
    if (isGuest !== undefined) filter.isGuest = isGuest === "true";
    if (isAdmin !== undefined) filter.isAdmin = isAdmin === "true";
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select(
        "username email avatar isGuest isAdmin stats lastActive createdAt"
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    const total = await User.countDocuments(filter);

    res.status(200).json({
      users: users.map((user) => ({
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isGuest: user.isGuest,
        isAdmin: user.isAdmin,
        stats: {
          gamesPlayed: user.stats.gamesPlayed,
          gamesWon: user.stats.gamesWon,
          winRate: Math.round(user.stats.winRate),
          totalScore: user.stats.totalScore,
        },
        lastActive: user.lastActive,
        createdAt: user.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ message: "Failed to fetch users data" });
  }
});

// Update user admin status - REQUIRES ADMIN AUTH
router.patch("/users/:userId/admin", async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    if (typeof isAdmin !== "boolean") {
      return res
        .status(400)
        .json({ message: "isAdmin must be a boolean value" });
    }

    // Prevent admin from removing their own admin status
    if (userId === req.userId && !isAdmin) {
      return res
        .status(400)
        .json({ message: "Cannot remove your own admin privileges" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isAdmin },
      { new: true }
    ).select("username email isAdmin");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: `User ${isAdmin ? "granted" : "revoked"} admin privileges`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Update admin status error:", error);
    res.status(500).json({ message: "Failed to update admin status" });
  }
});

// Delete user account - REQUIRES ADMIN AUTH
router.delete("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting their own account
    if (userId === req.userId) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove user from any active games
    await Game.updateMany(
      { "players.userId": userId },
      { $pull: { players: { userId } } }
    );

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: "User account deleted successfully",
      deletedUser: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user account" });
  }
});

// Force end a game - REQUIRES ADMIN AUTH
router.post("/games/:gameId/end", async (req, res) => {
  try {
    const { gameId } = req.params;
    const { reason } = req.body;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    if (game.gameState.status === "finished") {
      return res.status(400).json({ message: "Game is already finished" });
    }

    // Force end the game
    game.gameState.status = "finished";
    game.endedAt = new Date();

    // Add admin message to chat
    if (reason) {
      game.addChatMessage(
        "system",
        "System",
        `Game ended by administrator. Reason: ${reason}`,
        "admin"
      );
    }

    await game.save();

    res.status(200).json({
      message: "Game ended successfully",
      game: {
        roomId: game.roomId,
        status: game.gameState.status,
        endedAt: game.endedAt,
        reason: reason || "Ended by administrator",
      },
    });
  } catch (error) {
    console.error("Force end game error:", error);
    res.status(500).json({ message: "Failed to end game" });
  }
});

// Get system statistics - REQUIRES ADMIN AUTH
router.get("/stats/system", async (req, res) => {
  try {
    // Server uptime and performance metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // Database statistics
    const dbStats = {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      totalGames: await Game.countDocuments(),
      activeGames: await Game.countDocuments({
        "gameState.status": { $in: ["waiting", "starting", "playing"] },
      }),
    };

    // Growth metrics
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: last30Days },
      isGuest: false,
    });
    const gamesLast30Days = await Game.countDocuments({
      createdAt: { $gte: last30Days },
    });

    res.status(200).json({
      system: {
        uptime: Math.round(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
        },
        database: dbStats,
        growth: {
          newUsersLast30Days,
          gamesLast30Days,
          averageGamesPerDay: Math.round(gamesLast30Days / 30),
        },
      },
    });
  } catch (error) {
    console.error("System stats error:", error);
    res.status(500).json({ message: "Failed to fetch system statistics" });
  }
});

export default router;
