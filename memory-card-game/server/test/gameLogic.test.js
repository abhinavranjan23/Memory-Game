const {
  generateBoard,
  cardsMatch,
  calculateScore,
  getTimeLimit,
  shouldTriggerSuddenDeath,
  generateSuddenDeathCards,
  calculateMemoryMeter,
  shuffleArray,
  getRandomPowerUp,
  isValidBoardSize,
  getDifficultyLevel,
} = require("../src/utils/gameLogic.js");

const antiCheatSystem = require("../src/utils/antiCheat.js");

// Test 1: Board Generation
try {
  const board4x4 = generateBoard("4x4", "emojis", true, "classic");
  const board6x6 = generateBoard("6x6", "animals", false, "blitz");
  const board8x8 = generateBoard("8x8", "fruits", true, "powerup-frenzy");

  if (
    board4x4.length === 16 &&
    board6x6.length === 36 &&
    board8x8.length === 64
  ) {
  } else {
    process.exit(1);
  }

  // Check for valid card structure
  const sampleCard = board4x4[0];
  if (sampleCard.id !== undefined && sampleCard.value && sampleCard.theme) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 2: Card Matching
try {
  const card1 = { id: 0, value: "🌟", theme: "emojis" };
  const card2 = { id: 1, value: "🌟", theme: "emojis" };
  const card3 = { id: 2, value: "🐶", theme: "animals" };

  if (cardsMatch(card1, card2)) {
  } else {
    process.exit(1);
  }

  if (!cardsMatch(card1, card3)) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 3: Score Calculation
try {
  const baseScore = calculateScore("classic", 1, new Date());
  const blitzScore = calculateScore("blitz", 3, new Date());
  const powerupScore = calculateScore("powerup-frenzy", 2, new Date());

  if (baseScore > 0 && blitzScore > 0 && powerupScore > 0) {
  } else {
    process.exit(1);
  }

  // Test streak bonus
  const streakScore = calculateScore("classic", 5, new Date());
  if (streakScore > baseScore) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 4: Time Limit
try {
  const classicTime = getTimeLimit("classic", 300);
  const blitzTime = getTimeLimit("blitz", 180);
  const suddenDeathTime = getTimeLimit("sudden-death", 60);

  if (classicTime === null && blitzTime === 180 && suddenDeathTime === null) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 5: Sudden Death Logic
try {
  // Test with tied players
  const tiedPlayers = [
    { score: 100, matches: 5 },
    { score: 100, matches: 5 },
    { score: 50, matches: 2 },
  ];

  if (shouldTriggerSuddenDeath(tiedPlayers, 0)) {
  } else {
    process.exit(1);
  }

  // Test with no tie
  const noTiePlayers = [
    { score: 100, matches: 5 },
    { score: 80, matches: 4 },
    { score: 50, matches: 2 },
  ];

  if (!shouldTriggerSuddenDeath(noTiePlayers, 0)) {
  } else {
    process.exit(1);
  }

  // Test with time remaining
  if (!shouldTriggerSuddenDeath(tiedPlayers, 10)) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 6: Sudden Death Cards
try {
  const suddenDeathBoard = generateSuddenDeathCards("emojis");

  if (suddenDeathBoard.length === 2) {
  } else {
    process.exit(1);
  }

  if (suddenDeathBoard[0].value === suddenDeathBoard[1].value) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 7: Memory Meter
try {
  const perfectMemory = calculateMemoryMeter(8, 16, 8); // Perfect game
  const averageMemory = calculateMemoryMeter(4, 20, 2); // Average game
  const poorMemory = calculateMemoryMeter(2, 30, 0); // Poor game

  if (perfectMemory > averageMemory && averageMemory > poorMemory) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 8: Array Shuffling
try {
  const originalArray = [1, 2, 3, 4, 5];
  const shuffledArray = shuffleArray([...originalArray]);

  if (shuffledArray.length === originalArray.length) {
  } else {
    process.exit(1);
  }

  // Check if all elements are present (not a perfect test but good enough)
  const allElementsPresent = originalArray.every((item) =>
    shuffledArray.includes(item)
  );
  if (allElementsPresent) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 9: Power-up Generation
try {
  const powerUp = getRandomPowerUp();

  if (powerUp && powerUp.type && powerUp.name && powerUp.description) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 10: Board Size Validation
try {
  if (
    isValidBoardSize("4x4") &&
    isValidBoardSize("6x6") &&
    isValidBoardSize("8x8")
  ) {
  } else {
    process.exit(1);
  }

  if (!isValidBoardSize("3x3") && !isValidBoardSize("5x5")) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 11: Difficulty Level
try {
  if (
    getDifficultyLevel("4x4") === "Easy" &&
    getDifficultyLevel("6x6") === "Medium" &&
    getDifficultyLevel("8x8") === "Hard"
  ) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}

// Test 12: Anti-Cheat System
try {
  const testGameState = {
    board: [{ id: 0, value: "🌟", isFlipped: false, isMatched: false }],
    matchedPairs: [],
    currentPlayerIndex: 0,
    timeLeft: 300,
    status: "playing",
    players: [{ userId: "test-user", isCurrentTurn: true }],
  };

  const hash = antiCheatSystem.generateGameStateHash(testGameState);
  if (hash && hash.length === 64) {
    // SHA-256 hash length
  } else {
    process.exit(1);
  }

  const isValid = antiCheatSystem.validateGameState(
    "test-room",
    testGameState,
    "test-user"
  );
  if (isValid) {
  } else {
    process.exit(1);
  }
} catch (error) {
  process.exit(1);
}
