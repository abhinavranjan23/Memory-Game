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

async function createBlitzGame(token) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/game/create`,
      {
        isPrivate: false,
        settings: {
          maxPlayers: 2,
          boardSize: "4x4",
          gameMode: "blitz",
          theme: "emojis",
          powerUpsEnabled: false,
          timeLimit: 10, // Short time limit to trigger sudden death quickly
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    console.log("✅ Created blitz game");
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
        currentTurn: data.gameState.currentTurn,
        players: data.players.map((p) => ({
          username: p.username,
          isCurrentTurn: p.isCurrentTurn,
        })),
      });
      resolve(data);
    });

    setTimeout(() => {
      reject(new Error("Game start timeout"));
    }, 10000);
  });
}

function waitForSuddenDeath(socket, username) {
  return new Promise((resolve, reject) => {
    socket.on("sudden-death-triggered", (data) => {
      console.log(`✅ ${username} received sudden-death-triggered event`);
      console.log("Sudden death data:", {
        status: data.gameState.status,
        currentTurn: data.gameState.currentTurn,
        players: data.players.map((p) => ({
          username: p.username,
          isCurrentTurn: p.isCurrentTurn,
        })),
      });
      resolve(data);
    });

    setTimeout(() => {
      reject(new Error("Sudden death timeout"));
    }, 15000);
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

async function testSuddenDeathTurnIssue() {
  console.log("🚀 Starting Sudden Death Turn Test...\n");

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

  // Create a blitz game with user1
  console.log("\n🎮 Creating blitz game...");
  const game = await createBlitzGame(authTokens[TEST_USERS[0].username]);
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
  try {
    await waitForGameStart(
      sockets[TEST_USERS[0].username],
      TEST_USERS[0].username
    );
  } catch (error) {
    console.log("❌ Game did not start:", error.message);
    return;
  }

  // Wait for sudden death to trigger (when time runs out)
  console.log("\n⏰ Waiting for sudden death to trigger...");
  let suddenDeathData;
  try {
    suddenDeathData = await waitForSuddenDeath(
      sockets[TEST_USERS[0].username],
      TEST_USERS[0].username
    );
  } catch (error) {
    console.log("❌ Sudden death did not trigger:", error.message);
    return;
  }

  // Test card flipping in sudden death mode
  console.log("\n🃏 Testing card flip in sudden death mode...");

  // Find the current turn player
  const currentTurnPlayer = suddenDeathData.players.find(
    (p) => p.isCurrentTurn
  );
  if (!currentTurnPlayer) {
    console.log("❌ No current turn player found in sudden death mode");
    return;
  }

  console.log(
    `Current turn player: ${currentTurnPlayer.username} (${currentTurnPlayer.userId})`
  );

  // Try to flip a card with the current turn player
  const currentTurnSocket =
    sockets[
      currentTurnPlayer.username === TEST_USERS[0].username
        ? TEST_USERS[0].username
        : TEST_USERS[1].username
    ];

  // Find an unflipped card
  const unflippedCard = suddenDeathData.gameState.board.find(
    (card) => !card.isFlipped && !card.isMatched
  );
  if (!unflippedCard) {
    console.log("❌ No unflipped cards found");
    return;
  }

  try {
    await testCardFlip(
      currentTurnSocket,
      unflippedCard.id,
      currentTurnPlayer.username
    );
    console.log("✅ Card flip successful in sudden death mode");
  } catch (error) {
    console.log("❌ Card flip failed in sudden death mode:", error.message);
  }

  // Cleanup
  console.log("\n🧹 Cleaning up...");
  Object.values(sockets).forEach((socket) => {
    socket.disconnect();
  });

  console.log("\n✅ Sudden death turn test completed!");
}

// Run the test
testSuddenDeathTurnIssue().catch(console.error);
