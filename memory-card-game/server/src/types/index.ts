export interface User {
  _id: string;
  username: string;
  email?: string;
  googleId?: string;
  avatar?: string;
  isGuest: boolean;
  stats: UserStats;
  achievements: Achievement[];
  isAdmin: boolean;
  createdAt: Date;
  lastActive: Date;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  totalScore: number;
  averageFlipTime: number;
  bestMatchStreak: number;
  perfectGames: number;
  powerUpsUsed: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  unlockedAt: Date;
}

export interface Game {
  _id: string;
  roomId: string;
  players: Player[];
  gameState: GameState;
  settings: GameSettings;
  chat: ChatMessage[];
  createdAt: Date;
  endedAt?: Date;
  isPrivate: boolean;
  password?: string;
}

export interface Player {
  userId: string;
  username: string;
  avatar?: string;
  isReady: boolean;
  score: number;
  matches: number;
  flips: number;
  powerUps: PowerUp[];
  memoryMeter: number;
  isCurrentTurn: boolean;
  lastFlipTime?: Date;
  matchStreak: number;
}

export interface GameState {
  status: 'waiting' | 'starting' | 'playing' | 'paused' | 'finished';
  currentPlayerIndex: number;
  board: Card[];
  flippedCards: number[];
  matchedPairs: number[];
  timeLeft: number;
  gameMode: GameMode;
  round: number;
  lastActivity: Date;
  powerUpPool: PowerUp[];
}

export interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
  powerUp?: PowerUp;
  theme: string;
}

export interface PowerUp {
  type: 'extraTurn' | 'peek' | 'swap' | 'revealOne' | 'freeze' | 'shuffle';
  name: string;
  description: string;
  icon: string;
  duration?: number;
  uses: number;
}

export interface GameSettings {
  boardSize: 4 | 6 | 8;
  theme: string;
  gameMode: GameMode;
  timeLimit: number;
  maxPlayers: number;
  powerUpsEnabled: boolean;
  chatEnabled: boolean;
  isRanked: boolean;
}

export type GameMode = 'classic' | 'blitz' | 'sudden-death' | 'powerup-frenzy';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system' | 'admin';
}

export interface Room {
  id: string;
  name: string;
  game: Game;
  spectators: User[];
  isPrivate: boolean;
  password?: string;
  createdBy: string;
  maxPlayers: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  gamesWon: number;
  winRate: number;
  rank: number;
}

export interface MatchHistory {
  _id: string;
  gameId: string;
  players: {
    userId: string;
    username: string;
    score: number;
    isWinner: boolean;
  }[];
  gameMode: GameMode;
  duration: number;
  boardSize: number;
  createdAt: Date;
}

export interface ReportedUser {
  _id: string;
  reportedUserId: string;
  reportedByUserId: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface BlockedUser {
  _id: string;
  userId: string;
  blockedUserId: string;
  createdAt: Date;
}