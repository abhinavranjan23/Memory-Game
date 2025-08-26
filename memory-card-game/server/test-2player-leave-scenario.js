const axios = require("axios");
const io = require("socket.io-client");

const API_BASE_URL = "http://localhost:3001/api";
const SOCKET_URL = "http://localhost:3001";

async function checkServer() {
  try {
    const response = await axios.get("http://localhost:3001/health");
    console.log("✅ Server is running:", response.data);
    return true;
  } catch (error) {
    console.error("❌ Server not running:", error.message);
    return false;
  }
}

async function registerUser(user) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, user);
    console.log(`✅ User ${user.username} registered successfully`);
    return response.data.token;
  } catch (error) {
    console.log(
      `❌ Failed to register user ${user.username}:`,
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function loginUser(user) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      emailOrUsername: user.email,
      password: user.password,
    });
    console.log(`✅ User ${user.username} logged in successfully`);
    return response.data.token;
  } catch (error) {
    console.log(
      `❌ Failed to login user ${user.username}:`,
      error.response?.data?.message || error.message
    );
    return null;
  }
}

async function createGame(token, settings = {}) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/game/create`,
      {
        settings: {
          maxPlayers: 2,
          boardSize: 4,
          gameMode: "classic",
          ...settings,
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Game created successfully:", response.data);
    return response.data.roomId || response.data.game?.roomId;
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

async function test2PlayerLeaveScenario() {
  console.log("🧪 Testing 2-Player Leave Scenario");
  console.log("=" * 50);

  // Check server
  if (!(await checkServer())) {
    console.error("❌ Server not running, cannot test");
    return;
  }

  // Create test users
  const users = [
    {
      username: "player1_2p",
      email: "player1_2p@test.com",
      password: "StrongPass123!",
    },
    {
      username: "player2_2p",
      email: "player2_2p@test.com",
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

  if (tokens.length < 2) {
    console.error("❌ Not enough users registered for testing");
    return;
  }

  // Create game with first user (2-player game)
  const roomId = await createGame(tokens[0].token, { maxPlayers: 2 });
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

  if (sockets.length < 2) {
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
    "\n🎮 Game started successfully! Testing 2-player leave scenario..."
  );

  // Test: Player leaves during 2-player game (should end game immediately)
  console.log(
    "\n📋 Test: Player leaves during 2-player game (should end immediately)"
  );
  try {
    const gameOverPromise = waitForGameOver(
      sockets[0].socket,
      sockets[0].username
    );
    const playerLeftPromise = waitForPlayerLeft(
      sockets[0].socket,
      sockets[0].username
    );

    // Disconnect player 2
    console.log(`🔌 Disconnecting ${sockets[1].username}...`);
    sockets[1].socket.disconnect();

    // Wait for both events
    const [gameOverData, playerLeftData] = await Promise.all([
      gameOverPromise,
      playerLeftPromise,
    ]);

    console.log("✅ Test passed: Game ended immediately when player left");
    console.log("   Game over reason:", gameOverData.reason);
    console.log(
      "   Winners:",
      gameOverData.winners?.map((w) => w.username) || []
    );
    console.log(
      "   Completion reason:",
      gameOverData.gameState?.completionReason
    );
    console.log(
      "   Remaining players after player left:",
      playerLeftData.remainingPlayers
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
    console.error("❌ Test failed:", error.message);
  }

  // Cleanup
  console.log("\n🧹 Cleaning up...");
  for (const user of sockets) {
    if (user.socket.connected) {
      user.socket.disconnect();
    }
  }

  console.log("\n✅ 2-player leave scenario test completed!");
}

// Run the test
test2PlayerLeaveScenario().catch(console.error);
