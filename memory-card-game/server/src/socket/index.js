const { Game } = require("../models/Game.js");
const { User } = require("../models/User.js");
const { GameEngine } = require("./gameEngine.js");
const { authenticateSocket } = require("../middleware/auth.js");
const { updateMetrics } = require("../utils/metrics.js");
const antiCheatSystem = require("../utils/antiCheat.js");

const activeGames = new Map();
const userSockets = new Map();
const socketUsers = new Map();
const activePlayers = new Set();
const userRooms = new Map();
const socketCleanup = new Map();
const operationLocks = new Map();

function initializeSocket(io) {
  // Authentication middleware
  io.use(authenticateSocket);

  // Clean up old completed games and mark stale games as finished
  const cleanupOldGames = async () => {
    try {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      console.log("🔄 Starting database cleanup...");

      // Delete games older than 10 days that are completed/finished
      const deleteResult = await Game.deleteMany({
        $or: [
          { status: "completed", updatedAt: { $lt: tenDaysAgo } },
          { status: "finished", updatedAt: { $lt: tenDaysAgo } },
          { "gameState.status": "completed", updatedAt: { $lt: tenDaysAgo } },
          { "gameState.status": "finished", updatedAt: { $lt: tenDaysAgo } },
        ],
      });

      if (deleteResult.deletedCount > 0) {
        console.log(
          `🗑️ Deleted ${deleteResult.deletedCount} games older than 10 days`
        );
      }

      // Mark games as finished/completed if they've been playing or waiting for more than 2 hours
      const staleGames = await Game.find({
        $or: [
          { "gameState.status": "playing", updatedAt: { $lt: twoHoursAgo } },
          { "gameState.status": "waiting", updatedAt: { $lt: twoHoursAgo } },
          { "gameState.status": "starting", updatedAt: { $lt: twoHoursAgo } },
        ],
        $and: [
          { status: { $nin: ["completed", "finished"] } },
          { "gameState.status": { $nin: ["completed", "finished"] } },
        ],
      });

      console.log(
        `Found ${staleGames.length} stale games to mark as completed`
      );

      for (const game of staleGames) {
        try {
          console.log(
            `⏰ Marking stale game ${game.roomId} as completed (status: ${game.gameState.status}, updated: ${game.updatedAt})`
          );

          // Update game status
          game.gameState.status = "finished";
          game.status = "completed";
          game.endedAt = new Date();
          game.updatedAt = new Date();
          await game.save();

          // Clean up game engine if it exists
          const gameEngine = activeGames.get(game.roomId);
          if (gameEngine) {
            gameEngine.cleanup();
            activeGames.delete(game.roomId);
            console.log(
              `🧹 Cleaned up game engine for stale game ${game.roomId}`
            );
          }

          // Broadcast room deletion to all clients
          io.emit("room-deleted", game.roomId);
        } catch (error) {
          console.error(
            `❌ Error marking stale game ${game.roomId} as completed:`,
            error
          );
        }
      }

      if (staleGames.length > 0) {
        console.log(`✅ Marked ${staleGames.length} stale games as completed`);
      }

      // Also clean up any games that have been in "waiting" status for more than 1 hour
      const longWaitingGames = await Game.find({
        "gameState.status": "waiting",
        updatedAt: { $lt: new Date(now.getTime() - 60 * 60 * 1000) }, // 1 hour ago
        status: { $nin: ["completed", "finished"] },
      });

      for (const game of longWaitingGames) {
        try {
          console.log(
            `⏰ Marking long-waiting game ${game.roomId} as completed`
          );
          game.gameState.status = "finished";
          game.status = "completed";
          game.endedAt = new Date();
          game.updatedAt = new Date();
          await game.save();

          const gameEngine = activeGames.get(game.roomId);
          if (gameEngine) {
            gameEngine.cleanup();
            activeGames.delete(game.roomId);
          }

          io.emit("room-deleted", game.roomId);
        } catch (error) {
          console.error(
            `❌ Error marking long-waiting game ${game.roomId} as completed:`,
            error
          );
        }
      }

      if (longWaitingGames.length > 0) {
        console.log(
          `✅ Marked ${longWaitingGames.length} long-waiting games as completed`
        );
      }

      console.log("✅ Database cleanup completed");
    } catch (error) {
      console.error("❌ Error cleaning up old games:", error);
    }
  };

  // Run cleanup every 15 minutes (more frequent to catch stale games)
  setInterval(cleanupOldGames, 15 * 60 * 1000);

  // Run initial cleanup
  cleanupOldGames();

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.username} (${socket.id})`);

    // Anti-cheat validation: Check if user is blocked
    if (socket.userId && antiCheatSystem.isUserBlocked(socket.userId)) {
      console.warn(
        `🚫 Blocked user ${socket.username} (${socket.userId}) attempted to connect`
      );
      socket.emit("error", {
        message: "Your account has been blocked due to suspicious activity",
      });
      socket.disconnect(true);
      return;
    }

    // Initialize cleanup tracking for this socket
    socketCleanup.set(socket.id, new Set());

    if (socket.userId) {
      // Remove old socket if user already has one
      const oldSocketId = userSockets.get(socket.userId);
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.disconnect(true);
        }
        userSockets.delete(socket.userId);
        socketUsers.delete(oldSocketId);
        activePlayers.delete(socket.userId);
      }

      userSockets.set(socket.userId, socket.id);
      socketUsers.set(socket.id, socket.userId);
      activePlayers.add(socket.userId);

      // Update metrics
      updateMetrics.incrementSocketConnections();
      updateMetrics.setActivePlayers(activePlayers.size);

      console.log(`Active players count: ${activePlayers.size}`);
      // Emit active players count to all clients
      io.emit("active-players", { count: activePlayers.size });
    }

    //socket listen to get active players count
    socket.on("get-active-players", () => {
      io.emit("active-players", { count: activePlayers.size });
    });

    // Join a game room
    socket.on("join-room", async (data) => {
      try {
        console.log(`Join room request from ${socket.username}:`, data);
        console.log("Socket user info:", {
          userId: socket.userId,
          username: socket.username,
        });
        const { roomId, password } = data;

        // Anti-cheat validation: Check if user is blocked
        if (socket.userId && antiCheatSystem.isUserBlocked(socket.userId)) {
          console.warn(
            `🚫 Blocked user ${socket.username} (${socket.userId}) attempted to join room`
          );
          socket.emit("error", {
            message: "Your account has been blocked due to suspicious activity",
          });
          socket.emit("join-room-error", {
            message: "Your account has been blocked due to suspicious activity",
          });
          return;
        }

        if (!roomId) {
          console.log("Join room error: Room ID is required");
          socket.emit("error", { message: "Room ID is required" });
          socket.emit("join-room-error", { message: "Room ID is required" });
          return;
        }

        // Quick response to client to indicate request received
        socket.emit("join-room-received", { roomId });

        // Check if user is already in a room
        const currentRoom = userRooms.get(socket.userId);
        if (currentRoom && currentRoom !== roomId) {
          // Leave current room first
          await handleLeaveRoom(socket, currentRoom);
        }

        // Check if user is already in this room
        if (currentRoom === roomId) {
          console.log(`User ${socket.username} is already in room ${roomId}`);
          // Just emit the current room state
          const existingGame = await Game.findOne({ roomId });
          if (existingGame) {
            socket.emit("room-joined", {
              roomId,
              game: {
                roomId: existingGame.roomId,
                players: existingGame.players,
                gameState: existingGame.gameState,
                settings: existingGame.settings,
                chat: existingGame.chat.slice(-50),
              },
            });
          }
          return;
        }

        // Find the game
        let game = await Game.findOne({ roomId });

        if (!game) {
          // Create new game if it doesn't exist
          game = new Game({
            roomId,
            hostId: socket.userId, // Set the host ID
            settings: {
              boardSize: "4x4",
              theme: "emojis",
              gameMode: "classic",
              timeLimit: 300,
              maxPlayers: 2,
              powerUpsEnabled: false, // Default to false for classic mode
              chatEnabled: true,
              isRanked: true,
            },
            isPrivate: !!password,
            password: password ? password.trim() : undefined,
            players: [
              {
                userId: socket.userId,
                username: socket.username,
                avatar: socket.avatar,
                isHost: true,
                isReady: true,
                score: 0,
                matches: 0,
                flips: 0,
                powerUps: [],
              },
            ],
          });
          await game.save();
        }

        // Check if player is already in the game to prevent duplicates
        const existingPlayerInDB = game.players.find(
          (p) => p.userId === socket.userId
        );

        // Check password for private rooms (only if user is not already in the room and not the host)
        if (
          !existingPlayerInDB &&
          game.isPrivate &&
          game.password &&
          game.hostId !== socket.userId && // Skip password check for host
          game.password.trim() !== (password || "").trim()
        ) {
          console.log(`Join room error: Invalid password for room ${roomId}`);
          socket.emit("error", { message: "Invalid room password" });
          socket.emit("join-room-error", { message: "Invalid room password" });
          return;
        }

        // Add player to the game (actual push to DB)
        try {
          // Check if player is already in the game to prevent duplicates
          if (existingPlayerInDB) {
            console.log(
              `User ${socket.username} already exists in game ${roomId}`
            );
            // Update the existing player's socket info
            socket.join(roomId);
            socket.currentRoom = roomId;
            userRooms.set(socket.userId, roomId);

            socket.emit("room-joined", {
              roomId,
              game,
              message: "Rejoined existing game",
            });
            return;
          }

          // Double-check with fresh database query to prevent race conditions
          const freshGame = await Game.findOne({ roomId });
          if (freshGame.players.find((p) => p.userId === socket.userId)) {
            console.log(
              `User ${socket.username} already exists in fresh game query`
            );
            socket.join(roomId);
            socket.currentRoom = roomId;
            userRooms.set(socket.userId, roomId);
            socket.emit("room-joined", {
              roomId,
              game: freshGame,
              message: "Rejoined existing game",
            });
            return;
          }

          // Check if room is full
          if (freshGame.players.length >= freshGame.settings.maxPlayers) {
            socket.emit("error", {
              message: "Room is full",
            });
            return;
          }

          const updatedGame = await Game.findOneAndUpdate(
            { roomId },
            {
              $push: {
                players: {
                  userId: socket.userId,
                  username: socket.username,
                  avatar: socket.avatar,
                  isReady: true,
                  isCurrentTurn: false,
                  score: 0,
                  matches: 0,
                  flips: 0,
                  matchStreak: 0,
                  memoryMeter: 0,
                  powerUps: [],
                  powerUpsUsed: 0,
                  lastFlipTime: null,
                },
              },
              $set: { updatedAt: new Date() },
            },
            { new: true }
          );

          if (!updatedGame) {
            throw new Error("Failed to update game");
          }

          game = updatedGame;
        } catch (error) {
          console.error("Error adding player to game:", error);
          socket.emit("error", {
            message: "Failed to join game. Please try again.",
          });
          return;
        }

        // Join the socket room
        socket.join(roomId);
        socket.currentRoom = roomId;
        userRooms.set(socket.userId, roomId);

        // Ensure game engine exists for this room
        if (!activeGames.has(roomId)) {
          const { GameEngine } = require("./gameEngine.js");
          const gameEngine = new GameEngine(roomId, io);
          activeGames.set(roomId, gameEngine);
          console.log(`Created game engine for room ${roomId}`);
        }

        // Clean up any duplicate players that might exist (only if we detect duplicates)
        try {
          const playerIds = game.players.map((p) => p.userId);
          const uniquePlayerIds = [...new Set(playerIds)];

          if (playerIds.length !== uniquePlayerIds.length) {
            console.log(
              `Detected duplicate players in room ${roomId}, cleaning up...`
            );
            const uniquePlayers = [];
            const seenUserIds = new Set();

            for (const player of game.players) {
              if (!seenUserIds.has(player.userId)) {
                seenUserIds.add(player.userId);
                uniquePlayers.push(player);
              }
            }

            await Game.findOneAndUpdate(
              { roomId },
              { $set: { players: uniquePlayers } }
            );
            game.players = uniquePlayers;
            console.log(`Cleaned up duplicate players in room ${roomId}`);
          }
        } catch (error) {
          console.error("Error cleaning up duplicate players:", error);
        }

        console.log("Emitting room-joined event to client");
        socket.emit("room-joined", {
          roomId,
          game,
          message: "Successfully joined game",
        });

        // Notify other players
        socket.to(roomId).emit("player-joined", {
          player: {
            userId: socket.userId,
            username: socket.username,
            avatar: socket.avatar,
            isReady: true,
            isReconnecting: false,
          },
        });

        // Notify all clients about the room update
        io.emit("room-updated", {
          roomId: game.roomId,
          playerCount: game.players.length,
          maxPlayers: game.settings.maxPlayers,
          isJoinable: game.players.length < game.settings.maxPlayers,
          gameMode: game.settings.gameMode,
          status: game.gameState.status,
          boardSize: game.settings.boardSize,
          theme: game.settings.theme,
          settings: {
            powerUpsEnabled:
              game.settings.gameMode === "powerup-frenzy" ||
              game.settings.powerUpsEnabled,
            chatEnabled: game.settings.chatEnabled,
            isRanked: game.settings.isRanked,
          },
          isPrivate: game.isPrivate,
        });

        // Auto-start game if room has reached max players
        if (
          game.players.length >= game.settings.maxPlayers &&
          game.gameState.status === "waiting"
        ) {
          try {
            console.log(`Auto-starting game in room ${roomId} - Room is full`);

            // Mark all players as ready
            await Game.findOneAndUpdate(
              { roomId },
              {
                $set: {
                  "players.$[].isReady": true,
                },
              }
            );

            console.log("All players marked as ready");

            // Get or create game engine
            let gameEngine = activeGames.get(roomId);
            if (!gameEngine) {
              console.log("Creating new game engine for auto-start...");
              const { GameEngine } = require("./gameEngine.js");
              gameEngine = new GameEngine(roomId, io);
              activeGames.set(roomId, gameEngine);
            }

            console.log("Initializing game engine for auto-start...");
            // Initialize the game engine (this will load the updated game state)
            await gameEngine.initialize();

            console.log(
              "Auto-start game engine initialized, starting game in 3 seconds..."
            );
            // Add delay to allow client to process
            setTimeout(async () => {
              try {
                console.log("Auto-starting game now...");
                await gameEngine.startGame();
                console.log("Auto-start game started successfully");
              } catch (error) {
                console.error("Auto-start game error:", error);
                console.error("Auto-start error stack:", error.stack);
              }
            }, 3000);
          } catch (error) {
            console.error("Error auto-starting game:", error);
            console.error("Auto-start error stack:", error.stack);
          }
        }

        console.log(`${socket.username} joined room ${roomId}`);
      } catch (error) {
        console.error("Join room error:", error);
        const errorMessage = error.message || "Failed to join room";
        console.log(`Join room error: ${errorMessage}`);
        socket.emit("error", { message: errorMessage });
        socket.emit("join-room-error", { message: errorMessage });
      }
    });

    // Leave current room
    socket.on("leave-room", async () => {
      if (socket.currentRoom) {
        await handleLeaveRoom(socket, socket.currentRoom);
      }
    });

    // Start game
    socket.on("start-game", async () => {
      if (!socket.currentRoom) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      try {
        console.log(`Starting game for room ${socket.currentRoom}`);

        const game = await Game.findOne({ roomId: socket.currentRoom });
        if (!game) {
          socket.emit("error", { message: "Game not found" });
          return;
        }

        console.log(`Found game with ${game.players.length} players`);

        // Check if all players are ready
        const allReady = game.players.every((p) => p.isReady);
        if (!allReady) {
          socket.emit("error", { message: "All players must be ready" });
          return;
        }

        console.log("All players are ready, creating game engine...");

        // Get or create game engine
        let gameEngine = activeGames.get(socket.currentRoom);
        if (!gameEngine) {
          console.log("Creating new game engine...");
          gameEngine = new GameEngine(socket.currentRoom, io);
          activeGames.set(socket.currentRoom, gameEngine);
        }

        console.log("Initializing game engine...");
        // Initialize the game engine (this will load the current game state)
        await gameEngine.initialize();

        console.log("Starting game...");
        // Start the game
        await gameEngine.startGame();

        console.log("Game started successfully");
        // Don't emit additional game-start event as gameEngine.startGame() already emits game-started
      } catch (error) {
        console.error("Start game error:", error);
        console.error("Error stack:", error.stack);
        socket.emit("error", {
          message: "Failed to start game: " + error.message,
        });
      }
    });

    // Toggle ready status
    socket.on("toggle-ready", async () => {
      if (!socket.currentRoom) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      try {
        const game = await Game.findOne({ roomId: socket.currentRoom });
        if (!game) {
          socket.emit("error", { message: "Game not found" });
          return;
        }

        game.togglePlayerReady(socket.userId);
        await game.save();

        // Emit updated game state
        io.to(socket.currentRoom).emit("game-state", {
          players: game.players,
          gameState: game.gameState,
        });

        // Start game if all players are ready
        if (game.gameState.status === "starting") {
          const gameEngine = activeGames.get(socket.currentRoom);
          if (gameEngine) {
            setTimeout(async () => {
              try {
                // Re-initialize to get the latest game state
                await gameEngine.initialize();
                await gameEngine.startGame();
              } catch (e) {
                console.error("Start game error:", e.message);
              }
            }, 2000);
          }
        }
      } catch (error) {
        console.error("Toggle ready error:", error);
        socket.emit("error", { message: "Failed to toggle ready status" });
      }
    });

    // Flip a card
    socket.on("flip-card", async (data) => {
      if (!socket.currentRoom) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      // Anti-cheat validation: Check if user is blocked
      if (socket.userId && antiCheatSystem.isUserBlocked(socket.userId)) {
        console.warn(
          `🚫 Blocked user ${socket.username} (${socket.userId}) attempted to flip card`
        );
        socket.emit("error", {
          message: "Your account has been blocked due to suspicious activity",
        });
        return;
      }

      const { cardId } = data;
      const gameEngine = activeGames.get(socket.currentRoom);

      if (!gameEngine) {
        socket.emit("error", { message: "Game not active" });
        return;
      }

      try {
        await gameEngine.flipCard(socket.userId, cardId);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Use a power-up
    socket.on("use-powerup", async (data) => {
      console.log("=== POWER-UP EVENT RECEIVED ===");
      console.log("Power-up event received:", data);
      console.log("User ID:", socket.userId);
      console.log("Current room:", socket.currentRoom);
      console.log("Socket ID:", socket.id);
      console.log("Socket connected:", socket.connected);

      if (!socket.currentRoom) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      // Anti-cheat validation: Check if user is blocked
      if (socket.userId && antiCheatSystem.isUserBlocked(socket.userId)) {
        console.warn(
          `🚫 Blocked user ${socket.username} (${socket.userId}) attempted to use power-up`
        );
        socket.emit("error", {
          message: "Your account has been blocked due to suspicious activity",
        });
        return;
      }

      const { powerUpType, target } = data;
      console.log("Power-up type:", powerUpType);
      console.log("Target:", target);

      const gameEngine = activeGames.get(socket.currentRoom);

      if (!gameEngine) {
        console.log("No game engine found for room:", socket.currentRoom);
        socket.emit("error", { message: "Game not active" });
        return;
      }

      try {
        console.log("Calling gameEngine.usePowerUp...");
        await gameEngine.usePowerUp(socket.userId, powerUpType, target);
        console.log("Power-up used successfully");
      } catch (error) {
        console.error("Power-up error:", error);
        socket.emit("error", { message: error.message });
      }
    });

    // Get current game state
    socket.on("get-game-state", async () => {
      if (!socket.currentRoom) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      try {
        const game = await Game.findOne({ roomId: socket.currentRoom });
        if (!game) {
          socket.emit("error", { message: "Game not found" });
          return;
        }

        // Emit the current game state
        socket.emit("game-state", {
          gameState: game.gameState,
          players: game.players,
        });
      } catch (error) {
        console.error("Get game state error:", error);
        socket.emit("error", { message: "Failed to get game state" });
      }
    });

    // Send chat message
    socket.on("send-chat", async (data) => {
      if (!socket.currentRoom) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      try {
        const { message } = data;

        if (!message || message.trim().length === 0) {
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        if (message.length > 500) {
          socket.emit("error", { message: "Message too long" });
          return;
        }

        const game = await Game.findOne({ roomId: socket.currentRoom });
        if (!game) {
          socket.emit("error", { message: "Game not found" });
          return;
        }

        if (!game.settings.chatEnabled) {
          socket.emit("error", { message: "Chat is disabled in this room" });
          return;
        }

        game.addChatMessage(socket.userId, socket.username, message.trim());
        await game.save();

        // Broadcast chat message
        io.to(socket.currentRoom).emit("chat-message", {
          id: game.chat[game.chat.length - 1].id,
          userId: socket.userId,
          username: socket.username,
          message: message.trim(),
          timestamp: new Date(),
          type: "user",
        });
      } catch (error) {
        console.error("Chat error:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Get available rooms
    socket.on("get-rooms", async () => {
      try {
        const rooms = await Game.find({
          $and: [
            { "gameState.status": { $in: ["waiting", "starting"] } },
            { status: { $nin: ["completed", "finished"] } },
            { "gameState.status": { $nin: ["completed", "finished"] } },
            // Only show rooms that are not full
            { $expr: { $lt: [{ $size: "$players" }, "$settings.maxPlayers"] } },
            // Not older than 24 hours
            { createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            // Not stale (updated within last 2 hours)
            { updatedAt: { $gt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
          ],
        })
          .limit(20)
          .select("roomId players gameState settings createdAt isPrivate")
          .sort({ createdAt: -1 })
          .exec();

        // Emit to the requesting client
        socket.emit("rooms-list", {
          rooms: rooms.map((game) => ({
            roomId: game.roomId,
            playerCount: game.players.length,
            maxPlayers: game.settings.maxPlayers,
            gameMode: game.settings.gameMode,
            boardSize: game.settings.boardSize,
            theme: game.settings.theme,
            status: game.gameState.status,
            isJoinable: game.players.length < game.settings.maxPlayers,
            isPrivate: game.isPrivate,
            hasPassword: game.isPrivate,
            settings: {
              powerUpsEnabled:
                game.settings.gameMode === "powerup-frenzy" ||
                game.settings.powerUpsEnabled,
              chatEnabled: game.settings.chatEnabled,
              isRanked: game.settings.isRanked,
            },
            players: game.players.map((p) => ({
              userId: p.userId,
              username: p.username,
              avatar: p.avatar,
              isHost: p.isHost,
            })),
            createdAt: game.createdAt,
          })),
        });

        // Also emit individual room-updated events for each room
        rooms.forEach((game) => {
          io.emit("room-updated", {
            roomId: game.roomId,
            playerCount: game.players.length,
            maxPlayers: game.settings.maxPlayers,
            isJoinable: game.players.length < game.settings.maxPlayers,
            gameMode: game.settings.gameMode,
            status: game.gameState.status,
            boardSize: game.settings.boardSize,
            theme: game.settings.theme,
            isPrivate: game.isPrivate,
            hasPassword: game.isPrivate,
            settings: {
              powerUpsEnabled:
                game.settings.gameMode === "powerup-frenzy" ||
                game.settings.powerUpsEnabled,
              chatEnabled: game.settings.chatEnabled,
              isRanked: game.settings.isRanked,
            },
            createdAt: game.createdAt,
          });
        });
      } catch (error) {
        console.error("Get rooms error:", error);
        socket.emit("error", { message: "Failed to fetch rooms" });
      }
    });

    // Create private room
    socket.on("create-private-room", async (data) => {
      try {
        const { password, settings = {} } = data;
        const roomId = generateRoomId();

        const gameSettings = {
          boardSize: settings.boardSize || "4x4",
          theme: settings.theme || "emojis",
          gameMode: settings.gameMode || "classic",
          timeLimit: settings.timeLimit || 300,
          maxPlayers: settings.maxPlayers || 2,
          powerUpsEnabled: settings.powerUpsEnabled !== false,
          chatEnabled: settings.chatEnabled !== false,
          isRanked: settings.isRanked !== false,
        };

        const game = new Game({
          roomId,
          settings: gameSettings,
          isPrivate: true,
          password: password || undefined,
        });

        // Add creator as first player
        game.addPlayer(socket.userId, socket.username, socket.data?.avatar);
        await game.save();

        socket.emit("private-room-created", {
          roomId,
          password,
          settings: gameSettings,
        });

        // Emit room-updated event for the new private room
        io.emit("room-updated", {
          roomId: game.roomId,
          playerCount: game.players.length,
          maxPlayers: game.settings.maxPlayers,
          isJoinable: game.players.length < game.settings.maxPlayers,
          gameMode: game.settings.gameMode,
          status: game.gameState.status,
          boardSize: game.settings.boardSize,
          theme: game.settings.theme,
          settings: {
            powerUpsEnabled:
              game.settings.gameMode === "powerup-frenzy" ||
              game.settings.powerUpsEnabled,
            chatEnabled: game.settings.chatEnabled,
            isRanked: game.settings.isRanked,
          },
          isPrivate: true,
          createdAt: game.createdAt,
        });

        console.log(`Private room ${roomId} created by ${socket.username}`);
      } catch (error) {
        console.error("Create private room error:", error);
        socket.emit("error", { message: "Failed to create private room" });
      }
    });

    // Turn continue event handling removed - this was causing duplicate extra turns
    // The server should only emit turn-continue events, not listen to them from clients

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.username} (${socket.id})`);

      // Clean up socket resources
      const cleanupFunctions = socketCleanup.get(socket.id);
      if (cleanupFunctions) {
        cleanupFunctions.forEach((cleanup) => {
          try {
            cleanup();
          } catch (error) {
            console.error("Error during socket cleanup:", error);
          }
        });
        socketCleanup.delete(socket.id);
      }

      if (socket.userId) {
        userSockets.delete(socket.userId);
        socketUsers.delete(socket.id);
        activePlayers.delete(socket.userId);
        userRooms.delete(socket.userId);

        // Update metrics
        updateMetrics.decrementSocketConnections();
        updateMetrics.incrementSocketDisconnections();
        updateMetrics.setActivePlayers(activePlayers.size);

        // Emit updated active players count to all clients
        io.emit("active-players", { count: activePlayers.size });
      }

      if (socket.currentRoom) {
        await handleLeaveRoom(socket, socket.currentRoom);
      }
    });
  });

  // Helper function to handle leaving room
  async function handleLeaveRoom(socket, roomId) {
    const releaseLock = await acquireOperationLock(roomId, "leave-room");

    try {
      // Remove user from room tracking
      userRooms.delete(socket.userId);

      // Get current game state before removing player
      const gameBeforeUpdate = await Game.findOne({ roomId });
      if (!gameBeforeUpdate) {
        console.log(`Game ${roomId} not found during leave room`);
        return;
      }

      // If active game engine exists, notify it about disconnect BEFORE removing player from database
      const gameEngine = activeGames.get(roomId);

      if (gameEngine) {
        try {
          await gameEngine.handlePlayerDisconnect(socket.userId);
        } catch (e) {
          console.error("Game engine disconnect handling error:", e);
        }
      }

      // 🔧 FIX: Use the game model's removePlayer method instead of $pull
      const game = await Game.findOne({ roomId });
      if (game) {
        // 🔧 BUG FIX: Emit player-left event BEFORE removing player from database
        // This ensures the event is sent while the player is still in the room

        // Get opponents BEFORE removal (including the leaving player)
        const opponentsBeforeRemoval = game.players.map((opponent) => ({
          userId: opponent.userId,
          username: opponent.username,
          avatar: opponent.avatar,
          score: opponent.score || 0,
          matches: opponent.matches || 0,
        }));

        console.log(
          `🔍 DEBUG: About to emit player-left event for room ${roomId}`
        );
        console.log(
          `🔍 DEBUG: Player leaving: ${socket.username} (${socket.userId})`
        );
        console.log(`🔍 DEBUG: Players before removal: ${game.players.length}`);
        console.log(
          `🔍 DEBUG: Players before removal:`,
          game.players.map((p) => p.username)
        );

        // Check if the socket is still in the room
        const roomClients = io.sockets.adapter.rooms.get(roomId);
        if (roomClients) {
          console.log(
            `🔍 DEBUG: Room ${roomId} has ${roomClients.size} connected clients`
          );
          console.log(`🔍 DEBUG: Connected clients:`, Array.from(roomClients));
        } else {
          console.log(`🔍 DEBUG: Room ${roomId} has no connected clients!`);
        }

        // Emit player left event BEFORE removing player from database
        const playerLeftData = {
          userId: socket.userId,
          username: socket.username,
          remainingPlayers: game.players.length - 1, // Will be remaining after removal
          opponents: opponentsBeforeRemoval.filter(
            (p) => p.userId !== socket.userId
          ), // Exclude leaving player
          gameStatus: game.gameState?.status || game.status,
        };

        // Primary emission to room
        io.to(roomId).emit("player-left", playerLeftData);

        // 🔧 BUG FIX: Also emit to individual players as fallback
        // This ensures all remaining players receive the event even if room emission fails
        const remainingPlayerIds = game.players
          .filter((p) => p.userId !== socket.userId)
          .map((p) => p.userId);

        console.log(
          `🔍 DEBUG: Emitting to individual players as fallback:`,
          remainingPlayerIds
        );

        remainingPlayerIds.forEach((playerId) => {
          const playerSocket = userSockets.get(playerId);
          if (playerSocket) {
            console.log(
              `🔍 DEBUG: Emitting player-left to individual player ${playerId}`
            );
            playerSocket.emit("player-left", playerLeftData);
          } else {
            console.log(`🔍 DEBUG: No socket found for player ${playerId}`);
          }
        });

        console.log(
          `🔍 DEBUG: Player-left event emitted to room ${roomId} and individual players`
        );

        // Now remove the player from database
        const playerRemoved = game.removePlayer(socket.userId);

        if (playerRemoved) {
          await game.save();

          // 🔧 NEW: Handle game deletion when last player leaves
          if (game.players.length === 0) {
            console.log(
              `Last player left game ${roomId} - deleting from database`
            );

            // Clean up game engine first
            const gameEngine = activeGames.get(roomId);
            if (gameEngine) {
              gameEngine.cleanup();
              activeGames.delete(roomId);
              console.log(`Cleaned up game engine for deleted game ${roomId}`);
            }

            // Delete the game from database
            try {
              await Game.findByIdAndDelete(game._id);
              console.log(`Successfully deleted game ${roomId} from database`);

              // Broadcast room deletion to all clients
              io.emit("room-deleted", roomId);
            } catch (error) {
              console.error(
                `Error deleting game ${roomId} from database:`,
                error
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error handling leave room for ${roomId}:`, error);
    } finally {
      releaseLock();
    }
  }

  // Helper function to add cleanup function to socket
  function addSocketCleanup(socketId, cleanupFunction) {
    const cleanupSet = socketCleanup.get(socketId);
    if (cleanupSet) {
      cleanupSet.add(cleanupFunction);
    }
  }

  // Helper function to acquire operation lock
  async function acquireOperationLock(roomId, operation, timeout = 5000) {
    const lockKey = `${roomId}-${operation}`;
    const existingLock = operationLocks.get(lockKey);

    if (existingLock) {
      // Wait for existing operation to complete
      await existingLock;
      return () => {}; // Return empty function if no lock needed
    }

    let resolveLock;
    const lockPromise = new Promise((resolve) => {
      resolveLock = resolve;
    });

    operationLocks.set(lockKey, lockPromise);

    // Set timeout to prevent deadlocks
    setTimeout(() => {
      if (operationLocks.get(lockKey) === lockPromise) {
        operationLocks.delete(lockKey);
        resolveLock();
      }
    }, timeout);

    // Return a function that releases the lock
    return () => {
      const currentLock = operationLocks.get(lockKey);
      if (currentLock === lockPromise) {
        operationLocks.delete(lockKey);
        resolveLock();
      }
    };
  }

  // Helper function to release operation lock
  function releaseOperationLock(roomId, operation) {
    const lockKey = `${roomId}-${operation}`;
    const lockPromise = operationLocks.get(lockKey);
    if (lockPromise) {
      operationLocks.delete(lockKey);
      // Resolve the promise to release waiting operations
      lockPromise.then((resolve) => resolve());
    }
  }

  // Helper function to generate room ID
  function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

// Clean up inactive games periodically
setInterval(async () => {
  try {
    // Clean up empty rooms after 10 minutes
    const emptyRoomCutoffTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes

    // Clean up playing/waiting games after 1 hour
    const inactiveGameCutoffTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour

    // Clean up empty rooms (0 players)
    const emptyRooms = await Game.find({
      $or: [
        {
          "gameState.status": { $in: ["waiting", "starting"] },
          updatedAt: { $lt: emptyRoomCutoffTime },
          players: { $size: 0 }, // Empty players array
        },
        {
          "gameState.status": { $in: ["waiting", "starting"] },
          updatedAt: { $lt: emptyRoomCutoffTime },
          "players.0": { $exists: false }, // No players
        },
      ],
    });

    if (emptyRooms.length > 0) {
      console.log(
        `Found ${emptyRooms.length} empty rooms to cleanup (10 minutes old)`
      );
    }

    for (const game of emptyRooms) {
      try {
        console.log(
          `Cleaning up empty room: ${game.roomId} (status: ${game.gameState.status}, players: ${game.players.length})`
        );
        await Game.findByIdAndDelete(game._id);
        const gameEngine = activeGames.get(game.roomId);
        if (gameEngine) {
          gameEngine.cleanup();
          activeGames.delete(game.roomId);
        }
        io.emit("room-deleted", game.roomId);
      } catch (error) {
        console.error(`Error deleting empty room ${game.roomId}:`, error);
      }
    }

    // Clean up inactive games (playing/waiting for too long)
    const inactiveGames = await Game.find({
      $or: [
        {
          "gameState.status": { $in: ["waiting", "starting", "playing"] },
          updatedAt: { $lt: inactiveGameCutoffTime },
        },
      ],
    });

    if (inactiveGames.length > 0) {
      console.log(
        `Found ${inactiveGames.length} inactive games to cleanup (1 hour old)`
      );
    }

    for (const game of inactiveGames) {
      try {
        console.log(
          `Cleaning up inactive game: ${game.roomId} (status: ${game.gameState.status}, players: ${game.players.length})`
        );

        // Mark game as completed instead of deleting
        game.status = "completed";
        game.gameState.status = "finished";
        game.endedAt = new Date();
        await game.save();

        const gameEngine = activeGames.get(game.roomId);
        if (gameEngine) {
          gameEngine.cleanup();
          activeGames.delete(game.roomId);
        }
        io.emit("room-deleted", game.roomId);
      } catch (error) {
        console.error(`Error cleaning up inactive game ${game.roomId}:`, error);
      }
    }

    // Clean up completed games after 10 days
    const completedCutoffTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); //10 days
    const completedGames = await Game.find({
      $or: [{ status: "completed" }, { "gameState.status": "finished" }],
      updatedAt: { $lt: completedCutoffTime },
    });

    if (completedGames.length > 0) {
      console.log(
        `Found ${completedGames.length} old completed games to cleanup`
      );
    }

    for (const game of completedGames) {
      try {
        console.log(`Cleaning up old completed game: ${game.roomId}`);
        await Game.findByIdAndDelete(game._id);
        const gameEngine = activeGames.get(game.roomId);
        if (gameEngine) {
          gameEngine.cleanup();
          activeGames.delete(game.roomId);
        }
        io.emit("room-deleted", game.roomId);
      } catch (error) {
        console.error(`Error deleting completed game ${game.roomId}:`, error);
      }
    }

    // Clean up active games map - only remove if game doesn't exist in DB
    for (const [roomId, gameEngine] of activeGames) {
      try {
        const game = await Game.findOne({ roomId });
        if (!game) {
          console.log(
            `Game ${roomId} not found in DB, cleaning up from active games`
          );
          gameEngine.cleanup();
          activeGames.delete(roomId);
          io.emit("room-deleted", roomId);
        }
      } catch (error) {
        console.error(`Error checking game ${roomId} for cleanup:`, error);
        // If we can't find the game, remove it from active games
        gameEngine.cleanup();
        activeGames.delete(roomId);
      }
    }
  } catch (error) {
    console.error("Game cleanup error:", error);
  }
}, 30 * 60 * 1000); // Every 30 minutes (increased from 10 minutes)

module.exports = { initializeSocket };
