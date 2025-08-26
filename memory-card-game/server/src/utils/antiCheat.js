const crypto = require('crypto');

class AntiCheatSystem {
  constructor() {
    this.playerActions = new Map(); // userId -> action history
    this.gameStates = new Map(); // roomId -> game state hash
    this.suspiciousActivities = new Map(); // userId -> suspicious activity count
    this.blockedUsers = new Set(); // Set of blocked user IDs
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
    return crypto.createHash('sha256').update(stateString).digest('hex');
  }

  // Validate game state consistency
  validateGameState(roomId, gameState, userId) {
    const currentHash = this.generateGameStateHash(gameState);
    const storedHash = this.gameStates.get(roomId);

    if (storedHash && storedHash !== currentHash) {
      this.flagSuspiciousActivity(userId, 'game_state_mismatch');
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
      const interval = recentActions[i].timestamp - recentActions[i - 1].timestamp;
      timeIntervals.push(interval);
    }

    // Check for inhumanly fast actions (< 50ms)
    const tooFastActions = timeIntervals.filter(interval => interval < 50);
    if (tooFastActions.length > 3) {
      this.flagSuspiciousActivity(userId, 'too_fast_actions');
    }

    // Check for perfect timing patterns (bot-like behavior)
    const uniqueIntervals = new Set(timeIntervals);
    if (uniqueIntervals.size === 1 && timeIntervals.length > 5) {
      this.flagSuspiciousActivity(userId, 'perfect_timing_pattern');
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
        if (prevAction.action.type === 'flip_card' && currentAction.action.type === 'flip_card') {
          this.flagSuspiciousActivity(userId, 'impossible_card_flip_speed');
        }
      }
    }
  }

  // Flag suspicious activity
  flagSuspiciousActivity(userId, reason) {
    if (!this.suspiciousActivities.has(userId)) {
      this.suspiciousActivities.set(userId, { count: 0, reasons: [] });
    }

    const activity = this.suspiciousActivities.get(userId);
    activity.count++;
    activity.reasons.push({ reason, timestamp: Date.now() });

    console.warn(`🚨 Suspicious activity detected for user ${userId}: ${reason} (count: ${activity.count})`);

    // Block user if too many suspicious activities
    if (activity.count >= 5) {
      this.blockUser(userId, 'multiple_suspicious_activities');
    }
  }

  // Block user
  blockUser(userId, reason) {
    this.blockedUsers.add(userId);
    console.error(`🚫 User ${userId} blocked due to: ${reason}`);
  }

  // Check if user is blocked
  isUserBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  // Validate card flip action
  validateCardFlip(userId, cardId, gameState) {
    // Check if user is blocked
    if (this.isUserBlocked(userId)) {
      throw new Error('User is blocked due to suspicious activity');
    }

    // Check if card exists and can be flipped
    const card = gameState.board.find(c => c.id === cardId);
    if (!card) {
      this.flagSuspiciousActivity(userId, 'invalid_card_id');
      throw new Error('Invalid card ID');
    }

    if (card.isMatched || card.isFlipped) {
      this.flagSuspiciousActivity(userId, 'flipping_matched_or_flipped_card');
      throw new Error('Card cannot be flipped');
    }

    // Check if it's the user's turn
    const currentPlayer = gameState.players.find(p => p.isCurrentTurn);
    if (!currentPlayer || currentPlayer.userId !== userId) {
      this.flagSuspiciousActivity(userId, 'flipping_card_not_turn');
      throw new Error('Not your turn');
    }

    return true;
  }

  // Validate power-up usage
  validatePowerUpUsage(userId, powerUpType, gameState) {
    if (this.isUserBlocked(userId)) {
      throw new Error('User is blocked due to suspicious activity');
    }

    const player = gameState.players.find(p => p.userId === userId);
    if (!player) {
      this.flagSuspiciousActivity(userId, 'powerup_usage_by_nonexistent_player');
      throw new Error('Player not found');
    }

    // Check if player has the power-up
    const hasPowerUp = player.powerUps.some(p => p.type === powerUpType);
    if (!hasPowerUp) {
      this.flagSuspiciousActivity(userId, 'using_nonexistent_powerup');
      throw new Error('Power-up not available');
    }

    return true;
  }

  // Validate game completion
  validateGameCompletion(userId, gameState, matchedPairs) {
    if (this.isUserBlocked(userId)) {
      throw new Error('User is blocked due to suspicious activity');
    }

    const totalPairs = gameState.board.length / 2;
    const actualMatches = matchedPairs.length / 2;

    // Check if completion is legitimate
    if (actualMatches > totalPairs) {
      this.flagSuspiciousActivity(userId, 'impossible_game_completion');
      throw new Error('Invalid game completion');
    }

    return true;
  }

  // Get suspicious activity report
  getSuspiciousActivityReport() {
    const report = {
      totalSuspiciousUsers: this.suspiciousActivities.size,
      blockedUsers: this.blockedUsers.size,
      details: []
    };

    for (const [userId, activity] of this.suspiciousActivities) {
      report.details.push({
        userId,
        count: activity.count,
        reasons: activity.reasons,
        isBlocked: this.blockedUsers.has(userId)
      });
    }

    return report;
  }

  // Clean up old data
  cleanup() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Clean up old action records
    for (const [userId, actions] of this.playerActions) {
      const recentActions = actions.filter(action => action.timestamp > oneHourAgo);
      if (recentActions.length === 0) {
        this.playerActions.delete(userId);
      } else {
        this.playerActions.set(userId, recentActions);
      }
    }

    // Clean up old suspicious activity reasons
    for (const [userId, activity] of this.suspiciousActivities) {
      const recentReasons = activity.reasons.filter(reason => reason.timestamp > oneHourAgo);
      if (recentReasons.length === 0) {
        this.suspiciousActivities.delete(userId);
      } else {
        activity.reasons = recentReasons;
        activity.count = recentReasons.length;
      }
    }
  }
}

// Create singleton instance
const antiCheatSystem = new AntiCheatSystem();

// Cleanup every hour
setInterval(() => {
  antiCheatSystem.cleanup();
}, 60 * 60 * 1000);

module.exports = antiCheatSystem;
