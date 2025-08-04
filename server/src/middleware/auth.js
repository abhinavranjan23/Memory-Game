import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// HTTP Authentication Middleware
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.userId = user._id.toString();
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Optional authentication (allows guest users)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user) {
        req.userId = user._id.toString();
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for guest users
    next();
  }
};

// Admin authentication
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. Authentication required.' });
    }

    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during admin verification.' });
  }
};

// Socket.IO Authentication Middleware
export const verifySocketToken = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      // Allow guest connections
      socket.isGuest = true;
      socket.username = `Guest${Math.floor(Math.random() * 10000)}`;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('Invalid token'));
    }

    socket.userId = user._id.toString();
    socket.username = user.username;
    socket.isGuest = user.isGuest;
    socket.data = {
      avatar: user.avatar,
      isAdmin: user.isAdmin
    };

    // Update user's last active time
    user.lastActive = new Date();
    await user.save();

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

// Generate JWT token
export const generateToken = (userId, expiresIn = '7d') => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn });
};

// Verify JWT token
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Create guest user
export const createGuestUser = async () => {
  const guestUsername = `Guest${Math.floor(Math.random() * 100000)}`;
  
  const guestUser = new User({
    username: guestUsername,
    isGuest: true,
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      totalScore: 0,
      averageFlipTime: 0,
      bestMatchStreak: 0,
      perfectGames: 0,
      powerUpsUsed: 0
    },
    achievements: []
  });

  await guestUser.save();
  return guestUser;
};