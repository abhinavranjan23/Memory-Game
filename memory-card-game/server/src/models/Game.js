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
});

const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  avatar: { type: String },
  isReady: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  matches: { type: Number, default: 0 },
  flips: { type: Number, default: 0 },
  powerUps: [powerUpSchema],
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
  });
};

gameSchema.methods.removePlayer = function (userId) {
  this.players = this.players.filter((p) => p.userId !== userId);
  if (this.players.length === 0) {
    this.gameState.status = "finished";
    this.status = "completed";
  }
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

module.exports = { Game: mongoose.model("Game", gameSchema) };
