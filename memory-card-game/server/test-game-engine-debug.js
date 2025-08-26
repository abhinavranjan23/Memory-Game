const axios = require("axios");
const io = require("socket.io-client");

const API_BASE_URL = "http://localhost:3001/api";
const SOCKET_URL = "http://localhost:3001";

async function checkServer() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
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
      email: user.email,
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
          maxPlayers: 4,
          boardSize: 4,
          gameMode: "classic",
          ...settings,
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Game created successfully:", response.data.roomId);
    return response.data.roomId;
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

async function testGameEngineDebug() {
  console.log("🧪 Testing Game Engine Debug");
  console.log("=" * 50);

  // Check server
  if (!(await checkServer())) {
    console.error("❌ Server not running, cannot test");
    return;
  }

  // Create test user
  const user = {
    username: "debuguser",
    email: "debuguser@test.com",
    password: "StrongPass123!",
  };

  let token = await registerUser(user);
  if (!token) {
    token = await loginUser(user);
  }

  if (!token) {
    console.error("❌ Failed to get user token");
    return;
  }

  // Create game
  const roomId = await createGame(token, { maxPlayers: 2 });
  if (!roomId) {
    console.error("❌ Failed to create game");
    return;
  }

  // Connect socket
  const socket = await connectSocket(token, user.username);

  // Join room
  await joinRoom(socket, roomId, user.username);

  // Wait for game to start
  await waitForGameStart(socket, user.username);

  console.log("\n🎮 Game started! Now testing disconnect...");

  // Wait a bit then disconnect
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("🔌 Disconnecting socket...");
  socket.disconnect();

  // Wait for any events
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("\n✅ Test completed!");
}

// Run the test
testGameEngineDebug().catch(console.error);
