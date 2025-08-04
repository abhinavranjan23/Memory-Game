import mongoose, { Schema, Document } from 'mongoose';
import { Game as IGame, Player, GameState, GameSettings, ChatMessage, Card, PowerUp } from '../types/index.js';

const powerUpSchema = new Schema<PowerUp>({
  type: { 
    type: String, 
    enum: ['extraTurn', 'peek', 'swap', 'revealOne', 'freeze', 'shuffle'],
    required: true 
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  duration: { type: Number },
  uses: { type: Number, default: 1 }
});

const cardSchema = new Schema<Card>({
  id: { type: Number, required: true },
  value: { type: String, required: true },
  isFlipped: { type: Boolean, default: false },
  isMatched: { type: Boolean, default: false },
  powerUp: { type: powerUpSchema, default: null },
  theme: { type: String, required: true }
});

const playerSchema = new Schema<Player>({
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
  matchStreak: { type: Number, default: 0 }
});

const gameStateSchema = new Schema<GameState>({
  status: { 
    type: String, 
    enum: ['waiting', 'starting', 'playing', 'paused', 'finished'],
    default: 'waiting'
  },
  currentPlayerIndex: { type: Number, default: 0 },
  board: [cardSchema],
  flippedCards: [{ type: Number }],
  matchedPairs: [{ type: Number }],
  timeLeft: { type: Number, default: 0 },
  gameMode: { 
    type: String, 
    enum: ['classic', 'blitz', 'sudden-death', 'powerup-frenzy'],
    default: 'classic'
  },
  round: { type: Number, default: 1 },
  lastActivity: { type: Date, default: Date.now },
  powerUpPool: [powerUpSchema]
});

const gameSettingsSchema = new Schema<GameSettings>({
  boardSize: { type: Number, enum: [4, 6, 8], default: 4 },
  theme: { type: String, default: 'emojis' },
  gameMode: { 
    type: String, 
    enum: ['classic', 'blitz', 'sudden-death', 'powerup-frenzy'],
    default: 'classic'
  },
  timeLimit: { type: Number, default: 300 }, // 5 minutes
  maxPlayers: { type: Number, default: 2, min: 2, max: 4 },
  powerUpsEnabled: { type: Boolean, default: true },
  chatEnabled: { type: Boolean, default: true },
  isRanked: { type: Boolean, default: true }
});

const chatMessageSchema = new Schema<ChatMessage>({
  id: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  message: { type: String, required: true, maxlength: 500 },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['user', 'system', 'admin'], default: 'user' }
});

const gameSchema = new Schema<IGame & Document>({
  roomId: { type: String, required: true, unique: true },
  players: [playerSchema],
  gameState: { type: gameStateSchema, default: () => ({}) },
  settings: { type: gameSettingsSchema, default: () => ({}) },
  chat: [chatMessageSchema],
  endedAt: { type: Date },
  isPrivate: { type: Boolean, default: false },
  password: { type: String }
}, {
  timestamps: true
});

// Game methods
gameSchema.methods.addPlayer = function(userId: string, username: string, avatar?: string) {
  if (this.players.length >= this.settings.maxPlayers) {
    throw new Error('Game is full');
  }
  
  const playerExists = this.players.find((p: Player) => p.userId === userId);
  if (playerExists) {
    throw new Error('Player already in game');
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
    matchStreak: 0
  });
};

gameSchema.methods.removePlayer = function(userId: string) {
  this.players = this.players.filter((p: Player) => p.userId !== userId);
  if (this.players.length === 0) {
    this.gameState.status = 'finished';
  }
};

gameSchema.methods.togglePlayerReady = function(userId: string) {
  const player = this.players.find((p: Player) => p.userId === userId);
  if (player) {
    player.isReady = !player.isReady;
  }
  
  // Check if all players are ready
  const allReady = this.players.every((p: Player) => p.isReady);
  if (allReady && this.players.length >= 2) {
    this.gameState.status = 'starting';
  }
};

gameSchema.methods.addChatMessage = function(userId: string, username: string, message: string, type: 'user' | 'system' | 'admin' = 'user') {
  this.chat.push({
    id: new mongoose.Types.ObjectId().toString(),
    userId,
    username,
    message,
    timestamp: new Date(),
    type
  });
  
  // Keep only last 100 messages
  if (this.chat.length > 100) {
    this.chat = this.chat.slice(-100);
  }
};

export const Game = mongoose.model<IGame & Document>('Game', gameSchema);