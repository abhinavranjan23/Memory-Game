import express from 'express';
import { Game } from '../models/Game.js';
import { User } from '../models/User.js';
<<<<<<< HEAD:server/src/routes/admin.js
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
=======
import { authenticate, requireAdmin } from '../middleware/auth.js';
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticate);
router.use(requireAdmin);

<<<<<<< HEAD:server/src/routes/admin.js
// Get dashboard statistics
router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
=======
// Get admin dashboard statistics - REQUIRES ADMIN AUTH
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const guestUsers = await User.countDocuments({ isGuest: true });
    const registeredUsers = totalUsers - guestUsers;
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
    const totalGames = await Game.countDocuments();
    const activeGames = await Game.countDocuments({
      'gameState.status': { $in: ['waiting', 'starting', 'playing'] }
    });
<<<<<<< HEAD:server/src/routes/admin.js
=======
    const finishedGames = await Game.countDocuments({
      'gameState.status': 'finished'
    });
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
    const todayGames = await Game.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Get recent activity
    const recentGames = await Game.find()
<<<<<<< HEAD:server/src/routes/admin.js
      .select('roomId players gameState settings createdAt')
=======
      .select('roomId players gameState settings createdAt endedAt')
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

<<<<<<< HEAD:server/src/routes/admin.js
    const recentUsers = await User.find()
      .select('username avatar isGuest createdAt lastActive')
=======
    const recentUsers = await User.find({ isGuest: false })
      .select('username avatar createdAt lastActive')
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

<<<<<<< HEAD:server/src/routes/admin.js
    res.status(200).json({
      stats: {
        totalUsers,
        activeUsers,
        totalGames,
        activeGames,
        todayGames
      },
      recentGames: recentGames.map(game => ({
        roomId: game.roomId,
        playerCount: game.players.length,
        gameMode: game.settings.gameMode,
        status: game.gameState.status,
        createdAt: game.createdAt
      })),
      recentUsers: recentUsers.map(user => ({
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        isGuest: user.isGuest,
        createdAt: user.createdAt,
        lastActive: user.lastActive
      }))
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
=======
    // Get popular game modes
    const gameModeCounts = await Game.aggregate([
      { $match: { 'gameState.status': 'finished' } },
      { $group: { _id: '$settings.gameMode', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      dashboard: {
        users: {
          total: totalUsers,
          registered: registeredUsers,
          guests: guestUsers,
          activeToday: activeUsers
        },
        games: {
          total: totalGames,
          active: activeGames,
          finished: finishedGames,
          todayCreated: todayGames
        },
        recentActivity: {
          games: recentGames.map(game => ({
            roomId: game.roomId,
            playerCount: game.players.length,
            gameMode: game.settings.gameMode,
            status: game.gameState.status,
            createdAt: game.createdAt,
            endedAt: game.endedAt,
            players: game.players.map(p => p.username)
          })),
          users: recentUsers.map(user => ({
            username: user.username,
            avatar: user.avatar,
            joinedAt: user.createdAt,
            lastActive: user.lastActive
          }))
        },
        popularGameModes: gameModeCounts
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

<<<<<<< HEAD:server/src/routes/admin.js
// Get all active games
router.get('/games', async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let filter = {};
    if (status) {
      filter = { 'gameState.status': status };
    }
=======
// Get all games with filtering - REQUIRES ADMIN AUTH
router.get('/games', async (req, res) => {
  try {
    const { status, gameMode, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let filter = {};
    if (status) filter['gameState.status'] = status;
    if (gameMode) filter['settings.gameMode'] = gameMode;
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js

    const games = await Game.find(filter)
      .select('roomId players gameState settings createdAt endedAt isPrivate')
      .sort({ createdAt: -1 })
      .skip(skip)
<<<<<<< HEAD:server/src/routes/admin.js
      .limit(Number(limit))
=======
      .limit(parseInt(limit))
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
      .exec();

    const total = await Game.countDocuments(filter);

    res.status(200).json({
      games: games.map(game => ({
        id: game._id,
        roomId: game.roomId,
<<<<<<< HEAD:server/src/routes/admin.js
        players: game.players.map(p => ({
          username: p.username,
          score: p.score
=======
        playerCount: game.players.length,
        players: game.players.map(p => ({
          username: p.username,
          score: p.score,
          isReady: p.isReady
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
        })),
        status: game.gameState.status,
        gameMode: game.settings.gameMode,
        boardSize: game.settings.boardSize,
        isPrivate: game.isPrivate,
        createdAt: game.createdAt,
<<<<<<< HEAD:server/src/routes/admin.js
        endedAt: game.endedAt
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ message: 'Failed to fetch games' });
  }
});

// Get all users
router.get('/users', async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let filter = {};
    if (search) {
      filter = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(filter)
      .select('username email avatar isGuest isAdmin stats createdAt lastActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
=======
        endedAt: game.endedAt,
        duration: game.endedAt && game.createdAt 
          ? Math.round((game.endedAt - game.createdAt) / 1000) 
          : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin games error:', error);
    res.status(500).json({ message: 'Failed to fetch games data' });
  }
});

// Get all users with filtering - REQUIRES ADMIN AUTH
router.get('/users', async (req, res) => {
  try {
    const { isGuest, isAdmin, page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let filter = {};
    if (isGuest !== undefined) filter.isGuest = isGuest === 'true';
    if (isAdmin !== undefined) filter.isAdmin = isAdmin === 'true';
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('username email avatar isGuest isAdmin stats lastActive createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
      .exec();

    const total = await User.countDocuments(filter);

    res.status(200).json({
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isGuest: user.isGuest,
        isAdmin: user.isAdmin,
<<<<<<< HEAD:server/src/routes/admin.js
        stats: user.stats,
        createdAt: user.createdAt,
        lastActive: user.lastActive
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Update user admin status
router.patch('/users/:userId/admin', async (req: AuthenticatedRequest, res) => {
=======
        stats: {
          gamesPlayed: user.stats.gamesPlayed,
          gamesWon: user.stats.gamesWon,
          winRate: Math.round(user.stats.winRate),
          totalScore: user.stats.totalScore
        },
        lastActive: user.lastActive,
        createdAt: user.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ message: 'Failed to fetch users data' });
  }
});

// Update user admin status - REQUIRES ADMIN AUTH
router.patch('/users/:userId/admin', async (req, res) => {
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

<<<<<<< HEAD:server/src/routes/admin.js
    const user = await User.findById(userId);
=======
    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ message: 'isAdmin must be a boolean value' });
    }

    // Prevent admin from removing their own admin status
    if (userId === req.userId && !isAdmin) {
      return res.status(400).json({ message: 'Cannot remove your own admin privileges' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isAdmin },
      { new: true }
    ).select('username email isAdmin');

>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

<<<<<<< HEAD:server/src/routes/admin.js
    user.isAdmin = Boolean(isAdmin);
    await user.save();

    res.status(200).json({
      message: `User ${isAdmin ? 'promoted to' : 'removed from'} admin`,
      user: {
        id: user._id,
        username: user.username,
=======
    res.status(200).json({
      message: `User ${isAdmin ? 'granted' : 'revoked'} admin privileges`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
<<<<<<< HEAD:server/src/routes/admin.js
    console.error('Error updating user admin status:', error);
    res.status(500).json({ message: 'Failed to update user admin status' });
  }
});

// Delete user account
router.delete('/users/:userId', async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;

    // Don't allow deleting own account
=======
    console.error('Update admin status error:', error);
    res.status(500).json({ message: 'Failed to update admin status' });
  }
});

// Delete user account - REQUIRES ADMIN AUTH
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting their own account
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
    if (userId === req.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove user from any active games
    await Game.updateMany(
      { 'players.userId': userId },
      { $pull: { players: { userId } } }
    );

<<<<<<< HEAD:server/src/routes/admin.js
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Force end a game
router.patch('/games/:gameId/end', async (req: AuthenticatedRequest, res) => {
  try {
    const { gameId } = req.params;
    const { reason = 'admin intervention' } = req.body;
=======
    // Delete the user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: 'User account deleted successfully',
      deletedUser: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user account' });
  }
});

// Force end a game - REQUIRES ADMIN AUTH
router.post('/games/:gameId/end', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { reason } = req.body;
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

<<<<<<< HEAD:server/src/routes/admin.js
    game.gameState.status = 'finished';
    game.endedAt = new Date();
    await game.save();

    // Add system message to chat
    game.addChatMessage('system', 'System', `Game ended by admin: ${reason}`, 'system');
    await game.save();

    res.status(200).json({ message: 'Game ended successfully' });
  } catch (error) {
    console.error('Error ending game:', error);
=======
    if (game.gameState.status === 'finished') {
      return res.status(400).json({ message: 'Game is already finished' });
    }

    // Force end the game
    game.gameState.status = 'finished';
    game.endedAt = new Date();
    
    // Add admin message to chat
    if (reason) {
      game.addChatMessage(
        'system',
        'System',
        `Game ended by administrator. Reason: ${reason}`,
        'admin'
      );
    }

    await game.save();

    res.status(200).json({
      message: 'Game ended successfully',
      game: {
        roomId: game.roomId,
        status: game.gameState.status,
        endedAt: game.endedAt,
        reason: reason || 'Ended by administrator'
      }
    });
  } catch (error) {
    console.error('Force end game error:', error);
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
    res.status(500).json({ message: 'Failed to end game' });
  }
});

<<<<<<< HEAD:server/src/routes/admin.js
// Get system statistics
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    // User statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          registeredUsers: { $sum: { $cond: [{ $eq: ['$isGuest', false] }, 1, 0] } },
          guestUsers: { $sum: { $cond: [{ $eq: ['$isGuest', true] }, 1, 0] } },
          adminUsers: { $sum: { $cond: [{ $eq: ['$isAdmin', true] }, 1, 0] } }
        }
      }
    ]);

    // Game statistics
    const gameStats = await Game.aggregate([
      {
        $group: {
          _id: '$gameState.status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Game mode popularity
    const gameModeStats = await Game.aggregate([
      {
        $group: {
          _id: '$settings.gameMode',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      users: userStats[0] || { totalUsers: 0, registeredUsers: 0, guestUsers: 0, adminUsers: 0 },
      gamesByStatus: gameStats,
      gamesByMode: gameModeStats
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
=======
// Get system statistics - REQUIRES ADMIN AUTH
router.get('/stats/system', async (req, res) => {
  try {
    // Server uptime and performance metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    // Database statistics
    const dbStats = {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      totalGames: await Game.countDocuments(),
      activeGames: await Game.countDocuments({
        'gameState.status': { $in: ['waiting', 'starting', 'playing'] }
      })
    };

    // Growth metrics
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersLast30Days = await User.countDocuments({
      createdAt: { $gte: last30Days },
      isGuest: false
    });
    const gamesLast30Days = await Game.countDocuments({
      createdAt: { $gte: last30Days }
    });

    res.status(200).json({
      system: {
        uptime: Math.round(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        database: dbStats,
        growth: {
          newUsersLast30Days,
          gamesLast30Days,
          averageGamesPerDay: Math.round(gamesLast30Days / 30)
        }
      }
    });
  } catch (error) {
    console.error('System stats error:', error);
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/admin.js
    res.status(500).json({ message: 'Failed to fetch system statistics' });
  }
});

export default router;