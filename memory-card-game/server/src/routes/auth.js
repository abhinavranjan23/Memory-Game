const express = require("express");
const bcrypt = require("bcryptjs");
const { User } = require("../models/User.js");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/auth.js");
const auth = require("../middleware/auth.js");

const router = express.Router();

// Guest login - NO AUTH REQUIRED
router.post("/guest", async (req, res) => {
  try {
    let { username } = req.body;

    // Generate random username if not provided
    if (!username || username.trim().length < 2) {
      const randomId = Math.random().toString(36).substr(2, 6);
      username = `Guest${randomId}`;
    } else {
      username = username.trim();
    }

    // Check if username already exists
    const existingUser = await User.findOne({
      username: username,
      isGuest: false,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username already taken by a registered user",
      });
    }

    // Create guest user (temporary, not saved to DB in most cases)
    const guestUser = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: username,
      isGuest: true,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        winRate: 0,
        averageScore: 0,
        bestScore: 0,
        totalFlips: 0,
        totalMatches: 0,
        averageFlipTime: 0,
        longestMatchStreak: 0,
        powerUpsUsed: 0,
        perfectGames: 0,
      },
      achievements: [],
      createdAt: new Date(),
      lastActive: new Date(),
    };

    // Generate tokens for guest session
    const accessToken = generateAccessToken(guestUser.id, true);
    const refreshToken = generateRefreshToken(guestUser.id, true);

    res.status(201).json({
      message: "Guest session created successfully",
      user: guestUser,
      token: accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Guest login error:", error);
    res.status(500).json({
      message: "Failed to create guest session",
    });
  }
});

// Register new user - NO AUTH REQUIRED
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        message: "Username, email, and password are required",
      });
    }

    if (username.length < 4) {
      return res.status(400).json({
        message: "Username must be at least 4 characters long",
      });
    }

    // Check for valid characters (letters, numbers, hyphens, underscores only)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(username)) {
      return res.status(400).json({
        message:
          "Username can only contain letters, numbers, hyphens (-), and underscores (_)",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    // Check for common weak passwords
    const weakPasswords = [
      "password",
      "123456",
      "123456789",
      "qwerty",
      "abc123",
      "password123",
      "admin",
      "letmein",
      "welcome",
      "monkey",
      "12345678",
      "1234567",
      "1234567890",
      "password1",
      "123123",
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      return res.status(400).json({
        message: "Password is too common. Please choose a stronger password.",
      });
    }

    // Check for password complexity (at least one letter, one number, and one special character)
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters long and contain at least one letter, one number, and one special character (@$!%*?&).",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username }],
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          existingUser.email === email.toLowerCase()
            ? "Email already registered"
            : "Username already taken",
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      isGuest: false,
    });

    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id, false);
    const refreshToken = generateRefreshToken(user._id, false);

    // Return user data (excluding password)
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isGuest: false,
      isAdmin: user.isAdmin,
      stats: user.stats,
      achievements: user.achievements,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
      token: accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Registration failed",
    });
  }
});

// Login existing user - NO AUTH REQUIRED
router.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        message: "Email/Username and password are required",
      });
    }

    // Basic password validation for login
    if (password.length < 6) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername },
      ],
      isGuest: false,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check password
    if (!user.password) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id, false);
    const refreshToken = generateRefreshToken(user._id, false);

    // Return user data (excluding password)
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isGuest: false,
      isAdmin: user.isAdmin,
      stats: user.stats,
      achievements: user.achievements,
      createdAt: user.createdAt,
      lastActive: user.lastActive,
    };

    res.status(200).json({
      message: "Login successful",
      user: userResponse,
      token: accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Login failed",
    });
  }
});

// Refresh access token - NO AUTH REQUIRED (uses refresh token)
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        message: "Invalid refresh token",
      });
    }

    // For guest users, generate new tokens
    if (decoded.isGuest) {
      const newAccessToken = generateAccessToken(decoded.userId, true);
      const newRefreshToken = generateRefreshToken(decoded.userId, true);

      return res.status(200).json({
        message: "Tokens refreshed successfully",
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    }

    // For registered users, check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id, false);
    const newRefreshToken = generateRefreshToken(user._id, false);

    res.status(200).json({
      message: "Tokens refreshed successfully",
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      message: "Failed to refresh token",
    });
  }
});

// Logout user - REQUIRES AUTH
router.post("/logout", auth, async (req, res) => {
  try {
    // For registered users, update last active time
    if (!req.user.isGuest) {
      await User.findByIdAndUpdate(req.user.id, {
        lastActive: new Date(),
      });
    }

    res.status(200).json({
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Logout failed",
    });
  }
});

// Get current user info - REQUIRES AUTH
router.get("/me", auth, async (req, res) => {
  try {
    if (req.user.isGuest) {
      // For guest users, return the basic info
      return res.status(200).json({
        user: {
          id: req.user.id,
          username: req.user.username,
          isGuest: true,
          avatar: req.user.avatar,
          stats: req.user.stats || {
            gamesPlayed: 0,
            gamesWon: 0,
            totalScore: 0,
            winRate: 0,
          },
        },
      });
    }

    // For registered users, get from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isGuest: false,
      isAdmin: user.isAdmin,
      stats: user.stats,
      achievements: user.achievements,
      privacySettings: user.privacySettings,
      createdAt: user.createdAt,
      lastActive: user.lastActive,
    };

    res.status(200).json({
      user: userResponse,
    });
  } catch (error) {
    console.error("Get user info error:", error);
    res.status(500).json({
      message: "Failed to get user information",
    });
  }
});

// Check username availability - NO AUTH REQUIRED
router.get("/check-username/:username", async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.trim().length < 4) {
      return res.status(400).json({
        available: false,
        message: "Username must be at least 4 characters long",
      });
    }

    // Check for valid characters (letters, numbers, hyphens, underscores only)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(username.trim())) {
      return res.status(400).json({
        available: false,
        message:
          "Username can only contain letters, numbers, hyphens (-), and underscores (_)",
      });
    }

    const trimmedUsername = username.trim();

    // Check if username exists
    const existingUser = await User.findOne({ username: trimmedUsername });

    res.status(200).json({
      available: !existingUser,
      message: existingUser
        ? "Username is already taken"
        : "Username is available",
    });
  } catch (error) {
    console.error("Username check error:", error);
    res.status(500).json({
      available: false,
      message: "Error checking username availability",
    });
  }
});

// Update user profile - REQUIRES AUTH
router.patch("/profile", auth, async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.status(400).json({
        message: "Guest users cannot update their profile",
      });
    }

    const { username, avatar, privacySettings } = req.body;
    const updateData = {};

    // Validate and update username
    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length < 4) {
        return res.status(400).json({
          message: "Username must be at least 4 characters long",
        });
      }

      // Check for valid characters (letters, numbers, hyphens, underscores only)
      const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!validUsernameRegex.test(username.trim())) {
        return res.status(400).json({
          message:
            "Username can only contain letters, numbers, hyphens (-), and underscores (_)",
        });
      }

      // Check if username is already taken by another user
      const existingUser = await User.findOne({
        username: username.trim(),
        _id: { $ne: req.user.id },
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Username is already taken",
        });
      }

      updateData.username = username.trim();
    }

    // Validate and update avatar
    if (avatar !== undefined) {
      if (typeof avatar !== "string") {
        return res.status(400).json({
          message: "Avatar must be a valid URL",
        });
      }
      updateData.avatar = avatar;
    }

    // Validate and update privacy settings
    if (privacySettings !== undefined) {
      if (typeof privacySettings !== "object") {
        return res.status(400).json({
          message: "Privacy settings must be an object",
        });
      }

      const validPrivacySettings = {};

      if (privacySettings.showInLeaderboards !== undefined) {
        if (typeof privacySettings.showInLeaderboards !== "boolean") {
          return res.status(400).json({
            message: "showInLeaderboards must be a boolean",
          });
        }
        validPrivacySettings.showInLeaderboards =
          privacySettings.showInLeaderboards;
      }

      if (privacySettings.allowFriendRequests !== undefined) {
        if (typeof privacySettings.allowFriendRequests !== "boolean") {
          return res.status(400).json({
            message: "allowFriendRequests must be a boolean",
          });
        }
        validPrivacySettings.allowFriendRequests =
          privacySettings.allowFriendRequests;
      }

      if (privacySettings.showOnlineStatus !== undefined) {
        if (typeof privacySettings.showOnlineStatus !== "boolean") {
          return res.status(400).json({
            message: "showOnlineStatus must be a boolean",
          });
        }
        validPrivacySettings.showOnlineStatus =
          privacySettings.showOnlineStatus;
      }

      if (Object.keys(validPrivacySettings).length > 0) {
        updateData.privacySettings = validPrivacySettings;
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const userResponse = {
      id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      isGuest: false,
      isAdmin: updatedUser.isAdmin,
      stats: updatedUser.stats,
      achievements: updatedUser.achievements,
      privacySettings: updatedUser.privacySettings,
      createdAt: updatedUser.createdAt,
      lastActive: updatedUser.lastActive,
    };

    res.status(200).json({
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      message: "Failed to update profile",
    });
  }
});

module.exports = router;
