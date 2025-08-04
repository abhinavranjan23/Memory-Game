import express from 'express';
import { Game } from '../models/Game.js';
import { User } from '../models/User.js';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Get available public rooms
router.get('/rooms', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const games = await Game.find({
      'gameState.status': { $in: ['waiting', 'starting'] },
      isPrivate: false
    })
    .limit(20)
    .select('roomId players gameState settings createdAt')
    .sort({ createdAt: -1 })
    .exec();

    const rooms = games.map(game => ({
      roomId: game.roomId,
      playerCount: game.players.length,
      maxPlayers: game.settings.maxPlayers,
      gameMode: game.settings.gameMode,
      boardSize: game.settings.boardSize,
      theme: game.settings.theme,
      status: game.gameState.status,
      createdAt: game.createdAt,
      players: game.players.map(p => ({
        username: p.username,
        avatar: p.avatar,
        isReady: p.isReady
      }))
    }));

    res.status(200).json({ rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Failed to fetch rooms' });
  }
});

// Get game details by room ID
router.get('/rooms/:roomId', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { roomId } = req.params;
    const game = await Game.findOne({ roomId }).exec();

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Don't return private room details without proper access
    if (game.isPrivate && !game.players.find(p => p.userId === req.userId)) {
      return res.status(403).json({ message: 'Access denied to private room' });
    }

    res.status(200).json({
      game: {
        roomId: game.roomId,
        players: game.players,
        gameState: game.gameState,
        settings: game.settings,
        chat: game.chat.slice(-50), // Last 50 messages
        isPrivate: game.isPrivate,
        createdAt: game.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ message: 'Failed to fetch game' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { timeframe = 'all', gameMode = 'all', limit = 50 } = req.query;
    
    let dateFilter = {};
    if (timeframe === 'week') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (timeframe === 'month') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    }

    const users = await User.find({
      isGuest: false,
      'stats.gamesPlayed': { $gt: 0 },
      ...dateFilter
    })
    .select('username avatar stats')
    .sort({ 'stats.totalScore': -1, 'stats.winRate': -1 })
    .limit(Number(limit))
    .exec();

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      username: user.username,
      avatar: user.avatar,
      score: user.stats.totalScore,
      gamesWon: user.stats.gamesWon,
      gamesPlayed: user.stats.gamesPlayed,
      winRate: user.stats.winRate,
      bestMatchStreak: user.stats.bestMatchStreak
    }));

    res.status(200).json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

// Get match history for a user
router.get('/history', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const games = await Game.find({
      'players.userId': req.userId,
      'gameState.status': 'finished'
    })
    .select('roomId players gameState settings createdAt endedAt')
    .sort({ endedAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .exec();

    const matches = games.map(game => {
      const player = game.players.find(p => p.userId === req.userId);
      const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
      const playerRank = sortedPlayers.findIndex(p => p.userId === req.userId) + 1;
      const winner = sortedPlayers[0];

      return {
        gameId: game._id,
        roomId: game.roomId,
        gameMode: game.settings.gameMode,
        boardSize: game.settings.boardSize,
        theme: game.settings.theme,
        playerCount: game.players.length,
        playerScore: player?.score || 0,
        playerRank,
        isWinner: winner.userId === req.userId,
        winner: {
          username: winner.username,
          score: winner.score
        },
        duration: game.endedAt && game.createdAt 
          ? Math.round((game.endedAt.getTime() - game.createdAt.getTime()) / 1000)
          : 0,
        createdAt: game.createdAt,
        endedAt: game.endedAt
      };
    });

    const total = await Game.countDocuments({
      'players.userId': req.userId,
      'gameState.status': 'finished'
    });

    res.status(200).json({
      matches,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching match history:', error);
    res.status(500).json({ message: 'Failed to fetch match history' });
  }
});

// Get game statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isGuest: false });
    const totalGames = await Game.countDocuments({ 'gameState.status': 'finished' });
    const activeGames = await Game.countDocuments({ 
      'gameState.status': { $in: ['waiting', 'starting', 'playing'] } 
    });
    const todayGames = await Game.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      'gameState.status': 'finished'
    });

    // Get popular game modes
    const gameModeCounts = await Game.aggregate([
      { $match: { 'gameState.status': 'finished' } },
      { $group: { _id: '$settings.gameMode', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      totalUsers,
      totalGames,
      activeGames,
      todayGames,
      popularGameModes: gameModeCounts
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Get available themes
router.get('/themes', (req, res) => {
  const themes = [
    {
      id: 'emojis',
      name: 'Emojis',
      description: 'Fun emoji cards',
      preview: ['🎮', '🎯', '🎲', '🎪']
    },
    {
      id: 'animals',
      name: 'Animals',
      description: 'Cute animal friends',
      preview: ['🐶', '🐱', '🐭', '🐹']
    },
    {
      id: 'techLogos',
      name: 'Tech Icons',
      description: 'Technology symbols',
      preview: ['⚛️', '🅰️', '🔷', '📱']
    },
    {
      id: 'food',
      name: 'Food',
      description: 'Delicious treats',
      preview: ['🍎', '🍊', '🍋', '🍌']
    }
  ];

  res.status(200).json({ themes });
});

// Get achievements list
router.get('/achievements', async (req, res) => {
  try {
    const achievements = [
      {
        id: 'first-win',
        name: 'First Victory',
        description: 'Win your first game',
        iconUrl: '🏆',
        rarity: 'common'
      },
      {
        id: 'perfect-memory',
        name: 'Perfect Memory',
        description: 'Complete a game without any wrong flips',
        iconUrl: '🧠',
        rarity: 'rare'
      },
      {
        id: 'speed-demon',
        name: 'Speed Demon',
        description: 'Win a blitz mode game',
        iconUrl: '⚡',
        rarity: 'uncommon'
      },
      {
        id: 'memory-master',
        name: 'Memory Master',
        description: 'Get a 5+ match streak',
        iconUrl: '🎯',
        rarity: 'rare'
      },
      {
        id: 'power-player',
        name: 'Power Player',
        description: 'Win a game using 3+ power-ups',
        iconUrl: '💫',
        rarity: 'uncommon'
      },
      {
        id: 'grandmaster',
        name: 'Grandmaster',
        description: 'Win an 8x8 board game',
        iconUrl: '👑',
        rarity: 'legendary'
      }
    ];

    res.status(200).json({ achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ message: 'Failed to fetch achievements' });
  }
});

export default router;