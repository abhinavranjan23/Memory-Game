import { Card, PowerUp, GameMode } from '../types/index.js';

// Game themes with their card values
export const THEMES = {
  emojis: [
    '🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎪', '🎊',
    '🚀', '⭐', '🌟', '💫', '🔥', '⚡', '💎', '🏆',
    '🦄', '🐲', '🦋', '🌈', '🍕', '🍔', '🍰', '🎂',
    '🏀', '⚽', '🎾', '🏈', '🎱', '🏸', '🏓', '🎳'
  ],
  animals: [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
    '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
    '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
  ],
  techLogos: [
    '⚛️', '🅰️', '🔷', '📱', '💻', '⌨️', '🖥️', '🖨️',
    '📡', '🔌', '🔋', '📷', '📹', '📞', '☎️', '📠',
    '💾', '💿', '📀', '🎮', '🕹️', '📱', '⌚', '💻',
    '🖥️', '⌨️', '🖱️', '🖨️', '📷', '📹', '🔍', '💡'
  ],
  food: [
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
    '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅',
    '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽',
    '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞'
  ]
};

// Power-ups definitions
export const POWER_UPS: { [key: string]: Omit<PowerUp, 'uses'> } = {
  extraTurn: {
    type: 'extraTurn',
    name: 'Extra Turn',
    description: 'Get another turn even if you miss',
    icon: '🔄'
  },
  peek: {
    type: 'peek',
    name: 'Peek',
    description: 'Briefly see all unmatched cards',
    icon: '👁️',
    duration: 3000
  },
  swap: {
    type: 'swap',
    name: 'Card Swap',
    description: 'Swap positions of two cards',
    icon: '🔀'
  },
  revealOne: {
    type: 'revealOne',
    name: 'Reveal One',
    description: 'Permanently reveal one card',
    icon: '💡'
  },
  freeze: {
    type: 'freeze',
    name: 'Time Freeze',
    description: 'Freeze the timer for 10 seconds',
    icon: '❄️',
    duration: 10000
  },
  shuffle: {
    type: 'shuffle',
    name: 'Shuffle Cards',
    description: 'Shuffle all unmatched cards',
    icon: '🌀'
  }
};

// Generate a game board
export function generateBoard(
  boardSize: 4 | 6 | 8, 
  theme: string = 'emojis',
  powerUpsEnabled: boolean = true
): Card[] {
  const totalCards = boardSize * boardSize;
  const pairsNeeded = totalCards / 2;
  
  const themeCards = THEMES[theme as keyof typeof THEMES] || THEMES.emojis;
  
  // Select cards for this game
  const selectedValues = themeCards.slice(0, pairsNeeded);
  
  // Create pairs
  const cardValues = [...selectedValues, ...selectedValues];
  
  // Shuffle the array
  const shuffledValues = shuffleArray(cardValues);
  
  // Create card objects
  const cards: Card[] = shuffledValues.map((value, index) => ({
    id: index,
    value,
    isFlipped: false,
    isMatched: false,
    theme,
    powerUp: powerUpsEnabled && Math.random() < 0.15 ? getRandomPowerUp() : undefined
  }));
  
  return cards;
}

// Fisher-Yates shuffle algorithm
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get a random power-up
export function getRandomPowerUp(): PowerUp {
  const powerUpKeys = Object.keys(POWER_UPS);
  const randomKey = powerUpKeys[Math.floor(Math.random() * powerUpKeys.length)];
  return {
    ...POWER_UPS[randomKey],
    uses: 1
  };
}

// Check if two cards match
export function cardsMatch(card1: Card, card2: Card): boolean {
  return card1.value === card2.value && card1.id !== card2.id;
}

// Calculate score based on game mode and performance
export function calculateScore(
  gameMode: GameMode,
  matches: number,
  flips: number,
  timeBonus: number,
  matchStreak: number,
  powerUpsUsed: number
): number {
  let baseScore = matches * 100;
  
  // Efficiency bonus (fewer flips = higher score)
  const efficiency = Math.max(0, (matches * 2 - flips) / (matches * 2));
  const efficiencyBonus = Math.floor(efficiency * 200);
  
  // Streak bonus
  const streakBonus = matchStreak > 1 ? (matchStreak - 1) * 50 : 0;
  
  // Time bonus varies by game mode
  let timeBonusMultiplier = 1;
  if (gameMode === 'blitz') {
    timeBonusMultiplier = 2;
  } else if (gameMode === 'sudden-death') {
    timeBonusMultiplier = 1.5;
  }
  
  const adjustedTimeBonus = Math.floor(timeBonus * timeBonusMultiplier);
  
  // Power-up penalty (using power-ups reduces score slightly)
  const powerUpPenalty = powerUpsUsed * 25;
  
  const totalScore = Math.max(0, 
    baseScore + 
    efficiencyBonus + 
    streakBonus + 
    adjustedTimeBonus - 
    powerUpPenalty
  );
  
  return totalScore;
}

// Get time limit based on game mode and board size
export function getTimeLimit(gameMode: GameMode, boardSize: number): number {
  const baseTimes = {
    4: 180,  // 3 minutes for 4x4
    6: 300,  // 5 minutes for 6x6
    8: 420   // 7 minutes for 8x8
  };
  
  let timeLimit = baseTimes[boardSize as keyof typeof baseTimes];
  
  switch (gameMode) {
    case 'blitz':
      timeLimit = 60; // 1 minute for all sizes in blitz
      break;
    case 'sudden-death':
      timeLimit = Math.floor(timeLimit * 0.7); // 30% less time
      break;
    case 'powerup-frenzy':
      timeLimit = Math.floor(timeLimit * 1.2); // 20% more time
      break;
  }
  
  return timeLimit;
}

// Check if game should trigger sudden death mode
export function shouldTriggerSuddenDeath(players: any[], timeLeft: number): boolean {
  if (timeLeft > 0) return false;
  
  // Check for tie in scores
  const scores = players.map(p => p.score);
  const maxScore = Math.max(...scores);
  const playersWithMaxScore = scores.filter(score => score === maxScore);
  
  return playersWithMaxScore.length > 1;
}

// Generate cards for sudden death (single pair)
export function generateSuddenDeathCards(theme: string = 'emojis'): Card[] {
  const themeCards = THEMES[theme as keyof typeof THEMES] || THEMES.emojis;
  const randomValue = themeCards[Math.floor(Math.random() * themeCards.length)];
  
  return [
    { id: 0, value: randomValue, isFlipped: false, isMatched: false, theme },
    { id: 1, value: randomValue, isFlipped: false, isMatched: false, theme }
  ].sort(() => Math.random() - 0.5); // Shuffle the two cards
}

// Memory meter calculation
export function calculateMemoryMeter(
  flips: number,
  matches: number,
  averageFlipTime: number,
  matchStreak: number
): number {
  const efficiency = matches > 0 ? (matches * 2) / flips : 0;
  const speedBonus = averageFlipTime < 2000 ? 1.2 : averageFlipTime < 4000 ? 1.0 : 0.8;
  const streakBonus = Math.min(matchStreak * 0.1, 0.5);
  
  const memoryScore = (efficiency * speedBonus + streakBonus) * 100;
  return Math.min(Math.max(memoryScore, 0), 100);
}

// Check for achievements
export function checkAchievements(gameResult: {
  won: boolean;
  score: number;
  flips: number;
  matches: number;
  gameMode: GameMode;
  boardSize: number;
  timeLeft: number;
  matchStreak: number;
  powerUpsUsed: number;
  isPerfect: boolean;
}, userStats: any): string[] {
  const newAchievements: string[] = [];
  
  // First Win
  if (gameResult.won && userStats.gamesWon === 0) {
    newAchievements.push('first-win');
  }
  
  // Perfect Memory (no wrong flips)
  if (gameResult.isPerfect) {
    newAchievements.push('perfect-memory');
  }
  
  // Speed Demon (won blitz mode)
  if (gameResult.won && gameResult.gameMode === 'blitz') {
    newAchievements.push('speed-demon');
  }
  
  // Memory Master (5+ match streak)
  if (gameResult.matchStreak >= 5) {
    newAchievements.push('memory-master');
  }
  
  // Power Player (won using 3+ power-ups)
  if (gameResult.won && gameResult.powerUpsUsed >= 3) {
    newAchievements.push('power-player');
  }
  
  // Grandmaster (won 8x8 board)
  if (gameResult.won && gameResult.boardSize === 8) {
    newAchievements.push('grandmaster');
  }
  
  return newAchievements;
}