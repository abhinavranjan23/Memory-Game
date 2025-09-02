const crypto = require("crypto");
const BlockedUser = require("../models/BlockedUserSchema.js");

class AntiCheatSystem {
  constructor() {
    this.playerActions = new Map(); // userId -> action history
    this.gameStates = new Map(); // roomId -> game state hash
    this.suspiciousActivities = new Map(); // userId -> suspicious activity count
    this.blockedUsers = new Set(); // Cache of blocked user IDs for performance
    this.initialized = false;

    // Initialize blocked users cache from database
    this.initializeBlockedUsersCache();
  }

  // Initialize blocked users cache from database
  async initializeBlockedUsersCache() {
    try {
      const activeBlockedUsers = await BlockedUser.getActiveBlockedUsers();

      // Clear existing cache
      this.blockedUsers.clear();

      // Populate cache with active blocked users
      activeBlockedUsers.forEach((user) => {
        this.blockedUsers.add(user.userId);
      });

      console.log(
        `✅ Anti-cheat system initialized with ${this.blockedUsers.size} blocked users`
      );
      this.initialized = true;
    } catch (error) {
      console.error(
        "❌ Failed to initialize anti-cheat blocked users cache:",
        error
      );
      this.initialized = false;
    }
  }

  // Refresh blocked users cache (call this periodically or when needed)
  async refreshBlockedUsersCache() {
    try {
      await this.initializeBlockedUsersCache();
    } catch (error) {
      console.error("❌ Failed to refresh blocked users cache:", error);
    }
  }

  // Generate hash for game state validation
  generateGameStateHash(gameState) {
    const stateString = JSON.stringify({
      board: gameState.board,
      matchedPairs: gameState.matchedPairs,
      currentPlayerIndex: gameState.currentPlayerIndex,
      timeLeft: gameState.timeLeft,
      status: gameState.status,
    });
    return crypto.createHash("sha256").update(stateString).digest("hex");
  }

  // Validate game state consistency
  validateGameState(roomId, gameState, userId) {
    const currentHash = this.generateGameStateHash(gameState);
    const storedHash = this.gameStates.get(roomId);

    if (storedHash && storedHash !== currentHash) {
      this.flagSuspiciousActivity(userId, "game_state_mismatch");
      return false;
    }

    this.gameStates.set(roomId, currentHash);
    return true;
  }

  // Track player actions for pattern analysis
  trackAction(userId, action, gameState) {
    if (!this.playerActions.has(userId)) {
      this.playerActions.set(userId, []);
    }

    const actions = this.playerActions.get(userId);
    const actionRecord = {
      action,
      timestamp: Date.now(),
      gameState: this.generateGameStateHash(gameState),
    };

    actions.push(actionRecord);

    // Keep only last 100 actions
    if (actions.length > 100) {
      actions.shift();
    }

    // Analyze for suspicious patterns
    this.analyzePlayerActions(userId, actions);
  }

  // Analyze player actions for suspicious patterns
  analyzePlayerActions(userId, actions) {
    if (actions.length < 5) return;

    const recentActions = actions.slice(-10);
    const timeIntervals = [];

    // Calculate time intervals between actions
    for (let i = 1; i < recentActions.length; i++) {
      const interval =
        recentActions[i].timestamp - recentActions[i - 1].timestamp;
      timeIntervals.push(interval);
    }

    // Check for inhumanly fast actions (< 50ms)
    const tooFastActions = timeIntervals.filter((interval) => interval < 50);
    if (tooFastActions.length > 3) {
      this.flagSuspiciousActivity(userId, "too_fast_actions");
    }

    // Check for perfect timing patterns (bot-like behavior)
    const uniqueIntervals = new Set(timeIntervals);
    if (uniqueIntervals.size === 1 && timeIntervals.length > 5) {
      this.flagSuspiciousActivity(userId, "perfect_timing_pattern");
    }

    // Check for impossible game state transitions
    this.checkImpossibleTransitions(userId, recentActions);
  }

  // Check for impossible game state transitions
  checkImpossibleTransitions(userId, actions) {
    for (let i = 1; i < actions.length; i++) {
      const prevAction = actions[i - 1];
      const currentAction = actions[i];

      // Check if game state changed impossibly fast
      if (currentAction.timestamp - prevAction.timestamp < 100) {
        if (
          prevAction.action.type === "flip_card" &&
          currentAction.action.type === "flip_card"
        ) {
          this.flagSuspiciousActivity(userId, "impossible_card_flip_speed");
        }
      }
    }
  }

  // Flag suspicious activity - now persistent
  async flagSuspiciousActivity(userId, reason, gameId = null, roomId = null) {
    if (!this.suspiciousActivities.has(userId)) {
      this.suspiciousActivities.set(userId, { count: 0, reasons: [] });
    }

    const activity = this.suspiciousActivities.get(userId);
    activity.count++;

    const activityRecord = {
      reason,
      timestamp: new Date(),
      gameId,
      roomId,
    };

    activity.reasons.push(activityRecord);

    console.warn(
      `🚨 Suspicious activity detected for user ${userId}: ${reason} (count: ${activity.count})`
    );

    // Block user if too many suspicious activities
    if (activity.count >= 5) {
      await this.blockUser(userId, "multiple_suspicious_activities", activity);
    }
  }

  // Block user - now persistent with database
  async blockUser(userId, reason, suspiciousActivities = null) {
    try {
      // Get user details (you might need to fetch this from User model)
      const userDetails = {
        userId,
        username: `User_${userId}`, // You might want to fetch actual username
        reason,
        suspiciousActivityCount: suspiciousActivities
          ? suspiciousActivities.count
          : 0,
        suspiciousActivities: suspiciousActivities
          ? suspiciousActivities.reasons
          : [],
      };

      // Save to database
      const blockedUser = await BlockedUser.blockUser(userDetails);

      // Update in-memory cache
      this.blockedUsers.add(userId);

      console.error(`🚫 User ${userId} blocked due to: ${reason}`);
      console.log(
        `�� Blocked user saved to database with ID: ${blockedUser._id}`
      );

      return blockedUser;
    } catch (error) {
      console.error(`❌ Failed to block user ${userId}:`, error);
      // Fallback to in-memory blocking if database fails
      this.blockedUsers.add(userId);
      throw error;
    }
  }

  // Check if user is blocked - check both cache and database
  async isUserBlocked(userId) {
    // First check in-memory cache (fast)
    if (!this.initialized) {
      console.warn(
        `⚠️ Anti-cheat system not initialized, allowing user ${userId}`
      );
      return false;
    }
    if (this.blockedUsers.has(userId)) {
      return true;
    }

    // If not in cache, check database (slower but accurate)
    try {
      const isBlocked = await BlockedUser.isUserBlocked(userId);

      // Update cache if user is blocked
      if (isBlocked) {
        this.blockedUsers.add(userId);
      }

      return isBlocked;
    } catch (error) {
      console.error(`❌ Error checking if user ${userId} is blocked:`, error);
      // Fallback to cache check
      return this.blockedUsers.has(userId);
    }
  }

  // Unblock a user - now persistent with database
  async unblockUser(userId, adminUserId, reason) {
    try {
      // Remove from database
      const unblockedUser = await BlockedUser.unblockUser(
        userId,
        adminUserId,
        reason
      );

      // Remove from in-memory cache
      this.blockedUsers.delete(userId);

      console.log(`✅ User ${userId} unblocked by administrator`);
      return unblockedUser;
    } catch (error) {
      console.error(`❌ Failed to unblock user ${userId}:`, error);
      throw error;
    }
  }

  // Debug function to help identify gameState issues
  debugGameState(gameState, userId, action) {
    console.log(`🔍 Anti-cheat debug for user ${userId} during ${action}:`);
    console.log("GameState exists:", !!gameState);
    if (gameState) {
      console.log("GameState keys:", Object.keys(gameState));
      console.log("Board exists:", !!gameState.board);
      console.log("Board is array:", Array.isArray(gameState.board));
      console.log("Board length:", gameState.board?.length);
      console.log("Players exists:", !!gameState.players);
      console.log("Players is array:", Array.isArray(gameState.players));
      console.log("Players length:", gameState.players?.length);
    }
  }

  // Validate card flip action
  async validateCardFlip(userId, cardId, gameState) {
    // Check if user is blocked
    if (await this.isUserBlocked(userId)) {
      throw new Error("User is blocked due to suspicious activity");
    }

    // Validate gameState structure
    if (!gameState) {
      console.warn("Anti-cheat: gameState is undefined");
      throw new Error("Game state is not available");
    }

    if (!gameState.board || !Array.isArray(gameState.board)) {
      console.warn("Anti-cheat: gameState.board is not a valid array");
      throw new Error("Game board is not available");
    }

    if (!gameState.players || !Array.isArray(gameState.players)) {
      console.warn("Anti-cheat: gameState.players is not a valid array");
      throw new Error("Game players are not available");
    }

    // Check if card exists
    const card = gameState.board.find((c) => c && c.id === cardId);
    if (!card) {
      await this.flagSuspiciousActivity(userId, "invalid_card_id");
      throw new Error("Invalid card ID");
    }

    // 🔧 BUG FIX: Check card state using the correct structure
    // Check if card is already flipped (in flippedCards array)
    if (gameState.flippedCards && gameState.flippedCards.includes(cardId)) {
      console.log(`Card ${cardId} is already flipped`);
      return false; // Don't flag as suspicious, just return false
    }

    // Check if card is already matched (in matchedPairs array)
    if (gameState.matchedPairs && gameState.matchedPairs.includes(cardId)) {
      await this.flagSuspiciousActivity(userId, "flipping_matched_card");
      throw new Error("Card is already matched");
    }

    // 🔧 BUG FIX: Check turn using the correct structure
    // Check if it's the user's turn using currentTurn string
    if (gameState.currentTurn !== userId) {
      await this.flagSuspiciousActivity(userId, "flipping_card_not_turn");
      throw new Error("Not your turn");
    }

    // Check if game is in playing state
    if (gameState.status !== "playing" && gameState.status !== "sudden-death") {
      await this.flagSuspiciousActivity(
        userId,
        "flipping_card_wrong_game_state"
      );
      throw new Error("Game is not in playing state");
    }

    return true;
  }

  // Validate power-up usage
  // Validate power-up usage
  async validatePowerUpUsage(userId, powerUpType, gameState) {
    if (await this.isUserBlocked(userId)) {
      throw new Error("User is blocked due to suspicious activity");
    }

    // Validate gameState structure
    if (!gameState) {
      console.warn("Anti-cheat: gameState is undefined");
      throw new Error("Game state is not available");
    }

    // 🔧 BUG FIX: Check powerUpPool in gameState, not player.powerUps
    if (!gameState.powerUpPool || !Array.isArray(gameState.powerUpPool)) {
      console.warn("Anti-cheat: gameState.powerUpPool is not available");
      throw new Error("Power-up pool not available");
    }

    // Check if power-up exists in the game's power-up pool
    const availablePowerUp = gameState.powerUpPool.find(
      (p) => p && p.type === powerUpType
    );

    if (!availablePowerUp) {
      console.warn(`Anti-cheat: Power-up ${powerUpType} not in game pool`);
      throw new Error("Power-up not available in this game");
    }

    // Check if user has the power-up (they might collect it during gameplay)
    const currentPlayer = gameState.players.find(
      (p) => p && p.userId === userId
    );

    if (!currentPlayer) {
      await this.flagSuspiciousActivity(userId, "user_not_found_in_game");
      throw new Error("User not found in game");
    }

    // 🔧 BUG FIX: Check if player has collected this power-up
    // Power-ups are collected during gameplay, not given at start
    const playerPowerUp = currentPlayer.powerUps?.find(
      (p) => p && p.type === powerUpType
    );

    if (!playerPowerUp) {
      // This is normal - player hasn't collected this power-up yet
      console.log(
        `Player ${userId} hasn't collected power-up ${powerUpType} yet`
      );
      throw new Error("Power-up not collected yet");
    }

    // Check if power-up has uses remaining
    if (playerPowerUp.uses !== undefined && playerPowerUp.uses <= 0) {
      await this.flagSuspiciousActivity(userId, "using_exhausted_powerup");
      throw new Error("Power-up has no uses remaining");
    }

    return true;
  }

  // Validate game action timing
  validateActionTiming(userId, actionType, lastActionTime) {
    const now = Date.now();
    const timeSinceLastAction = now - lastActionTime;

    // Minimum time between actions (100ms)
    if (timeSinceLastAction < 100) {
      this.flagSuspiciousActivity(userId, "action_spam");
      return false;
    }

    return true;
  }

  // Get comprehensive suspicious activity report
  async getSuspiciousActivityReport() {
    try {
      const report = {
        totalSuspiciousUsers: this.suspiciousActivities.size,
        blockedUsers: this.blockedUsers.size,
        details: [],
      };

      // Get in-memory suspicious activities
      for (const [userId, activity] of this.suspiciousActivities) {
        const isBlocked = this.blockedUsers.has(userId);

        report.details.push({
          userId,
          count: activity.count,
          reasons: activity.reasons,
          isBlocked,
          lastActivity:
            activity.reasons[activity.reasons.length - 1]?.timestamp,
        });
      }

      // Get database blocking statistics
      const dbStats = await BlockedUser.getBlockingStats();

      return {
        ...report,
        databaseStats: dbStats,
        cacheStats: {
          blockedUsersInCache: this.blockedUsers.size,
          suspiciousActivitiesInCache: this.suspiciousActivities.size,
        },
      };
    } catch (error) {
      console.error("❌ Error generating suspicious activity report:", error);
      // Fallback to in-memory report
      return {
        totalSuspiciousUsers: this.suspiciousActivities.size,
        blockedUsers: this.blockedUsers.size,
        details: Array.from(this.suspiciousActivities.entries()).map(
          ([userId, activity]) => ({
            userId,
            count: activity.count,
            reasons: activity.reasons,
            isBlocked: this.blockedUsers.has(userId),
          })
        ),
      };
    }
  }

  // Cleanup old data to prevent memory leaks
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean up old player actions (older than 1 hour)
    for (const [userId, actions] of this.playerActions) {
      const recentActions = actions.filter(
        (action) => now - action.timestamp < oneHourAgo
      );
      if (recentActions.length === 0) {
        this.playerActions.delete(userId);
      } else {
        this.playerActions.set(userId, recentActions);
      }
    }

    // Clean up old game states (older than 1 hour)
    for (const [roomId, hash] of this.gameStates) {
      // Note: gameStates doesn't have timestamps, so we'll keep them for now
      // You might want to add timestamps to gameStates if you need cleanup
    }

    console.log("�� Anti-cheat cleanup completed");
  }
}

// Create singleton instance
const antiCheatSystem = new AntiCheatSystem();

// Cleanup every hour
setInterval(() => {
  antiCheatSystem.cleanup();
}, 60 * 60 * 1000);

// Refresh blocked users cache every 10 minutes
setInterval(() => {
  antiCheatSystem.refreshBlockedUsersCache();
}, 10 * 60 * 1000);

module.exports = antiCheatSystem;
