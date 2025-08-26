const mongoose = require("mongoose");

const userStatsSchema = new mongoose.Schema({
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
  averageFlipTime: { type: Number, default: 0 },
  bestMatchStreak: { type: Number, default: 0 },
  perfectGames: { type: Number, default: 0 },
  powerUpsUsed: { type: Number, default: 0 },
});

const achievementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  iconUrl: { type: String, required: true },
  unlockedAt: { type: Date, required: true },
});

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, sparse: true, lowercase: true },
    password: { type: String, select: false }, // Password field with select: false for security
    googleId: { type: String, sparse: true },
    avatar: { type: String, default: null },
    isGuest: { type: Boolean, default: false },
    stats: {
      type: userStatsSchema,
      default: () => ({
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        totalScore: 0,
        bestScore: 0,
        averageFlipTime: 0,
        bestMatchStreak: 0,
        perfectGames: 0,
        powerUpsUsed: 0,
      }),
    },
    achievements: [achievementSchema],
    privacySettings: {
      showInLeaderboards: { type: Boolean, default: true },
      allowFriendRequests: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
    },
    isAdmin: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Update stats after each game
userSchema.methods.updateStats = function (gameResult) {
  this.stats.gamesPlayed += 1;
  if (gameResult.won) {
    this.stats.gamesWon += 1;
  }
  this.stats.winRate = (this.stats.gamesWon / this.stats.gamesPlayed) * 100;
  this.stats.totalScore += gameResult.score;

  // Update best score if current score is higher
  if (gameResult.score > this.stats.bestScore) {
    this.stats.bestScore = gameResult.score;
  }

  if (gameResult.flipTimes.length > 0) {
    const avgTime =
      gameResult.flipTimes.reduce((a, b) => a + b, 0) /
      gameResult.flipTimes.length;
    this.stats.averageFlipTime = (this.stats.averageFlipTime + avgTime) / 2;
  }

  if (gameResult.matchStreak > this.stats.bestMatchStreak) {
    this.stats.bestMatchStreak = gameResult.matchStreak;
  }

  if (gameResult.isPerfect) {
    this.stats.perfectGames += 1;
  }

  this.stats.powerUpsUsed += gameResult.powerUpsUsed;
  this.lastActive = new Date();
};

// Add achievement
userSchema.methods.addAchievement = function (achievement) {
  const exists = this.achievements.find((a) => a.id === achievement.id);
  if (!exists) {
    this.achievements.push({
      ...achievement,
      unlockedAt: new Date(),
    });
  }
};

module.exports = { User: mongoose.model("User", userSchema) };
