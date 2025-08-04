import express from 'express';
import { User } from '../models/User.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = express.Router();

// Get user stats
router.get('/stats', authenticate, async (req: AuthenticatedRequest, res) => {
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
    res.status(500).json({ message: 'Failed to fetch user stats' });
  }
});

// Get user profile by ID
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('username avatar stats achievements createdAt');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      profile: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
        memberSince: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
});

export default router;