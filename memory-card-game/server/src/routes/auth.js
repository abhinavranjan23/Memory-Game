import express from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import {
  generateToken,
  createGuestUser,
  authenticate,
} from "../middleware/auth.js";

const router = express.Router();

// Guest login - NO AUTH REQUIRED
router.post("/guest", async (req, res) => {
  try {
    const guestUser = await createGuestUser();
    const token = generateToken(guestUser._id.toString());

    res.status(200).json({
      token,
      user: {
        id: guestUser._id,
        username: guestUser.username,
        isGuest: true,
        avatar: guestUser.avatar,
        stats: guestUser.stats,
      },
    });
  } catch (error) {
    console.error("Guest login error:", error);
    res.status(500).json({ message: "Failed to create guest account" });
  }
});

// Register new user - NO AUTH REQUIRED
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email, and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      isGuest: false,
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
      achievements: [],
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isGuest: false,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login user - NO AUTH REQUIRED
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user has a password (not OAuth user)
    if (!user.password) {
      return res
        .status(401)
        .json({ message: "Please use Google login for this account" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isGuest: false,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// Google OAuth callback - NO AUTH REQUIRED
router.post("/google", async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      return res
        .status(400)
        .json({ message: "Google ID and email are required" });
    }

    // Check if user exists
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
      }

      // Update avatar if provided
      if (picture && !user.avatar) {
        user.avatar = picture;
      }

      user.lastActive = new Date();
      await user.save();
    } else {
      // Create new user
      user = new User({
        username: name || email.split("@")[0],
        email,
        googleId,
        avatar: picture,
        isGuest: false,
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
        achievements: [],
      });

      await user.save();
    }

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isGuest: false,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ message: "Google authentication failed" });
  }
});

// Get current user - REQUIRES AUTH
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isGuest: user.isGuest,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to get user data" });
  }
});

// Update user profile - REQUIRES AUTH
router.patch("/profile", authenticate, async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (username && username !== user.username) {
      // Check if username is already taken
      const existingUser = await User.findOne({
        username,
        _id: { $ne: user._id },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      user.username = username;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isGuest: user.isGuest,
        avatar: user.avatar,
        stats: user.stats,
        achievements: user.achievements,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Change password - REQUIRES AUTH
router.patch("/password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has a password (not OAuth user)
    if (!user.password) {
      return res
        .status(400)
        .json({ message: "Cannot change password for OAuth accounts" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

// Logout - REQUIRES AUTH
router.post("/logout", authenticate, async (req, res) => {
  try {
    // Update last active time
    await User.findByIdAndUpdate(req.userId, { lastActive: new Date() });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

export default router;
