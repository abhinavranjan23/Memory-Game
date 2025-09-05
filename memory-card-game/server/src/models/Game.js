const mongoose = require("mongoose");

const powerUpSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["extraTurn", "peek", "swap", "revealOne", "freeze", "shuffle"],
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    duration: { type: Number },
    uses: { type: Number, default: 1 },
  },
  { optimisticConcurrency: false }
);

const cardSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  value: { type: String, required: true },
  isFlipped: { type: Boolean, default: false },
  isMatched: { type: Boolean, default: false },
  powerUp: { type: powerUpSchema, default: null },
  theme: { type: String, required: true },
  // Add animation and state fields used by frontend
  isSwapping: { type: Boolean, default: false },
  isShuffling: { type: Boolean, default: false },
  isRevealed: { type: Boolean, default: false },
  revealedValue: { type: String },
  lastSwapTime: { type: Date },
});

const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  avatar: { type: String },
  isReady: { type: Boolean, default: false },
  isHost: { type: Boolean, default: false }, // Add isHost field
  isGuest: { type: Boolean, default: false }, // Add isGuest field
  score: { type: Number, default: 0 },
  matches: { type: Number, default: 0 },
  flips: { type: Number, default: 0 },
  powerUps: [powerUpSchema],
  powerUpsCollected: [String],
  powerUpsUsed: { type: Number, default: 0 },
  memoryMeter: { type: Number, default: 0 },
  isCurrentTurn: { type: Boolean, default: false },
  lastFlipTime: { type: Date },
  matchStreak: { type: Number, default: 0 },
  extraTurns: { type: Number, default: 0 },
});

const gameStateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      "waiting",
      "starting",
      "playing",
      "paused",
      "finished",
      "sudden-death",
    ],
    default: "waiting",
    required: true,
  },
  currentPlayerIndex: { type: Number, default: 0 },
  currentTurn: { type: String }, // Add currentTurn field to schema
  board: [cardSchema],
  flippedCards: [{ type: Number }],
  matchedPairs: [{ type: Number }],
  timeLeft: { type: Number, default: 0 },
  gameMode: {
    type: String,
    enum: ["classic", "blitz", "sudden-death", "powerup-frenzy"],
    default: "classic",
  },
  round: { type: Number, default: 1 },
  lastActivity: { type: Date, default: Date.now },
  powerUpPool: [powerUpSchema],
  // Add winner field for tracking game winner
  winner: { type: String },
  // Add reason field for game completion reason
  completionReason: { type: String },
  // Add opponentsForHistory field to store opponent information for match history
  opponentsForHistory: [
    {
      userId: { type: String, required: true },
      username: { type: String, required: true },
      score: { type: Number, default: 0 },
      matches: { type: Number, default: 0 },
      leftEarly: { type: Boolean, default: false },
      disconnectedAt: { type: Date },
    },
  ],
});

const gameSettingsSchema = new mongoose.Schema({
  boardSize: {
    type: String,
    enum: ["4x4", "6x6", "8x8"],
    default: "4x4",
  },
  theme: { type: String, default: "emojis" },
  gameMode: {
    type: String,
    enum: ["classic", "blitz", "sudden-death", "powerup-frenzy"],
    default: "classic",
  },
  timeLimit: { type: Number, default: 300 }, // 5 minutes
  maxPlayers: { type: Number, default: 2, min: 2, max: 4 },
  powerUpsEnabled: { type: Boolean, default: true },
  chatEnabled: { type: Boolean, default: true },
  isRanked: { type: Boolean, default: true },
});

const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  message: { type: String, required: true, maxlength: 500 },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ["user", "system", "admin"], default: "user" },
});

const gameSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    hostId: { type: String }, // Add hostId field
    players: [playerSchema],
    gameState: { type: gameStateSchema, default: () => ({}) },
    settings: { type: gameSettingsSchema, default: () => ({}) },
    chat: [chatMessageSchema],
    startedAt: { type: Date },
    endedAt: { type: Date },
    status: {
      type: String,
      enum: [
        "waiting",
        "starting",
        "playing",
        "paused",
        "finished",
        "completed",
      ],
      default: "waiting",
      required: true,
    },
    isPrivate: { type: Boolean, default: false },
    password: { type: String },
  },
  {
    timestamps: true,
  }
);

// Game methods
gameSchema.methods.addPlayer = function (userId, username, avatar) {
  if (this.players.length >= this.settings.maxPlayers) {
    throw new Error("Game is full");
  }

  const playerExists = this.players.find((p) => p.userId === userId);
  if (playerExists) {
    throw new Error("Player already in game");
  }

  this.players.push({
    userId,
    username,
    avatar,
    isReady: false,
    score: 0,
    matches: 0,
    flips: 0,
    powerUps: [],
    memoryMeter: 0,
    isCurrentTurn: this.players.length === 0,
    matchStreak: 0,
    extraTurns: 0, // Initialize extra turns
  });
};

gameSchema.methods.removePlayer = function (userId, leftEarly = false) {
  const playerIndex = this.players.findIndex((p) => p.userId === userId);
  if (playerIndex === -1) {
    return false;
  }

  // ❌ DON'T REMOVE if game is already finished/completed
  if (
    this.gameState.status === "finished" ||
    this.status === "completed" ||
    this.endedAt
  ) {
    console.log(
      `⚠️ Cannot remove player ${userId} from finished game ${this.roomId}`
    );
    return false;
  }

  // Get the player data before removal
  const playerToRemove = this.players[playerIndex];

  // If leftEarly is true, move player to opponentsForHistory
  if (leftEarly) {
    // Ensure opponentsForHistory is initialized
    if (!this.opponentsForHistory) {
      this.opponentsForHistory = [];
    }

    this.opponentsForHistory.push({
      userId: playerToRemove.userId,
      username: playerToRemove.username,
      score: playerToRemove.score || 0,
      matches: playerToRemove.matches || 0,
      leftEarly: true,
      disconnectedAt: new Date(),
    });
    console.log(
      `Player ${playerToRemove.username} moved to opponentsForHistory with leftEarly: true`
    );
  }

  // ✅ Only remove from active games
  this.players.splice(playerIndex, 1);

  // 🔧 REMOVED: Don't automatically mark as completed when no players left
  // Let the calling code decide whether to delete or mark as completed

  // If the removed player was the current turn, switch to next player
  if (this.gameState.currentTurn === userId) {
    if (this.players.length > 0) {
      // Set turn to the first remaining player
      this.gameState.currentTurn = this.players[0].userId;
      this.gameState.currentPlayerIndex = 0;

      // Update isCurrentTurn flags
      this.players.forEach((player, index) => {
        player.isCurrentTurn = index === 0;
      });
    } else {
      // No players left, clear current turn
      this.gameState.currentTurn = null;
      this.gameState.currentPlayerIndex = 0;
    }
  } else {
    // Update currentPlayerIndex if needed
    if (this.gameState.currentPlayerIndex >= playerIndex) {
      this.gameState.currentPlayerIndex = Math.max(
        0,
        this.gameState.currentPlayerIndex - 1
      );
    }
  }

  // Update last activity
  this.gameState.lastActivity = new Date();
  this.updatedAt = new Date();

  return true;
};
gameSchema.methods.togglePlayerReady = function (userId) {
  const player = this.players.find((p) => p.userId === userId);
  if (player) {
    player.isReady = !player.isReady;
  }

  // Check if all players are ready
  const allReady = this.players.every((p) => p.isReady);
  if (allReady && this.players.length >= 2) {
    if (this.gameState.status === "waiting") {
      this.gameState.status = "starting";
      this.status = "starting"; // Synchronize main game status
    }
  }
  this.gameState.lastActivity = new Date();
  this.updatedAt = new Date(); // Update the main updatedAt field
};

gameSchema.methods.addChatMessage = function (
  userId,
  username,
  message,
  type = "user"
) {
  this.chat.push({
    id: new mongoose.Types.ObjectId().toString(),
    userId,
    username,
    message,
    timestamp: new Date(),
    type,
  });

  // Keep only last 100 messages
  if (this.chat.length > 100) {
    this.chat = this.chat.slice(-100);
  }
};

// Add database indexes for better query performance
gameSchema.index({ "gameState.status": 1, updatedAt: -1 });
gameSchema.index({ status: 1, updatedAt: -1 });
gameSchema.index({ "players.userId": 1 });
gameSchema.index({ roomId: 1 });
gameSchema.index({ endedAt: -1 });
gameSchema.index({ createdAt: -1 });
gameSchema.index({ "settings.gameMode": 1 });
gameSchema.index({ isPrivate: 1 });
gameSchema.index({ "gameState.status": 1, "players.0": { $exists: false } }); // For empty player arrays
gameSchema.index({ "gameState.status": 1, players: { $size: 0 } }); // For empty player arrays

module.exports = { Game: mongoose.model("Game", gameSchema) };
