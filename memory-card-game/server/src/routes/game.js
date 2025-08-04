const express = require('express');
const { Game } = require('../models/Game.js');
const { User } = require('../models/User.js');
const auth = require('../middleware/auth.js');

const router = express.Router();

// Optional auth middleware for routes that can work with or without auth
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
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

// Get available public rooms - NO AUTH REQUIRED (but optional for personalized results)
router.get('/rooms', optionalAuth, async (req, res) => {
  try {
    const games = await Game.find({
      'gameState.status': { $in: ['waiting', 'starting'] },
      isPrivate: false,
    })
      .limit(20)
      .select('roomId players gameState settings createdAt')
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
      hasPassword: game.isPrivate
    }));

    res.status(200).json({
      message: 'Available rooms retrieved successfully',
      rooms,
      totalCount: rooms.length
    });

  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      message: 'Failed to retrieve rooms'
    });
  }
});

// Create new game room - REQUIRES AUTH
router.post('/create', auth, async (req, res) => {
  try {
    const {
      isPrivate = false,
      password = null,
      settings = {}
    } = req.body;

    // Validate settings
    const gameSettings = {
      maxPlayers: Math.min(Math.max(settings.maxPlayers || 2, 2), 4),
      boardSize: ['4x4', '6x6', '8x8'].includes(settings.boardSize) ? settings.boardSize : '4x4',
      gameMode: ['classic', 'blitz', 'sudden-death'].includes(settings.gameMode) ? settings.gameMode : 'classic',
      theme: settings.theme || 'emojis',
      powerUpsEnabled: Boolean(settings.powerUpsEnabled),
      timeLimit: settings.gameMode === 'blitz' ? (settings.timeLimit || 60) : null
    };

    // Generate unique room ID
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Create game
    const game = new Game({
      roomId,
      hostId: req.user.id,
      isPrivate,
      password: isPrivate ? password : null,
      settings: gameSettings,
      players: [{
        userId: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user.username}`,
        isHost: true,
        isGuest: req.user.isGuest,
        score: 0,
        matches: 0,
        flips: 0,
        powerUps: []
      }],
      gameState: {
        status: 'waiting',
        currentTurn: 0,
        flippedCards: [],
        matchedPairs: 0,
        totalPairs: 0
      }
    });

    await game.save();

    res.status(201).json({
      message: 'Game room created successfully',
      game: {
        roomId: game.roomId,
        isPrivate: game.isPrivate,
        settings: game.settings,
        players: game.players,
        gameState: game.gameState,
        createdAt: game.createdAt
      }
    });

  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({
      message: 'Failed to create game room'
    });
  }
});

// Join game room - REQUIRES AUTH
router.post('/join/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;

    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({
        message: 'Game room not found'
      });
    }

    // Check if game is full
    if (game.players.length >= game.settings.maxPlayers) {
      return res.status(400).json({
        message: 'Game room is full'
      });
    }

    // Check if player is already in the game
    const existingPlayer = game.players.find(p => p.userId === req.user.id);
    if (existingPlayer) {
      return res.status(400).json({
        message: 'You are already in this game'
      });
    }

    // Check password for private rooms
    if (game.isPrivate && game.password !== password) {
      return res.status(401).json({
        message: 'Invalid room password'
      });
    }

    // Check game status
    if (!['waiting', 'starting'].includes(game.gameState.status)) {
      return res.status(400).json({
        message: 'Cannot join game in progress'
      });
    }

    // Add player to game
    const newPlayer = {
      userId: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user.username}`,
      isHost: false,
      isGuest: req.user.isGuest,
      score: 0,
      matches: 0,
      flips: 0,
      powerUps: []
    };

    game.addPlayer(newPlayer.userId, newPlayer.username, newPlayer.avatar);
    await game.save();

    res.status(200).json({
      message: 'Joined game successfully',
      game: {
        roomId: game.roomId,
        isPrivate: game.isPrivate,
        settings: game.settings,
        players: game.players,
        gameState: game.gameState
      }
    });

  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({
      message: 'Failed to join game'
    });
  }
});

// Leave game room - REQUIRES AUTH  
router.post('/leave/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({
        message: 'Game room not found'
      });
    }

    // Check if player is in the game
    const playerIndex = game.players.findIndex(p => p.userId === req.user.id);
    if (playerIndex === -1) {
      return res.status(400).json({
        message: 'You are not in this game'
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

    // If no players left, delete the game
    if (game.players.length === 0) {
      await Game.findByIdAndDelete(game._id);
      return res.status(200).json({
        message: 'Left game successfully',
        gameDeleted: true
      });
    }

    await game.save();

    res.status(200).json({
      message: 'Left game successfully',
      gameDeleted: false
    });

  } catch (error) {
    console.error('Leave game error:', error);
    res.status(500).json({
      message: 'Failed to leave game'
    });
  }
});

// Get game details - REQUIRES AUTH
router.get('/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;

    const game = await Game.findOne({ roomId });
    if (!game) {
      return res.status(404).json({
        message: 'Game not found'
      });
    }

    // Check if user is a player in this game
    const player = game.players.find(p => p.userId === req.user.id);
    if (!player) {
      return res.status(403).json({
        message: 'You are not a player in this game'
      });
    }

    res.status(200).json({
      message: 'Game details retrieved successfully',
      game: {
        roomId: game.roomId,
        isPrivate: game.isPrivate,
        settings: game.settings,
        players: game.players,
        gameState: game.gameState,
        createdAt: game.createdAt,
        startedAt: game.startedAt,
        endedAt: game.endedAt
      }
    });

  } catch (error) {
    console.error('Get game details error:', error);
    res.status(500).json({
      message: 'Failed to get game details'
    });
  }
});

// Get game statistics - REQUIRES AUTH
router.get('/stats/user', auth, async (req, res) => {
  try {
    const { timeframe = 'all' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case 'week':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case 'year':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } };
        break;
    }

    // For guest users, return basic stats
    if (req.user.isGuest) {
      return res.status(200).json({
        message: 'User statistics retrieved successfully',
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
          timeframe
        }
      });
    }

    // Get user's game statistics
    const games = await Game.find({
      'players.userId': req.user.id,
      'gameState.status': 'finished',
      ...dateFilter
    });

    const stats = {
      gamesPlayed: games.length,
      gamesWon: 0,
      totalScore: 0,
      bestScore: 0,
      totalFlips: 0,
      totalMatches: 0,
      totalFlipTime: 0,
      longestMatchStreak: 0,
      powerUpsUsed: 0,
      perfectGames: 0
    };

    games.forEach(game => {
      const player = game.players.find(p => p.userId === req.user.id);
      if (player) {
        if (game.gameState.winner === req.user.id) {
          stats.gamesWon++;
        }
        stats.totalScore += player.score || 0;
        stats.bestScore = Math.max(stats.bestScore, player.score || 0);
        stats.totalFlips += player.flips || 0;
        stats.totalMatches += player.matches || 0;
        stats.powerUpsUsed += (player.powerUps || []).length;
        
        // Check for perfect games (no wrong flips)
        if (player.matches > 0 && player.flips === player.matches * 2) {
          stats.perfectGames++;
        }
      }
    });

    // Calculate derived stats
    stats.winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
    stats.averageScore = stats.gamesPlayed > 0 ? Math.round(stats.totalScore / stats.gamesPlayed) : 0;
    stats.averageFlipTime = stats.totalFlips > 0 ? Math.round(stats.totalFlipTime / stats.totalFlips) : 0;

    res.status(200).json({
      message: 'User statistics retrieved successfully',
      statistics: { ...stats, timeframe }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve user statistics'
    });
  }
});

// Get global game statistics - NO AUTH REQUIRED
router.get('/stats/global', async (req, res) => {
  try {
    const totalGames = await Game.countDocuments();
    const totalPlayers = await User.countDocuments({ isGuest: false });
    const activeGames = await Game.countDocuments({ 
      'gameState.status': { $in: ['waiting', 'starting', 'in-progress'] } 
    });

    // Get average game duration
    const finishedGames = await Game.find({ 
      'gameState.status': 'finished',
      startedAt: { $exists: true },
      endedAt: { $exists: true }
    }).select('startedAt endedAt');

    let averageGameDuration = 0;
    if (finishedGames.length > 0) {
      const totalDuration = finishedGames.reduce((sum, game) => {
        return sum + (new Date(game.endedAt) - new Date(game.startedAt));
      }, 0);
      averageGameDuration = Math.round(totalDuration / finishedGames.length);
    }

    res.status(200).json({
      message: 'Global statistics retrieved successfully',
      statistics: {
        totalGames,
        totalPlayers,
        activeGames,
        averageGameDuration,
        finishedGames: finishedGames.length
      }
    });

  } catch (error) {
    console.error('Get global stats error:', error);
    res.status(500).json({
      message: 'Failed to retrieve global statistics'
    });
  }
});

// Get leaderboard - NO AUTH REQUIRED (but personalized if authenticated)
router.get('/leaderboard/global', optionalAuth, async (req, res) => {
  try {
    const { 
      limit = 50, 
      page = 1, 
      timeframe = 'all' 
    } = req.query;

    const limitNum = Math.min(parseInt(limit), 100);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    let dateFilter = {};
    const now = new Date();
    
    switch (timeframe) {
      case 'week':
        dateFilter = { lastActive: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        dateFilter = { lastActive: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
    }

    // Get users for different leaderboard types
    const totalScoreLeaderboard = await User.find({ 
      isGuest: false,
      'stats.gamesPlayed': { $gt: 0 },
      ...dateFilter
    })
    .select('username avatar stats')
    .sort({ 'stats.totalScore': -1 })
    .skip(skip)
    .limit(limitNum);

    const winRateLeaderboard = await User.find({ 
      isGuest: false,
      'stats.gamesPlayed': { $gte: 5 }, // Minimum 5 games for win rate
      ...dateFilter
    })
    .select('username avatar stats')
    .sort({ 'stats.winRate': -1, 'stats.gamesPlayed': -1 })
    .skip(skip)
    .limit(limitNum);

    const gamesPlayedLeaderboard = await User.find({ 
      isGuest: false,
      'stats.gamesPlayed': { $gt: 0 },
      ...dateFilter
    })
    .select('username avatar stats')
    .sort({ 'stats.gamesPlayed': -1 })
    .skip(skip)
    .limit(limitNum);

    // Format leaderboards
    const formatLeaderboard = (users, scoreField) => {
      return users.map((user, index) => ({
        rank: skip + index + 1,
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        totalScore: user.stats.totalScore,
        gamesPlayed: user.stats.gamesPlayed,
        winRate: user.stats.winRate,
        [scoreField]: user.stats[scoreField]
      }));
    };

    // Check pagination
    const totalUsers = await User.countDocuments({ 
      isGuest: false,
      'stats.gamesPlayed': { $gt: 0 },
      ...dateFilter
    });

    const hasMore = skip + limitNum < totalUsers;

    res.status(200).json({
      message: 'Leaderboard retrieved successfully',
      leaderboards: {
        totalScore: formatLeaderboard(totalScoreLeaderboard, 'totalScore'),
        winRate: formatLeaderboard(winRateLeaderboard, 'winRate'),
        gamesPlayed: formatLeaderboard(gamesPlayedLeaderboard, 'gamesPlayed')
      },
      pagination: {
        currentPage: pageNum,
        limit: limitNum,
        totalItems: totalUsers,
        hasMore
      },
      timeframe
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      message: 'Failed to retrieve leaderboard'
    });
  }
});

// Get match history - REQUIRES AUTH
router.get('/history/matches', auth, async (req, res) => {
  try {
    const { 
      limit = 10, 
      page = 1,
      gameMode = 'all',
      result = 'all' // 'won', 'lost', 'all'
    } = req.query;

    const limitNum = Math.min(parseInt(limit), 50);
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    // For guest users, return empty history
    if (req.user.isGuest) {
      return res.status(200).json({
        message: 'Match history retrieved successfully',
        matches: [],
        pagination: {
          currentPage: pageNum,
          limit: limitNum,
          totalItems: 0,
          hasMore: false
        }
      });
    }

    // Build query
    let query = {
      'players.userId': req.user.id,
      'gameState.status': 'finished'
    };

    if (gameMode !== 'all') {
      query['settings.gameMode'] = gameMode;
    }

    // Get games
    let games = await Game.find(query)
      .select('roomId settings gameState players startedAt endedAt createdAt')
      .sort({ endedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Filter by result if specified
    if (result !== 'all') {
      games = games.filter(game => {
        const won = game.gameState.winner === req.user.id;
        return result === 'won' ? won : !won;
      });
    }

    // Format matches
    const matches = games.map(game => {
      const player = game.players.find(p => p.userId === req.user.id);
      const won = game.gameState.winner === req.user.id;
      
      return {
        gameId: game._id,
        roomId: game.roomId,
        gameMode: game.settings.gameMode,
        boardSize: game.settings.boardSize,
        playerCount: game.players.length,
        result: won ? 'won' : 'lost',
        score: player?.score || 0,
        matches: player?.matches || 0,
        flips: player?.flips || 0,
        duration: game.startedAt && game.endedAt ? 
          Math.round((new Date(game.endedAt) - new Date(game.startedAt)) / 1000) : null,
        playedAt: game.endedAt,
        opponents: game.players
          .filter(p => p.userId !== req.user.id)
          .map(p => ({
            username: p.username,
            avatar: p.avatar,
            score: p.score
          }))
      };
    });

    // Get total count for pagination
    const totalMatches = await Game.countDocuments({
      'players.userId': req.user.id,
      'gameState.status': 'finished'
    });

    res.status(200).json({
      message: 'Match history retrieved successfully',
      matches,
      pagination: {
        currentPage: pageNum,
        limit: limitNum,
        totalItems: totalMatches,
        hasMore: skip + limitNum < totalMatches
      },
      filters: {
        gameMode,
        result
      }
    });

  } catch (error) {
    console.error('Get match history error:', error);
    res.status(500).json({
      message: 'Failed to retrieve match history'
    });
  }
});

module.exports = router;
