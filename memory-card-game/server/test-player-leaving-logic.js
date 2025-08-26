const axios = require("axios");
const { io } = require("socket.io-client");

const API_BASE_URL = "http://localhost:3001/api";
const SOCKET_URL = "http://localhost:3001";

async function checkServer() {
  try {
    const response = await axios.get(`http://localhost:3001/health`);
    console.log("✅ Server is running:", response.data);
    return true;
  } catch (error) {
    console.error("❌ Server is not running:", error.message);
    return false;
  }
}

async function registerUser(userData) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/register`,
      userData
    );
    console.log(`✅ User ${userData.username} registered successfully`);
    return response.data.token;
  } catch (error) {
    console.error(
      `❌ Failed to register user ${userData.username}:`,
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function loginUser(userData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      emailOrUsername: userData.username,
      password: userData.password,
    });
    console.log(`✅ User ${userData.username} logged in successfully`);
    return response.data.token;
  } catch (error) {
    console.error(
      `❌ Failed to login user ${userData.username}:`,
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function createGame(token, gameSettings = {}) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/game/create`,
      {
        isPrivate: false,
        settings: {
          maxPlayers: 4,
          boardSize: "4x4",
          gameMode: "classic",
          theme: "emojis",
          powerUpsEnabled: true,
          ...gameSettings,
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Game created successfully:", response.data.game.roomId);
    return response.data.game.roomId;
  } catch (error) {
    console.error(
      "❌ Failed to create game:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

function connectSocket(token, username) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      auth: { token },
    });

    socket.on("connect", () => {
      console.log(`✅ Socket connected for ${username}`);
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      console.error(
        `❌ Socket connection error for ${username}:`,
        error.message
      );
      reject(error);
    });

    setTimeout(() => {
      reject(new Error(`Socket connection timeout for ${username}`));
    }, 5000);
  });
}

function joinRoom(socket, roomId, username) {
  return new Promise((resolve, reject) => {
    socket.emit("join-room", { roomId });

    socket.on("room-joined", (data) => {
      console.log(`✅ ${username} joined room ${roomId}`);
      resolve(data);
    });

    socket.on("join-error", (error) => {
      console.error(`❌ ${username} failed to join room:`, error.message);
      reject(error);
    });

    setTimeout(() => {
      reject(new Error(`Join room timeout for ${username}`));
    }, 5000);
  });
}

function waitForGameStart(socket, username) {
  return new Promise((resolve, reject) => {
    socket.on("game-started", (data) => {
      console.log(`✅ Game started for ${username}`);
      resolve(data);
    });

    setTimeout(() => {
      reject(new Error(`Game start timeout for ${username}`));
    }, 10000);
  });
}

function waitForPlayerLeft(socket, username) {
  return new Promise((resolve, reject) => {
    socket.on("player-left", (data) => {
      console.log(`✅ Player left event received by ${username}:`, {
        leftPlayer: data.username,
        remainingPlayers: data.remainingPlayers,
        gameStatus: data.gameStatus,
      });
      resolve(data);
    });

    setTimeout(() => {
      reject(new Error(`Player left event timeout for ${username}`));
    }, 5000);
  });
}

function waitForGameOver(socket, username) {
  return new Promise((resolve, reject) => {
    socket.on("game-over", (data) => {
      console.log(`✅ Game over event received by ${username}:`, {
        reason: data.reason,
        winners: data.winners?.map((w) => w.username) || [],
        completionReason: data.gameState?.completionReason,
      });
      resolve(data);
    });

    setTimeout(() => {
      reject(new Error(`Game over event timeout for ${username}`));
    }, 10000);
  });
}

async function testPlayerLeavingLogic() {
  console.log("🧪 Testing Player Leaving Logic");
  console.log("=" * 50);

  // Check server
  if (!(await checkServer())) {
    return;
  }

  // Register and login users
  const users = [
    {
      username: "player1",
      email: "player1@test.com",
      password: "StrongPass123!",
    },
    {
      username: "player2",
      email: "player2@test.com",
      password: "StrongPass123!",
    },
    {
      username: "player3",
      email: "player3@test.com",
      password: "StrongPass123!",
    },
    {
      username: "player4",
      email: "player4@test.com",
      password: "StrongPass123!",
    },
  ];

  const tokens = [];
  for (const user of users) {
    let token = await registerUser(user);
    if (!token) {
      // Try to login if registration failed
      token = await loginUser(user);
    }
    if (token) {
      tokens.push({ ...user, token });
    }
  }

  if (tokens.length < 4) {
    console.error("❌ Not enough users registered for testing");
    return;
  }

  // Create game with first user
  const roomId = await createGame(tokens[0].token, { maxPlayers: 4 });
  if (!roomId) {
    console.error("❌ Failed to create game");
    return;
  }

  // Connect all users to socket
  const sockets = [];
  for (const user of tokens) {
    try {
      const socket = await connectSocket(user.token, user.username);
      sockets.push({ ...user, socket });
    } catch (error) {
      console.error(`❌ Failed to connect socket for ${user.username}`);
    }
  }

  if (sockets.length < 4) {
    console.error("❌ Not enough socket connections for testing");
    return;
  }

  // Join all users to the room
  for (const user of sockets) {
    try {
      await joinRoom(user.socket, roomId, user.username);
    } catch (error) {
      console.error(`❌ Failed to join room for ${user.username}`);
    }
  }

  // Wait for game to start
  try {
    await waitForGameStart(sockets[0].socket, sockets[0].username);
  } catch (error) {
    console.error("❌ Game failed to start");
    return;
  }

  console.log(
    "\n🎮 Game started successfully! Testing player leaving scenarios..."
  );

  // Test 1: Player leaves during game (should continue with 3 players)
  console.log("\n📋 Test 1: Player leaves during game (3 players remain)");
  try {
    const playerLeftPromise = waitForPlayerLeft(
      sockets[0].socket,
      sockets[0].username
    );

    // Disconnect player 4
    console.log(`🔌 Disconnecting ${sockets[3].username}...`);
    sockets[3].socket.disconnect();

    const leftData = await playerLeftPromise;
    console.log("✅ Test 1 passed: Game continued with 3 players");
    console.log("   Remaining players:", leftData.remainingPlayers);
    console.log("   Game status:", leftData.gameStatus);
  } catch (error) {
    console.error("❌ Test 1 failed:", error.message);
  }

  // Wait a bit for the game to stabilize
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: Another player leaves (should continue with 2 players)
  console.log("\n📋 Test 2: Another player leaves (2 players remain)");
  try {
    const playerLeftPromise = waitForPlayerLeft(
      sockets[0].socket,
      sockets[0].username
    );

    // Disconnect player 3
    console.log(`🔌 Disconnecting ${sockets[2].username}...`);
    sockets[2].socket.disconnect();

    const leftData = await playerLeftPromise;
    console.log("✅ Test 2 passed: Game continued with 2 players");
    console.log("   Remaining players:", leftData.remainingPlayers);
    console.log("   Game status:", leftData.gameStatus);
  } catch (error) {
    console.error("❌ Test 2 failed:", error.message);
  }

  // Wait a bit for the game to stabilize
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 3: Last player leaves (should end game with winner)
  console.log(
    "\n📋 Test 3: Last player leaves (1 player remains - should be winner)"
  );
  try {
    const gameOverPromise = waitForGameOver(
      sockets[0].socket,
      sockets[0].username
    );

    // Disconnect player 2
    console.log(`🔌 Disconnecting ${sockets[1].username}...`);
    sockets[1].socket.disconnect();

    const gameOverData = await gameOverPromise;
    console.log("✅ Test 3 passed: Game ended with winner");
    console.log("   Reason:", gameOverData.reason);
    console.log(
      "   Winners:",
      gameOverData.winners?.map((w) => w.username) || []
    );
    console.log(
      "   Completion reason:",
      gameOverData.gameState?.completionReason
    );

    if (
      gameOverData.reason === "last_player_winner" &&
      gameOverData.winners?.length === 1 &&
      gameOverData.winners[0].username === sockets[0].username
    ) {
      console.log("✅ Winner logic working correctly!");
    } else {
      console.log("⚠️  Winner logic may have issues");
    }
  } catch (error) {
    console.error("❌ Test 3 failed:", error.message);
  }

  // Test 4: Check match history for opponent information
  console.log("\n📋 Test 4: Checking match history for opponent information");
  try {
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait for data to be saved

    const response = await axios.get(
      `${API_BASE_URL}/game/history/matches?limit=5`,
      {
        headers: { Authorization: `Bearer ${tokens[0].token}` },
      }
    );

    const recentMatches = response.data.matches;
    const latestMatch = recentMatches[0];

    if (latestMatch && latestMatch.opponents) {
      console.log("✅ Match history contains opponent information:");
      latestMatch.opponents.forEach((opponent) => {
        console.log(
          `   - ${opponent.username} (left early: ${opponent.leftEarly})`
        );
      });
    } else {
      console.log("⚠️  No opponent information found in match history");
    }
  } catch (error) {
    console.error(
      "❌ Failed to check match history:",
      error.response?.data?.message || error.message
    );
  }

  // Cleanup
  console.log("\n🧹 Cleaning up...");
  for (const user of sockets) {
    if (user.socket.connected) {
      user.socket.disconnect();
    }
  }

  console.log("\n✅ Player leaving logic test completed!");
}

// Run the test
testPlayerLeavingLogic().catch(console.error);
