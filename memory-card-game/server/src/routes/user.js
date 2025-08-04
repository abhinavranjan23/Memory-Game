import express from 'express';
import { User } from '../models/User.js';
<<<<<<< HEAD:server/src/routes/user.js
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Get user stats
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res) => {
=======
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user's personal stats - REQUIRES AUTH
router.get('/stats', authenticate, async (req, res) => {
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/user.js
  try {
    const user = await User.findById(req.userId).select('stats achievements');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      stats: user.stats,
      achievements: user.achievements
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
<<<<<<< HEAD:server/src/routes/user.js
    res.status(500).json({ message: 'Failed to fetch user stats' });
  }
});

// Get user profile by ID
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('username avatar stats achievements createdAt');
=======
    res.status(500).json({ message: 'Failed to fetch user statistics' });
  }
});

// Get public user profile by ID - NO AUTH REQUIRED
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('username avatar stats achievements createdAt isGuest -_id')
      .exec();
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/user.js
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

<<<<<<< HEAD:server/src/routes/user.js
    res.status(200).json({
      profile: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
        memberSince: user.createdAt
=======
    // Don't show detailed stats for guest users for privacy
    if (user.isGuest) {
      return res.status(404).json({ message: 'Profile not available for guest users' });
    }

    res.status(200).json({
      profile: {
        username: user.username,
        avatar: user.avatar,
        memberSince: user.createdAt,
        stats: {
          gamesPlayed: user.stats.gamesPlayed,
          gamesWon: user.stats.gamesWon,
          winRate: Math.round(user.stats.winRate),
          totalScore: user.stats.totalScore,
          bestMatchStreak: user.stats.bestMatchStreak,
          perfectGames: user.stats.perfectGames
        },
        achievements: user.achievements.map(achievement => ({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          iconUrl: achievement.iconUrl,
          unlockedAt: achievement.unlockedAt
        }))
>>>>>>> 75e16d34ab974922962d3ce3f9ab5a8c725f2251:memory-card-game/server/src/routes/user.js
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

export default router;