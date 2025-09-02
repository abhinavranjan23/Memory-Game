const mongoose = require("mongoose");

const blockedUserSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    blockedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    suspiciousActivityCount: {
      type: Number,
      required: true,
      min: 0,
    },
    suspiciousActivities: [
      {
        reason: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        gameId: { type: String },
        roomId: { type: String },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    adminUnblocked: {
      type: Boolean,
      default: false,
    },
    unblockedAt: {
      type: Date,
    },
    unblockedBy: {
      type: String,
    },
    unblockReason: {
      type: String,
    },
    // For tracking if user was blocked multiple times
    blockHistory: [
      {
        blockedAt: { type: Date, default: Date.now },
        reason: { type: String, required: true },
        suspiciousActivityCount: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
blockedUserSchema.index({ userId: 1, isActive: 1 });
blockedUserSchema.index({ blockedAt: -1 });
blockedUserSchema.index({ reason: 1 });

// Static method to check if user is blocked
blockedUserSchema.statics.isUserBlocked = async function (userId) {
  const blockedUser = await this.findOne({
    userId,
    isActive: true,
  });
  return !!blockedUser;
};

// Static method to get blocked user details
blockedUserSchema.statics.getBlockedUser = async function (userId) {
  return await this.findOne({ userId });
};

// Static method to block a user
blockedUserSchema.statics.blockUser = async function (userData) {
  const {
    userId,
    username,
    email,
    reason,
    suspiciousActivityCount,
    suspiciousActivities,
  } = userData;

  // Check if user is already blocked
  let blockedUser = await this.findOne({ userId });

  if (blockedUser) {
    // Update existing blocked user
    blockedUser.isActive = true;
    blockedUser.reason = reason;
    blockedUser.suspiciousActivityCount = suspiciousActivityCount;
    blockedUser.suspiciousActivities = suspiciousActivities;
    blockedUser.blockedAt = new Date();
    blockedUser.adminUnblocked = false;
    blockedUser.unblockedAt = null;
    blockedUser.unblockedBy = null;
    blockedUser.unblockReason = null;

    // Add to block history
    blockedUser.blockHistory.push({
      blockedAt: new Date(),
      reason,
      suspiciousActivityCount,
    });

    await blockedUser.save();
    return blockedUser;
  } else {
    // Create new blocked user
    blockedUser = new this({
      userId,
      username,
      email,
      reason,
      suspiciousActivityCount,
      suspiciousActivities,
      blockHistory: [
        {
          blockedAt: new Date(),
          reason,
          suspiciousActivityCount,
        },
      ],
    });

    await blockedUser.save();
    return blockedUser;
  }
};

// Static method to unblock a user
blockedUserSchema.statics.unblockUser = async function (
  userId,
  adminUserId,
  reason
) {
  const blockedUser = await this.findOne({ userId, isActive: true });

  if (!blockedUser) {
    throw new Error("User is not currently blocked");
  }

  blockedUser.isActive = false;
  blockedUser.adminUnblocked = true;
  blockedUser.unblockedAt = new Date();
  blockedUser.unblockedBy = adminUserId;
  blockedUser.unblockReason = reason;

  await blockedUser.save();
  return blockedUser;
};

// Static method to get all active blocked users
blockedUserSchema.statics.getActiveBlockedUsers = async function () {
  return await this.find({ isActive: true }).sort({ blockedAt: -1 });
};

// Static method to get blocking statistics
blockedUserSchema.statics.getBlockingStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalBlocked: { $sum: 1 },
        activeBlocked: { $sum: { $cond: ["$isActive", 1, 0] } },
        totalUnblocked: { $sum: { $cond: ["$adminUnblocked", 1, 0] } },
      },
    },
  ]);

  return stats[0] || { totalBlocked: 0, activeBlocked: 0, totalUnblocked: 0 };
};

module.exports = mongoose.model("BlockedUser", blockedUserSchema);
