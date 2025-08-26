const fs = require("fs");
const path = require("path");

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
};

// Test runner function
const runTest = (testName, testFunction) => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    try {
      // Capture console output
      const originalLog = console.log;
      const originalError = console.error;
      let output = "";

      console.log = (...args) => {
        output += args.join(" ") + "\n";
        originalLog(...args);
      };

      console.error = (...args) => {
        output += "ERROR: " + args.join(" ") + "\n";
        originalError(...args);
      };

      // Run the test
      testFunction();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Restore console
      console.log = originalLog;
      console.error = originalError;

      testResults.total++;
      testResults.passed++;
      testResults.tests.push({
        name: testName,
        status: "PASSED",
        duration,
        output,
      });

      `);
      resolve();
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      testResults.total++;
      testResults.failed++;
      testResults.tests.push({
        name: testName,
        status: "FAILED",
        duration,
        error: error.message,
        output: error.stack || error.message,
      });

      console.log("Test failed: " + error.message);
      resolve();
    }
  });
};

// Test suite
const runTestSuite = async () => {
  // Test 1: Power-up System
  await runTest("Power-up System", () => {
    require("./powerup.test.js");
  });

  // Test 2: Authentication System
  await runTest("Authentication System", () => {
    require("./auth.test.js");
  });

  // Test 3: Game Logic System
  await runTest("Game Logic System", () => {
    require("./gameLogic.test.js");
  });

  // Test 4: Validation System
  await runTest("Validation System", () => {
    const {
      validateUser,
      validateGameSettings,
      sanitizeInput,
    } = require("../src/utils/validation.js");

    // Test user validation
    const validUser = {
      username: "testuser123",
      email: "test@example.com",
      password: "TestPass123!",
    };

    const validatedUser = validateUser(validUser);
    if (!validatedUser.username) {
      throw new Error("User validation failed");
    }

    // Test game settings validation
    const validSettings = {
      boardSize: "4x4",
      theme: "emojis",
      gameMode: "classic",
      timeLimit: 300,
      maxPlayers: 2,
      powerUpsEnabled: true,
      chatEnabled: true,
      isRanked: true,
    };

    const validatedSettings = validateGameSettings(validSettings);
    if (!validatedSettings.boardSize) {
      throw new Error("Game settings validation failed");
    }

    // Test input sanitization
    const dirtyInput = '<script>alert("xss")</script>Hello World';
    const cleanInput = sanitizeInput(dirtyInput);
    if (cleanInput.includes("<script>")) {
      throw new Error("Input sanitization failed");
    }
  });

  // Test 5: Anti-Cheat System
  await runTest("Anti-Cheat System", () => {
    const antiCheatSystem = require("../src/utils/antiCheat.js");

    // Test game state validation
    const testGameState = {
      board: [{ id: 0, value: "🌟", isFlipped: false, isMatched: false }],
      matchedPairs: [],
      currentPlayerIndex: 0,
      timeLeft: 300,
      status: "playing",
      players: [{ userId: "test-user", isCurrentTurn: true }],
    };

    const hash = antiCheatSystem.generateGameStateHash(testGameState);
    if (!hash || hash.length !== 64) {
      throw new Error("Game state hash generation failed");
    }

    const isValid = antiCheatSystem.validateGameState(
      "test-room",
      testGameState,
      "test-user"
    );
    if (!isValid) {
      throw new Error("Game state validation failed");
    }

    // Test card flip validation
    const cardFlipValid = antiCheatSystem.validateCardFlip(
      "test-user",
      0,
      testGameState
    );
    if (!cardFlipValid) {
      throw new Error("Card flip validation failed");
    }

    });

  // Test 6: Database Models
  await runTest("Database Models", () => {
    const { Game } = require("../src/models/Game.js");
    const { User } = require("../src/models/User.js");

    // Test Game model
    const gameData = {
      roomId: "test-room-123",
      players: [],
      gameState: {
        status: "waiting",
        currentPlayerIndex: 0,
        board: [],
        flippedCards: [],
        matchedPairs: [],
        timeLeft: 0,
        gameMode: "classic",
        round: 1,
        lastActivity: new Date(),
        powerUpPool: [],
      },
      settings: {
        boardSize: "4x4",
        theme: "emojis",
        gameMode: "classic",
        timeLimit: 300,
        maxPlayers: 2,
        powerUpsEnabled: true,
        chatEnabled: true,
        isRanked: true,
      },
      chat: [],
      isPrivate: false,
    };

    const game = new Game(gameData);
    if (!game.roomId || game.roomId !== "test-room-123") {
      throw new Error("Game model creation failed");
    }

    // Test User model
    const userData = {
      username: "testuser",
      email: "test@example.com",
      password: "hashedpassword123",
    };

    const user = new User(userData);
    if (!user.username || user.username !== "testuser") {
      throw new Error("User model creation failed");
    }

    });

  // Test 7: Security Features
  await runTest("Security Features", () => {
    // Test JWT secret validation
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "short";

    try {
      require("../src/utils/auth.js");
      throw new Error("JWT secret validation should have failed");
    } catch (error) {
      if (
        !error.message.includes("JWT_SECRET must be at least 32 characters")
      ) {
        throw new Error("JWT secret validation error message incorrect");
      }
    }

    // Restore original secret
    process.env.JWT_SECRET = originalSecret;

    });

  // Test 8: Performance Tests
  await runTest("Performance Tests", () => {
    const {
      generateBoard,
      shuffleArray,
    } = require("../src/utils/gameLogic.js");

    const startTime = Date.now();

    // Test board generation performance
    for (let i = 0; i < 100; i++) {
      generateBoard("4x4", "emojis", true, "classic");
    }

    const boardGenTime = Date.now() - startTime;
    if (boardGenTime > 5000) {
      // Should complete in under 5 seconds
      throw new Error("Board generation too slow: " + boardGenTime + "ms");
    }

    // Test array shuffling performance
    const shuffleStartTime = Date.now();
    for (let i = 0; i < 1000; i++) {
      shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }

    const shuffleTime = Date.now() - shuffleStartTime;
    if (shuffleTime > 1000) {
      // Should complete in under 1 second
      throw new Error("Array shuffling too slow: " + shuffleTime + "ms");
    }

    });
};

// Generate test report
const generateReport = () => {
  * 100).toFixed(
      2
    )}%`
  );

  if (testResults.failed > 0) {
    testResults.tests
      .filter((test) => test.status === "FAILED")
      .forEach((test) => {
        });
  }

  testResults.tests
    .filter((test) => test.status === "PASSED")
    .forEach((test) => {
      `);
    });

  // Save detailed report to file
  const reportPath = path.join(__dirname, "test-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  // Exit with appropriate code
  if (testResults.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

// Run the test suite
runTestSuite()
  .then(generateReport)
  .catch((error) => {
    console.error("Test suite execution failed:", error);
    process.exit(1);
  });
