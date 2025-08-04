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
  tech: [
    '⚛️', '🅰️', '🔷', '📱', '💻', '⌨️', '🖥️', '🖨️',
    '📡', '🔌', '🔋', '📷', '📹', '📞', '☎️', '📠',
    '💾', '💿', '📀', '🎮', '🕹️', '📱', '⌚', '💻',
    '🖥️', '⌨️', '🖱️', '🖨️', '📷', '📹', '🔍', '💡'
  ],
  nature: [
    '🌲', '🌳', '🌴', '🌵', '🌶️', '🌷', '🌸', '🌺',
    '🌻', '🌼', '🌽', '🍀', '🍁', '🍂', '🍃', '🌿',
    '☘️', '🌱', '🌾', '💐', '🌙', '☀️', '⭐', '🌟',
    '💫', '⚡', '☄️', '🌈', '☔', '❄️', '🔥', '💧'
  ],
  food: [
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
    '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅',
    '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽',
    '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞'
  ]
};

// Power-up definitions
export const POWER_UPS = [
  {
    type: 'extraTurn',
    name: 'Extra Turn',
    description: 'Get an additional turn after a miss',
    icon: '🔄',
    uses: 1,
    rarity: 0.1
  },
  {
    type: 'peek',
    name: 'Peek',
    description: 'Reveal all cards for 3 seconds',
    icon: '👁️',
    uses: 1,
    rarity: 0.08
  },
  {
    type: 'swap',
    name: 'Swap',
    description: 'Swap the positions of two cards',
    icon: '🔀',
    uses: 1,
    rarity: 0.06
  },
  {
    type: 'revealOne',
    name: 'Reveal One',
    description: 'Permanently reveal one card',
    icon: '💡',
    uses: 1,
    rarity: 0.05
  },
  {
    type: 'freeze',
    name: 'Freeze Timer',
    description: 'Freeze the timer for 10 seconds',
    icon: '❄️',
    duration: 10000,
    uses: 1,
    rarity: 0.04
  },
  {
    type: 'shuffle',
    name: 'Shuffle',
    description: 'Shuffle all unmatched cards',
    icon: '🔀',
    uses: 1,
    rarity: 0.03
  }
];

// Generate game board
export function generateBoard(boardSize, theme = 'emojis', powerUpsEnabled = true) {
  const totalCards = boardSize * boardSize;
  const pairs = totalCards / 2;
  
  if (!THEMES[theme]) {
    theme = 'emojis';
  }
  
  const themeCards = THEMES[theme];
  if (themeCards.length < pairs) {
    throw new Error(`Theme ${theme} doesn't have enough cards for ${boardSize}x${boardSize} board`);
  }
  
  // Select random cards for this game
  const selectedCards = shuffleArray(themeCards).slice(0, pairs);
  
  // Create pairs
  const cardPairs = [];
  selectedCards.forEach((card, index) => {
    cardPairs.push(
      { id: index * 2, value: card, theme, isFlipped: false, isMatched: false },
      { id: index * 2 + 1, value: card, theme, isFlipped: false, isMatched: false }
    );
  });
  
  // Add power-ups to random cards
  if (powerUpsEnabled) {
    const powerUpCount = Math.floor(pairs * 0.15); // 15% of pairs get power-ups
    const powerUpCards = shuffleArray(cardPairs).slice(0, powerUpCount);
    
    powerUpCards.forEach(card => {
      const randomPowerUp = getRandomPowerUp();
      if (randomPowerUp) {
        card.powerUp = randomPowerUp;
      }
    });
  }
  
  // Shuffle the final board
  return shuffleArray(cardPairs);
}

// Get random power-up based on rarity
export function getRandomPowerUp() {
  const roll = Math.random();
  let cumulativeRarity = 0;
  
  for (const powerUp of POWER_UPS) {
    cumulativeRarity += powerUp.rarity;
    if (roll <= cumulativeRarity) {
      return { ...powerUp };
    }
  }
  
  return null;
}

// Check if two cards match
export function cardsMatch(card1, card2) {
  return card1.value === card2.value && card1.theme === card2.theme;
}

// Calculate score based on game mode and performance
export function calculateScore(gameMode, matchStreak, lastFlipTime) {
  let baseScore = 100;
  
  // Streak bonus
  if (matchStreak > 1) {
    baseScore += (matchStreak - 1) * 25;
  }
  
  // Speed bonus (if flip was quick)
  if (lastFlipTime) {
    const timeDiff = Date.now() - lastFlipTime.getTime();
    if (timeDiff < 2000) { // Less than 2 seconds
      baseScore += 50;
    } else if (timeDiff < 5000) { // Less than 5 seconds
      baseScore += 25;
    }
  }
  
  // Game mode multiplier
  switch (gameMode) {
    case 'blitz':
      baseScore *= 1.5;
      break;
    case 'sudden-death':
      baseScore *= 1.2;
      break;
    case 'powerup-frenzy':
      baseScore *= 0.8;
      break;
    default: // classic
      baseScore *= 1.0;
  }
  
  return Math.floor(baseScore);
}

// Get time limit based on game mode
export function getTimeLimit(gameMode, customTimeLimit) {
  switch (gameMode) {
    case 'blitz':
      return 120; // 2 minutes
    case 'sudden-death':
      return 300; // 5 minutes
    case 'powerup-frenzy':
      return 420; // 7 minutes
    default: // classic
      return customTimeLimit || 600; // 10 minutes default
  }
}

// Calculate memory meter (0-100)
export function calculateMemoryMeter(matches, flips, matchStreak) {
  if (flips === 0) return 0;
  
  const accuracy = (matches * 2) / flips;
  const streakBonus = Math.min(matchStreak * 5, 25);
  const meter = (accuracy * 75) + streakBonus;
  
  return Math.min(Math.floor(meter), 100);
}

// Check if sudden death should trigger
export function shouldTriggerSuddenDeath(players, timeLeft) {
  if (timeLeft > 0) return false;
  
  // Check if there's a tie for first place
  const scores = players.map(p => p.score).sort((a, b) => b - a);
  return scores[0] === scores[1];
}

// Generate sudden death board (single pair)
export function generateSuddenDeathCards(theme = 'emojis') {
  const themeCards = THEMES[theme] || THEMES.emojis;
  const randomCard = themeCards[Math.floor(Math.random() * themeCards.length)];
  
  return [
    { id: 0, value: randomCard, theme, isFlipped: false, isMatched: false },
    { id: 1, value: randomCard, theme, isFlipped: false, isMatched: false }
  ];
}

// Shuffle array utility
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Validate board size
export function isValidBoardSize(size) {
  return [4, 6, 8].includes(size) && (size * size) % 2 === 0;
}

// Get difficulty level based on board size
export function getDifficultyLevel(boardSize) {
  switch (boardSize) {
    case 4:
      return 'Easy';
    case 6:
      return 'Medium';
    case 8:
      return 'Hard';
    default:
      return 'Unknown';
  }
}

// Calculate achievement progress
export function checkAchievements(player, gameResult) {
  const achievements = [];
  
  // First win
  if (gameResult.won && player.stats.gamesWon === 1) {
    achievements.push({
      id: 'first_win',
      name: 'First Victory',
      description: 'Win your first game',
      iconUrl: '🥇'
    });
  }
  
  // Perfect memory
  if (gameResult.isPerfect) {
    achievements.push({
      id: 'perfect_memory',
      name: 'Perfect Memory',
      description: 'Complete a game without any wrong matches',
      iconUrl: '🧠'
    });
  }
  
  // Speed demon (blitz mode win)
  if (gameResult.won && gameResult.gameMode === 'blitz') {
    achievements.push({
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Win a Blitz mode game',
      iconUrl: '⚡'
    });
  }
  
  // Combo master
  if (gameResult.matchStreak >= 5) {
    achievements.push({
      id: 'combo_master',
      name: 'Combo Master',
      description: 'Get a 5+ match streak',
      iconUrl: '🔥'
    });
  }
  
  // Power player
  if (gameResult.won && gameResult.powerUpsUsed >= 3) {
    achievements.push({
      id: 'power_player',
      name: 'Power Player',
      description: 'Win a game using 3+ power-ups',
      iconUrl: '🎮'
    });
  }
  
  // Grandmaster (8x8 board win)
  if (gameResult.won && gameResult.boardSize === 8) {
    achievements.push({
      id: 'grandmaster',
      name: 'Grandmaster',
      description: 'Win an 8x8 board game',
      iconUrl: '👑'
    });
  }
  
  // Marathon player
  if (player.stats.gamesPlayed >= 100) {
    achievements.push({
      id: 'marathon_player',
      name: 'Marathon Player',
      description: 'Play 100 games',
      iconUrl: '🏃'
    });
  }
  
  return achievements;
}