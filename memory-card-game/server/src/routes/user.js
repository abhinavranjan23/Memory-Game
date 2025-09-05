const express = require("express");
const { User } = require("../models/User.js");
const auth = require("../middleware/auth.js");

const router = express.Router();

// Get user's personal stats - REQUIRES AUTH
router.get("/stats", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("stats achievements");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      stats: {
        ...user.stats.toObject(),
        // Ensure memory meter fields are included
        bestMemoryMeter: user.stats.bestMemoryMeter || 0,
        averageMemoryMeter: user.stats.averageMemoryMeter || 0,
      },
      achievements: user.achievements,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ message: "Failed to fetch user statistics" });
  }
});

// Get public user profile by ID - NO AUTH REQUIRED
router.get("/:userId/profile", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select(
        "username avatar stats achievements createdAt isGuest privacySettings -_id"
      )
      .exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't show detailed stats for guest users for privacy
    if (user.isGuest) {
      return res
        .status(404)
        .json({ message: "Profile not available for guest users" });
    }

    // Check if user has privacy settings that hide their profile
    if (
      user.privacySettings &&
      user.privacySettings.showInLeaderboards === false
    ) {
      return res.status(404).json({ message: "Profile not available" });
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
          perfectGames: user.stats.perfectGames,
        },
        achievements: user.achievements.map((achievement) => ({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          iconUrl: achievement.iconUrl,
          unlockedAt: achievement.unlockedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

module.exports = router;
