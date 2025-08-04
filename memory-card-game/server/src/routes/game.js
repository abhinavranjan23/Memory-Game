import express from 'express';
import { Game } from '../models/Game.js';
import { User } from '../models/User.js';
<<<<<<< HEAD:server/src/routes/game.js
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Get available public rooms
router.get('/rooms', optionalAuth, async (req: AuthenticatedRequest, res) => {
=======
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get available public rooms - NO AUTH REQUIRED (but optional for personalized results)
router.get('/rooms', optionalAuth, async (req, res) => {
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js
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

<<<<<<< HEAD:server/src/routes/game.js
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

=======
    res.status(200).json({
      rooms,
      total: rooms.length
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Failed to fetch game rooms' });
  }
});

// Get specific game details - REQUIRES AUTH
router.get('/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const game = await Game.findOne({ roomId });
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

<<<<<<< HEAD:server/src/routes/game.js
    // Don't return private room details without proper access
    if (game.isPrivate && !game.players.find(p => p.userId === req.userId)) {
      return res.status(403).json({ message: 'Access denied to private room' });
=======
    // Check if user is player in the game or admin
    const isPlayer = game.players.some(p => p.userId === req.userId);
    const isAdmin = req.user?.isAdmin;
    
    if (!isPlayer && !isAdmin && game.isPrivate) {
      return res.status(403).json({ message: 'Access denied to private game' });
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js
    }

    res.status(200).json({
      game: {
        roomId: game.roomId,
        players: game.players,
        gameState: game.gameState,
        settings: game.settings,
<<<<<<< HEAD:server/src/routes/game.js
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
=======
        chat: isPlayer || isAdmin ? game.chat : [],
        isPrivate: game.isPrivate,
        createdAt: game.createdAt,
        endedAt: game.endedAt
      }
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ message: 'Failed to fetch game details' });
  }
});

// Get global leaderboard - NO AUTH REQUIRED
router.get('/leaderboard/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Get top players by different metrics
    const topByScore = await User.find({ isGuest: false })
      .sort({ 'stats.totalScore': -1 })
      .limit(limit)
      .skip(skip)
      .select('username avatar stats.totalScore stats.gamesPlayed stats.winRate')
      .exec();

    const topByWinRate = await User.find({ 
      isGuest: false,
      'stats.gamesPlayed': { $gte: 5 } // Minimum games for win rate ranking
    })
      .sort({ 'stats.winRate': -1 })
      .limit(limit)
      .skip(skip)
      .select('username avatar stats.winRate stats.gamesPlayed stats.totalScore')
      .exec();

    const topByGames = await User.find({ isGuest: false })
      .sort({ 'stats.gamesPlayed': -1 })
      .limit(limit)
      .skip(skip)
      .select('username avatar stats.gamesPlayed stats.winRate stats.totalScore')
      .exec();

    res.status(200).json({
      leaderboards: {
        totalScore: topByScore.map((user, index) => ({
          rank: skip + index + 1,
          username: user.username,
          avatar: user.avatar,
          totalScore: user.stats.totalScore,
          gamesPlayed: user.stats.gamesPlayed,
          winRate: Math.round(user.stats.winRate)
        })),
        winRate: topByWinRate.map((user, index) => ({
          rank: skip + index + 1,
          username: user.username,
          avatar: user.avatar,
          winRate: Math.round(user.stats.winRate),
          gamesPlayed: user.stats.gamesPlayed,
          totalScore: user.stats.totalScore
        })),
        gamesPlayed: topByGames.map((user, index) => ({
          rank: skip + index + 1,
          username: user.username,
          avatar: user.avatar,
          gamesPlayed: user.stats.gamesPlayed,
          winRate: Math.round(user.stats.winRate),
          totalScore: user.stats.totalScore
        }))
      },
      pagination: {
        page,
        limit,
        hasMore: topByScore.length === limit
      }
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

<<<<<<< HEAD:server/src/routes/game.js
// Get match history for a user
router.get('/history', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
=======
// Get user's match history - REQUIRES AUTH
router.get('/history/me', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js

    const games = await Game.find({
      'players.userId': req.userId,
      'gameState.status': 'finished'
    })
<<<<<<< HEAD:server/src/routes/game.js
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
=======
    .sort({ endedAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('roomId players gameState settings endedAt createdAt')
    .exec();

    const matchHistory = games.map(game => {
      const userPlayer = game.players.find(p => p.userId === req.userId);
      const otherPlayers = game.players.filter(p => p.userId !== req.userId);
      
      // Determine if user won
      const maxScore = Math.max(...game.players.map(p => p.score));
      const userWon = userPlayer.score === maxScore;
      
      return {
        gameId: game.roomId,
        gameMode: game.settings.gameMode,
        boardSize: game.settings.boardSize,
        theme: game.settings.theme,
        userScore: userPlayer.score,
        userMatches: userPlayer.matches,
        userFlips: userPlayer.flips,
        won: userWon,
        otherPlayers: otherPlayers.map(p => ({
          username: p.username,
          avatar: p.avatar,
          score: p.score,
          matches: p.matches
        })),
        duration: game.endedAt - game.createdAt,
        playedAt: game.endedAt
      };
    });

    res.status(200).json({
      history: matchHistory,
      pagination: {
        page,
        limit,
        hasMore: games.length === limit
      }
    });
  } catch (error) {
    console.error('Match history error:', error);
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js
    res.status(500).json({ message: 'Failed to fetch match history' });
  }
});

<<<<<<< HEAD:server/src/routes/game.js
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
=======
// Get game statistics - NO AUTH REQUIRED
router.get('/stats/global', async (req, res) => {
  try {
    const totalGames = await Game.countDocuments({ 'gameState.status': 'finished' });
    const totalPlayers = await User.countDocuments({ isGuest: false });
    const activeGames = await Game.countDocuments({ 
      'gameState.status': { $in: ['waiting', 'starting', 'playing'] }
    });
    
    // Get most popular game modes
    const gameModeStats = await Game.aggregate([
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js
      { $match: { 'gameState.status': 'finished' } },
      { $group: { _id: '$settings.gameMode', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

<<<<<<< HEAD:server/src/routes/game.js
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
=======
    // Get average game duration
    const avgDuration = await Game.aggregate([
      { $match: { 'gameState.status': 'finished', endedAt: { $exists: true } } },
      { $project: { duration: { $subtract: ['$endedAt', '$createdAt'] } } },
      { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
    ]);

    res.status(200).json({
      statistics: {
        totalGames,
        totalPlayers,
        activeGames,
        averageGameDuration: avgDuration[0]?.avgDuration || 0,
        popularGameModes: gameModeStats.map(mode => ({
          mode: mode._id,
          gamesPlayed: mode.count
        }))
      }
    });
  } catch (error) {
    console.error('Game stats error:', error);
    res.status(500).json({ message: 'Failed to fetch game statistics' });
  }
});

// Get available themes - NO AUTH REQUIRED
router.get('/themes/available', async (req, res) => {
  try {
    const themes = [
      {
        id: 'emojis',
        name: 'Emojis',
        description: 'Fun emoji cards',
        preview: ['😀', '🎮', '🎯', '⚡']
      },
      {
        id: 'animals',
        name: 'Animals',
        description: 'Cute animal cards',
        preview: ['🐱', '🐶', '🐸', '🦊']
      },
      {
        id: 'tech',
        name: 'Tech Icons',
        description: 'Technology symbols',
        preview: ['💻', '📱', '🖥️', '⌨️']
      },
      {
        id: 'nature',
        name: 'Nature',
        description: 'Beautiful nature elements',
        preview: ['🌲', '🌺', '🌙', '⭐']
      },
      {
        id: 'food',
        name: 'Food',
        description: 'Delicious food items',
        preview: ['🍕', '🍔', '🍰', '🍎']
      }
    ];

    res.status(200).json({ themes });
  } catch (error) {
    console.error('Themes error:', error);
    res.status(500).json({ message: 'Failed to fetch themes' });
  }
});

// Get achievement definitions - NO AUTH REQUIRED
router.get('/achievements/definitions', async (req, res) => {
  try {
    const achievements = [
      {
        id: 'first_win',
        name: 'First Victory',
        description: 'Win your first game',
        iconUrl: '🥇',
        category: 'milestone',
        requirements: 'Win 1 game'
      },
      {
        id: 'perfect_memory',
        name: 'Perfect Memory',
        description: 'Complete a game without any wrong matches',
        iconUrl: '🧠',
        category: 'skill',
        requirements: '100% accuracy in a game'
      },
      {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Win a Blitz mode game',
        iconUrl: '⚡',
        category: 'mode',
        requirements: 'Win a Blitz game'
      },
      {
        id: 'combo_master',
        name: 'Combo Master',
        description: 'Get a 5+ match streak',
        iconUrl: '🔥',
        category: 'skill',
        requirements: '5 consecutive matches'
      },
      {
        id: 'power_player',
        name: 'Power Player',
        description: 'Win a game using 3+ power-ups',
        iconUrl: '🎮',
        category: 'strategy',
        requirements: 'Use 3+ power-ups in a winning game'
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js
      },
      {
        id: 'grandmaster',
        name: 'Grandmaster',
        description: 'Win an 8x8 board game',
        iconUrl: '👑',
<<<<<<< HEAD:server/src/routes/game.js
        rarity: 'legendary'
=======
        category: 'difficulty',
        requirements: 'Win on largest board size'
      },
      {
        id: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Play with 10 different players',
        iconUrl: '🦋',
        category: 'social',
        requirements: 'Play with 10 unique players'
      },
      {
        id: 'marathon_player',
        name: 'Marathon Player',
        description: 'Play 100 games',
        iconUrl: '🏃',
        category: 'milestone',
        requirements: 'Complete 100 games'
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js
      }
    ];

    res.status(200).json({ achievements });
  } catch (error) {
<<<<<<< HEAD:server/src/routes/game.js
    console.error('Error fetching achievements:', error);
=======
    console.error('Achievements error:', error);
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/game.js
    res.status(500).json({ message: 'Failed to fetch achievements' });
  }
});

export default router;