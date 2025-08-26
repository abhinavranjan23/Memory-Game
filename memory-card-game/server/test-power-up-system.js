const axios = require("axios");
const { io } = require("socket.io-client");

const API_BASE_URL = "http://localhost:3001/api";
const SOCKET_URL = "http://localhost:3001";

// Test user credentials
const TEST_USERS = [
  {
    username: "testuser1",
    email: "test1@example.com",
    password: "TestPassword123!",
  },
  {
    username: "testuser2",
    email: "test2@example.com",
    password: "TestPassword456!",
  },
];

let authTokens = {};
let sockets = {};

async function checkServer() {
  try {
    await axios.get("http://localhost:3001/health");
    console.log("✅ Server is running");
    return true;
  } catch (error) {
    console.log("❌ Server is not running");
    return false;
  }
}

async function loginUser(userData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      emailOrUsername: userData.email,
      password: userData.password,
    });
    console.log(`✅ Logged in user: ${userData.username}`);
    authTokens[userData.username] = response.data.token;
    return response.data.token;
  } catch (error) {
    console.log(
      `❌ Failed to login user ${userData.username}:`,
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function createGameWithPowerUps(token) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/game/create`,
      {
        isPrivate: false,
        settings: {
          maxPlayers: 2,
          boardSize: "4x4",
          gameMode: "classic", // Test with classic mode
          theme: "emojis",
          powerUpsEnabled: true, // Enable power-ups
          timeLimit: 60,
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("✅ Created game with power-ups enabled");
    return response.data.game;
  } catch (error) {
    console.log(
      "❌ Failed to create game:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

function connectSocket(token, username) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      auth: {
        token: token,
      },
    });

    socket.on("connect", () => {
      console.log(`✅ ${username} connected to socket`);
      sockets[username] = socket;
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.log(`❌ ${username} socket connection error:`, error.message);
      reject(error);
    });

    setTimeout(() => {
      reject(new Error("Socket connection timeout"));
    }, 5000);
  });
}

function joinRoom(socket, roomId, username) {
  return new Promise((resolve, reject) => {
    socket.emit("join-room", { roomId });

    socket.on("room-joined", (data) => {
      console.log(`✅ ${username} joined room:`, data.roomId);
      resolve(data);
    });

    socket.on("error", (error) => {
      console.log(`❌ ${username} join room error:`, error.message);
      reject(error);
    });

    setTimeout(() => {
      reject(new Error("Join room timeout"));
    }, 5000);
  });
}

function waitForGameStart(socket, username) {
  return new Promise((resolve, reject) => {
    socket.on("game-started", (data) => {
      console.log(`✅ ${username} received game-started event`);
      console.log("Game state:", {
        status: data.gameState.status,
        powerUpsEnabled: data.gameState.powerUpsEnabled,
        boardSize: data.gameState.board.length,
        players: data.players.map((p) => ({
          username: p.username,
          powerUps: p.powerUps.length,
        })),
      });

      // Check if power-ups are on the board
      const cardsWithPowerUps = data.gameState.board.filter(
        (card) => card.powerUp
      );
      console.log(`Cards with power-ups: ${cardsWithPowerUps.length}`);
      cardsWithPowerUps.forEach((card) => {
        console.log(
          `  Card ${card.id}: ${card.value} - Power-up: ${card.powerUp.name}`
        );
      });

      resolve(data);
    });

    setTimeout(() => {
      reject(new Error("Game start timeout"));
    }, 10000);
  });
}

function waitForPowerUpUpdate(socket, username) {
  return new Promise((resolve, reject) => {
    socket.on("power-up-update", (data) => {
      console.log(`✅ ${username} received power-up-update event`);
      console.log("Power-up update:", {
        playerId: data.playerId,
        powerUpsCount: data.powerUps.length,
        newPowerUp: data.newPowerUp?.name,
      });
      resolve(data);
    });

    setTimeout(() => {
      reject(new Error("Power-up update timeout"));
    }, 10000);
  });
}

function testCardFlip(socket, cardId, username) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 ${username} attempting to flip card:`, cardId);

    socket.emit("flip-card", { cardId });

    socket.on("card-flipped", (data) => {
      console.log(`✅ ${username} card flip successful:`, data);
      resolve(data);
    });

    socket.on("error", (error) => {
      console.log(`❌ ${username} card flip error:`, error.message);
      reject(error);
    });

    setTimeout(() => {
      reject(new Error("Card flip timeout"));
    }, 5000);
  });
}

async function testPowerUpSystem() {
  console.log("🚀 Starting Power-Up System Test...\n");

  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log("❌ Cannot proceed without server running");
    return;
  }

  // Login both users
  console.log("👥 Logging in test users...");
  for (const userData of TEST_USERS) {
    const token = await loginUser(userData);
    if (!token) {
      console.log("❌ Cannot proceed without authentication");
      return;
    }
  }

  // Create a game with power-ups enabled
  console.log("\n🎮 Creating game with power-ups...");
  const game = await createGameWithPowerUps(authTokens[TEST_USERS[0].username]);
  if (!game) {
    console.log("❌ Cannot proceed without game");
    return;
  }

  console.log("Game created:", game.roomId);

  // Connect both users to socket
  console.log("\n🔌 Connecting users to socket...");
  for (const userData of TEST_USERS) {
    try {
      await connectSocket(authTokens[userData.username], userData.username);
    } catch (error) {
      console.log(`❌ Failed to connect ${userData.username} to socket`);
      return;
    }
  }

  // Join room with both users
  console.log("\n🚪 Joining room...");
  for (const userData of TEST_USERS) {
    try {
      await joinRoom(
        sockets[userData.username],
        game.roomId,
        userData.username
      );
    } catch (error) {
      console.log(`❌ Failed to join room for ${userData.username}`);
      return;
    }
  }

  // Wait for game to start
  console.log("\n⏳ Waiting for game to start...");
  let gameData;
  try {
    gameData = await waitForGameStart(
      sockets[TEST_USERS[0].username],
      TEST_USERS[0].username
    );
  } catch (error) {
    console.log("❌ Game did not start:", error.message);
    return;
  }

  // Check if power-ups are on the board
  const cardsWithPowerUps = gameData.gameState.board.filter(
    (card) => card.powerUp
  );
  if (cardsWithPowerUps.length === 0) {
    console.log("❌ No power-ups found on the board");
    return;
  }

  console.log(`\n🎁 Found ${cardsWithPowerUps.length} cards with power-ups`);

  // Find a pair of cards with power-ups
  const powerUpCard = cardsWithPowerUps[0];
  const matchingCard = gameData.gameState.board.find(
    (card) =>
      card.value === powerUpCard.value &&
      card.id !== powerUpCard.id &&
      !card.isMatched
  );

  if (!matchingCard) {
    console.log("❌ Could not find matching card for power-up card");
    return;
  }

  console.log(`\n🃏 Testing power-up collection with cards:`, {
    card1: {
      id: powerUpCard.id,
      value: powerUpCard.value,
      powerUp: powerUpCard.powerUp?.name,
    },
    card2: {
      id: matchingCard.id,
      value: matchingCard.value,
      powerUp: matchingCard.powerUp?.name,
    },
  });

  // Set up power-up update listener for the current turn player
  const currentTurnPlayer = gameData.players.find((p) => p.isCurrentTurn);
  const currentTurnSocket =
    sockets[
      currentTurnPlayer.username === TEST_USERS[0].username
        ? TEST_USERS[0].username
        : TEST_USERS[1].username
    ];

  // Wait for power-up update
  const powerUpPromise = waitForPowerUpUpdate(
    currentTurnSocket,
    currentTurnPlayer.username
  );

  // Flip the first card
  try {
    await testCardFlip(
      currentTurnSocket,
      powerUpCard.id,
      currentTurnPlayer.username
    );
  } catch (error) {
    console.log("❌ Failed to flip first card:", error.message);
    return;
  }

  // Wait a moment, then flip the matching card
  setTimeout(async () => {
    try {
      await testCardFlip(
        currentTurnSocket,
        matchingCard.id,
        currentTurnPlayer.username
      );
    } catch (error) {
      console.log("❌ Failed to flip second card:", error.message);
      return;
    }
  }, 1000);

  // Wait for power-up update
  try {
    const powerUpData = await powerUpPromise;
    console.log("✅ Power-up collection successful!");
    console.log(
      `Player ${currentTurnPlayer.username} now has ${powerUpData.powerUps.length} power-ups`
    );
  } catch (error) {
    console.log("❌ Power-up collection failed:", error.message);
  }

  // Cleanup
  console.log("\n🧹 Cleaning up...");
  Object.values(sockets).forEach((socket) => {
    socket.disconnect();
  });

  console.log("\n✅ Power-up system test completed!");
}

// Run the test
testPowerUpSystem().catch(console.error);
