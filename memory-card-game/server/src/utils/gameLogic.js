const THEMES = {
  emojis: [
    "🎮",
    "🎯",
    "🎲",
    "🎪",
    "🎨",
    "🎭",
    "🎪",
    "🎊",
    "🚀",
    "⭐",
    "🌟",
    "💫",
    "🔥",
    "⚡",
    "💎",
    "🏆",
    "🦄",
    "🐲",
    "🦋",
    "🌈",
    "🍕",
    "🍔",
    "🍰",
    "🎂",
    "🏀",
    "⚽",
    "🎾",
    "🏈",
    "🎱",
    "🏸",
    "🏓",
    "🎳",
  ],
  animals: [
    "🐶",
    "🐱",
    "🐭",
    "🐹",
    "🐰",
    "🦊",
    "🐻",
    "🐼",
    "🐨",
    "🐯",
    "🦁",
    "🐮",
    "🐷",
    "🐸",
    "🐵",
    "🐔",
    "🐧",
    "🐦",
    "🐤",
    "🦆",
    "🦅",
    "🦉",
    "🦇",
    "🐺",
    "🐗",
    "🐴",
    "🦄",
    "🐝",
    "🐛",
    "🦋",
    "🐌",
    "🐞",
  ],
  tech: [
    "⚛️",
    "🅰️",
    "🔷",
    "📱",
    "💻",
    "⌨️",
    "🖥️",
    "🖨️",
    "📡",
    "🔌",
    "🔋",
    "📷",
    "📹",
    "📞",
    "☎️",
    "📠",
    "💾",
    "💿",
    "📀",
    "🎮",
    "🕹️",
    "📱",
    "⌚",
    "💻",
    "🖥️",
    "⌨️",
    "🖱️",
    "🖨️",
    "📷",
    "📹",
    "🔍",
    "💡",
  ],
  nature: [
    "🌲",
    "🌳",
    "🌴",
    "🌵",
    "🌶️",
    "🌷",
    "🌸",
    "🌺",
    "🌻",
    "🌼",
    "🌽",
    "🍀",
    "🍁",
    "🍂",
    "🍃",
    "🌿",
    "☘️",
    "🌱",
    "🌾",
    "💐",
    "🌙",
    "☀️",
    "⭐",
    "🌟",
    "💫",
    "⚡",
    "☄️",
    "🌈",
    "☔",
    "❄️",
    "🔥",
    "💧",
  ],
  food: [
    "🍎",
    "🍊",
    "🍋",
    "🍌",
    "🍉",
    "🍇",
    "🍓",
    "🫐",
    "🍈",
    "🍒",
    "🍑",
    "🥭",
    "🍍",
    "🥥",
    "🥝",
    "🍅",
    "🍆",
    "🥑",
    "🥦",
    "🥬",
    "🥒",
    "🌶️",
    "🫑",
    "🌽",
    "🥕",
    "🫒",
    "🧄",
    "🧅",
    "🥔",
    "🍠",
    "🥐",
    "🍞",
  ],
};

// Power-up definitions
const POWER_UPS = [
  {
    type: "extraTurn",
    name: "Extra Turn",
    description: "Get an additional turn after a miss",
    icon: "🔄",
    uses: 1,
    rarity: 0.25,
  },
  {
    type: "peek",
    name: "Peek",
    description: "Reveal all cards for 3 seconds",
    icon: "👁️",
    uses: 1,
    rarity: 0.2,
  },
  {
    type: "swap",
    name: "Swap",
    description: "Swap the positions of two cards",
    icon: "🔀",
    uses: 1,
    rarity: 0.18,
  },
  {
    type: "revealOne",
    name: "Reveal One",
    description: "Permanently reveal one card",
    icon: "💡",
    uses: 1,
    rarity: 0.15,
  },
  {
    type: "freeze",
    name: "Freeze Timer",
    description: "Freeze the timer for 10 seconds",
    icon: "❄️",
    duration: 10000,
    uses: 1,
    rarity: 0.12,
  },
  {
    type: "shuffle",
    name: "Shuffle",
    description: "Shuffle all unmatched cards",
    icon: "🔀",
    uses: 1,
    rarity: 0.1,
  },
];

function generateBoard(
  boardSize,
  theme = "emojis",
  powerUpsEnabled = true,
  gameMode = "classic"
) {
  let size;
  if (typeof boardSize === "string") {
    size = parseInt(boardSize.split("x")[0], 10);
    if (isNaN(size)) {
      size = 4;
    }
  } else {
    size = boardSize;
  }

  const totalCards = size * size;
  const pairs = totalCards / 2;

  if (!THEMES[theme]) {
    theme = "emojis";
  }

  const themeCards = THEMES[theme];
  if (themeCards.length < pairs) {
    throw new Error(
      `Theme ${theme} doesn't have enough cards for ${size}x${size} board`
    );
  }

  const selectedCards = shuffleArray(themeCards).slice(0, pairs);

  // Create pairs
  const cardPairs = [];
  selectedCards.forEach((card, index) => {
    cardPairs.push(
      { id: index * 2, value: card, theme, isFlipped: false, isMatched: false },
      {
        id: index * 2 + 1,
        value: card,
        theme,
        isFlipped: false,
        isMatched: false,
      }
    );
  });

  if (powerUpsEnabled) {
    let powerUpCount;
    if (gameMode === "powerup-frenzy") {
      powerUpCount = Math.floor(pairs * 0.6); // 60% of pairs get power-ups in frenzy mode
    } else {
      powerUpCount = Math.floor(pairs * 0.3); // 30% of pairs get power-ups normally
    }

    const pairIndices = shuffleArray(
      Array.from({ length: pairs }, (_, i) => i)
    );
    const shuffledPairIndices = shuffleArray(pairIndices).slice(
      0,
      powerUpCount
    );

    shuffledPairIndices.forEach((pairIndex) => {
      const cardIndex = pairIndex * 2;
      const randomPowerUp = getRandomPowerUp();
      if (randomPowerUp) {
        cardPairs[cardIndex].powerUp = randomPowerUp;
      }
    });
  }

  // Shuffle the final board
  return shuffleArray(cardPairs);
}

function getRandomPowerUp() {
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
function cardsMatch(card1, card2) {
  return card1.value === card2.value && card1.theme === card2.theme;
}

function calculateScore(gameMode, matchStreak, lastFlipTime) {
  let baseScore = 100;

  // Streak bonus
  if (matchStreak > 1) {
    baseScore += (matchStreak - 1) * 25;
  }

  if (lastFlipTime) {
    const timeDiff = Date.now() - lastFlipTime.getTime();
    if (timeDiff < 2000) {
      baseScore += 50;
    } else if (timeDiff < 5000) {
      baseScore += 25;
    }
  }

  switch (gameMode) {
    case "blitz":
      baseScore *= 1.5;
      break;
    case "sudden-death":
      baseScore *= 1.2;
      break;
    case "powerup-frenzy":
      baseScore *= 0.8;
      break;
    default: // classic
      baseScore *= 1.0;
  }

  return Math.floor(baseScore);
}

function getTimeLimit(gameMode, customTimeLimit) {
  switch (gameMode) {
    case "blitz":
      return customTimeLimit || 60; // Use custom time limit or default to 60 seconds
    case "sudden-death":
      return null; // No time limit for sudden death (elimination-based)
    case "powerup-frenzy":
      return customTimeLimit || 420; // Use custom time limit or default to 7 minutes
    default: // classic
      return null; // No time limit for classic mode
  }
}

function calculateMemoryMeter(matches, flips, matchStreak) {
  if (flips === 0) return 0;

  const accuracy = (matches * 2) / flips;
  const streakBonus = Math.min(matchStreak * 5, 25);
  const meter = accuracy * 75 + streakBonus;

  return Math.min(Math.floor(meter), 100);
}

function shouldTriggerSuddenDeath(players, timeLeft) {
  if (timeLeft > 0) return false;

  // Check if there's a tie for first place
  const scores = players.map((p) => p.score).sort((a, b) => b - a);
  return scores.length >= 2 && scores[0] === scores[1];
}

function generateSuddenDeathCards(theme = "emojis") {
  const themeCards = THEMES[theme] || THEMES.emojis;
  const randomCard = themeCards[Math.floor(Math.random() * themeCards.length)];

  return [
    { id: 0, value: randomCard, theme, isFlipped: false, isMatched: false },
    { id: 1, value: randomCard, theme, isFlipped: false, isMatched: false },
  ];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isValidBoardSize(size) {
  // Handle string board sizes like "4x4"
  let numericSize;
  if (typeof size === "string") {
    numericSize = parseInt(size.split("x")[0], 10);
    if (isNaN(numericSize)) {
      return false;
    }
  } else {
    numericSize = size;
  }

  return (
    [4, 6, 8].includes(numericSize) && (numericSize * numericSize) % 2 === 0
  );
}

// Get difficulty level based on board size
function getDifficultyLevel(boardSize) {
  let size;
  if (typeof boardSize === "string") {
    size = parseInt(boardSize.split("x")[0], 10);
    if (isNaN(size)) {
      return "Unknown";
    }
  } else {
    size = boardSize;
  }

  switch (size) {
    case 4:
      return "Easy";
    case 6:
      return "Medium";
    case 8:
      return "Hard";
    default:
      return "Unknown";
  }
}

// Calculate achievement progress
function checkAchievements(player, gameResult) {
  const achievements = [];

  // First win
  if (gameResult.won && player.stats.gamesWon === 1) {
    achievements.push({
      id: "first_win",
      name: "First Victory",
      description: "Win your first game",
      iconUrl: "🥇",
    });
  }

  // Perfect memory
  if (gameResult.isPerfect) {
    achievements.push({
      id: "perfect_memory",
      name: "Perfect Memory",
      description: "Complete a game without any wrong matches",
      iconUrl: "🧠",
    });
  }

  // Speed demon (blitz mode win)
  if (gameResult.won && gameResult.gameMode === "blitz") {
    achievements.push({
      id: "speed_demon",
      name: "Speed Demon",
      description: "Win a Blitz mode game",
      iconUrl: "⚡",
    });
  }

  // Combo master
  if (gameResult.matchStreak >= 5) {
    achievements.push({
      id: "combo_master",
      name: "Combo Master",
      description: "Get a 5+ match streak",
      iconUrl: "🔥",
    });
  }

  // Power player
  if (gameResult.won && gameResult.powerUpsUsed >= 3) {
    achievements.push({
      id: "power_player",
      name: "Power Player",
      description: "Win a game using 3+ power-ups",
      iconUrl: "🎮",
    });
  }

  // Grandmaster (8x8 board win)
  let boardSize = gameResult.boardSize;
  if (typeof boardSize === "string") {
    boardSize = parseInt(boardSize.split("x")[0], 10);
  }

  if (gameResult.won && boardSize === 8) {
    achievements.push({
      id: "grandmaster",
      name: "Grandmaster",
      description: "Win an 8x8 board game",
      iconUrl: "👑",
    });
  }

  // Marathon player
  if (player.stats.gamesPlayed >= 100) {
    achievements.push({
      id: "marathon_player",
      name: "Marathon Player",
      description: "Play 100 games",
      iconUrl: "🏃",
    });
  }

  // High scorer
  if (gameResult.score >= 1000) {
    achievements.push({
      id: "high_scorer",
      name: "High Scorer",
      description: "Score 1000+ points in a single game",
      iconUrl: "💎",
    });
  }

  // Consistent winner
  if (player.stats.gamesPlayed >= 10 && player.stats.winRate >= 80) {
    achievements.push({
      id: "consistent_winner",
      name: "Consistent Winner",
      description: "Maintain 80%+ win rate over 10+ games",
      iconUrl: "🏆",
    });
  }

  // Quick Draw (score 500+ in a game)
  if (gameResult.score >= 500) {
    achievements.push({
      id: "quick_draw",
      name: "Quick Draw",
      description: "Score 500+ points in a single game",
      iconUrl: "🎯",
    });
  }

  // Memory Master (high memory meter)
  if (gameResult.memoryMeter >= 90) {
    achievements.push({
      id: "memory_master",
      name: "Memory Master",
      description: "Achieve 90%+ memory meter in a game",
      iconUrl: "🧠",
    });
  }

  // Power-up Collector (use 5+ power-ups in one game)
  if (gameResult.powerUpsUsed >= 5) {
    achievements.push({
      id: "powerup_collector",
      name: "Power-up Collector",
      description: "Use 5+ power-ups in a single game",
      iconUrl: "🎁",
    });
  }

  // Time Master (win Blitz mode game)
  if (gameResult.won && gameResult.gameMode === "blitz") {
    achievements.push({
      id: "time_master",
      name: "Time Master",
      description: "Win a Blitz mode game",
      iconUrl: "⏰",
    });
  }

  // Streak Breaker (perfect games)
  if (player.stats.perfectGames >= 5) {
    achievements.push({
      id: "streak_breaker",
      name: "Streak Breaker",
      description: "Complete 5+ perfect games",
      iconUrl: "💥",
    });
  }

  // Social Butterfly (play 50+ games)
  if (player.stats.gamesPlayed >= 50) {
    achievements.push({
      id: "social_butterfly",
      name: "Social Butterfly",
      description: "Play 50+ games",
      iconUrl: "🦋",
    });
  }

  // Night Owl (play 25+ games)
  if (player.stats.gamesPlayed >= 25) {
    achievements.push({
      id: "night_owl",
      name: "Night Owl",
      description: "Play 25+ games",
      iconUrl: "🦉",
    });
  }

  // Comeback King (win 20+ games)
  if (player.stats.gamesWon >= 20) {
    achievements.push({
      id: "comeback_king",
      name: "Comeback King",
      description: "Win 20+ games",
      iconUrl: "👑",
    });
  }

  // Speed Reader (fast average flip time)
  if (player.stats.averageFlipTime > 0 && player.stats.averageFlipTime < 3000) {
    achievements.push({
      id: "speed_reader",
      name: "Speed Reader",
      description: "Average flip time under 3 seconds",
      iconUrl: "📖",
    });
  }

  // Lucky Streak (get 10+ match streak)
  if (player.stats.bestMatchStreak >= 10) {
    achievements.push({
      id: "lucky_streak",
      name: "Lucky Streak",
      description: "Get a 10+ match streak",
      iconUrl: "🍀",
    });
  }

  // Weekend Warrior (play 75+ games)
  if (player.stats.gamesPlayed >= 75) {
    achievements.push({
      id: "weekend_warrior",
      name: "Weekend Warrior",
      description: "Play 75+ games",
      iconUrl: "⚔️",
    });
  }

  return achievements;
}

module.exports = {
  THEMES,
  POWER_UPS,
  generateBoard,
  getRandomPowerUp,
  cardsMatch,
  calculateScore,
  getTimeLimit,
  calculateMemoryMeter,
  shouldTriggerSuddenDeath,
  generateSuddenDeathCards,
  shuffleArray,
  isValidBoardSize,
  getDifficultyLevel,
  checkAchievements,
};
