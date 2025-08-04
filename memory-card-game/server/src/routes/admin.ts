import express from 'express';
import { Game } from '../models/Game.js';
import { User } from '../models/User.js';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin privileges
router.use(authenticate);
router.use(requireAdmin);

// Get dashboard statistics
router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    const totalGames = await Game.countDocuments();
    const activeGames = await Game.countDocuments({
      'gameState.status': { $in: ['waiting', 'starting', 'playing'] }
    });
    const todayGames = await Game.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Get recent activity
    const recentGames = await Game.find()
      .select('roomId players gameState settings createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    const recentUsers = await User.find()
      .select('username avatar isGuest createdAt lastActive')
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

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
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// Get all active games
router.get('/games', async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let filter = {};
    if (status) {
      filter = { 'gameState.status': status };
    }

    const games = await Game.find(filter)
      .select('roomId players gameState settings createdAt endedAt isPrivate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .exec();

    const total = await Game.countDocuments(filter);

    res.status(200).json({
      games: games.map(game => ({
        id: game._id,
        roomId: game.roomId,
        players: game.players.map(p => ({
          username: p.username,
          score: p.score
        })),
        status: game.gameState.status,
        gameMode: game.settings.gameMode,
        boardSize: game.settings.boardSize,
        isPrivate: game.isPrivate,
        createdAt: game.createdAt,
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
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isAdmin = Boolean(isAdmin);
    await user.save();

    res.status(200).json({
      message: `User ${isAdmin ? 'promoted to' : 'removed from'} admin`,
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Error updating user admin status:', error);
    res.status(500).json({ message: 'Failed to update user admin status' });
  }
});

// Delete user account
router.delete('/users/:userId', async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;

    // Don't allow deleting own account
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

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    game.gameState.status = 'finished';
    game.endedAt = new Date();
    await game.save();

    // Add system message to chat
    game.addChatMessage('system', 'System', `Game ended by admin: ${reason}`, 'system');
    await game.save();

    res.status(200).json({ message: 'Game ended successfully' });
  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({ message: 'Failed to end game' });
  }
});

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
    res.status(500).json({ message: 'Failed to fetch system statistics' });
  }
});

export default router;