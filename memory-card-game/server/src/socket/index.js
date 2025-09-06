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

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.username} (${socket.id})`);

    // if (socket.id) {
    //   try {
    //     const isBlocked = await antiCheatSystem.isUserBlocked(socket.userId);
    //     if (isBlocked) {
    //       console.warn(
    //         `🚫 Blocked user ${socket.username} (${socket.userId}) attempted to connect`
    //       );
    //       socket.emit("error", {
    //         message: "Your account has been blocked due to suspicious activity",
    //       });
    //       socket.disconnect(true);
    //       return;
    //     }
    //   } catch (error) {
    //     console.error(
    //       `Error checking if user ${socket.userId} is blocked:`,
    //       error
    //     );
    //   }
    // }

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

      console.log(
        `User ${socket.username} connected. Active players count: ${activePlayers.size}`
      );
      // Emit active players count to all clients with a small delay to ensure client is ready
      setTimeout(() => {
        io.emit("active-players", { count: activePlayers.size });
      }, 50);
    }

    //socket listen to get active players count
    socket.on("get-active-players", () => {
      console.log(
        `Active players requested by ${socket.username}, current count: ${activePlayers.size}`
      );
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

        // Anti-cheat validation: Check if user is blocked - Made async
        if (socket.userId) {
          try {
            const isBlocked = await antiCheatSystem.isUserBlocked(
              socket.userId
            );
            if (isBlocked) {
              console.warn(
                `🚫 Blocked user ${socket.username} (${socket.userId}) attempted to join room`
              );
              socket.emit("error", {
                message:
                  "Your account has been blocked due to suspicious activity",
              });
              socket.emit("join-room-error", {
                message:
                  "Your account has been blocked due to suspicious activity",
              });
              return;
            }
          } catch (error) {
            console.error(
              `Error checking if user ${socket.userId} is blocked:`,
              error
            );
            // Continue with the request if blocking check fails
          }
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

        // Check if this is a reconnection (user was in grace period)
        const oldSocketId = userSockets.get(socket.userId);
        if (oldSocketId && oldSocketId !== socket.id) {
          console.log(
            `User ${socket.username} reconnecting, cancelling grace period`
          );

          // Cancel any pending disconnect processing for this user
          const cleanupFunction = socketCleanup.get(socket.userId);
          if (cleanupFunction) {
            console.log(
              `Cancelling grace period timeout for user ${socket.userId}`
            );
            try {
              cleanupFunction();
            } catch (error) {
              console.error("Error during reconnection cleanup:", error);
            }
            socketCleanup.delete(socket.userId);
          }

          // Disconnect the old socket if it still exists
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.disconnect(true);
          }
        }

        // Check if this is a late reconnection attempt (user was marked as left early)
        // IMPORTANT: Game engine adds users to opponentsForHistory immediately on disconnect
        // But we should only block reconnection if they were actually removed after grace period
        // So we check: user is in opponentsForHistory AND NOT in active players list
        const existingGame = await Game.findOne({ roomId });
        if (existingGame) {
          const isStillActivePlayer = existingGame.players.find(
            (p) => p.userId === socket.userId
          );

          const leftEarlyPlayer =
            existingGame.gameState.opponentsForHistory?.find(
              (opp) => opp.userId === socket.userId && opp.leftEarly
            );

          // Only block if user is in opponentsForHistory AND not in active players
          // This means they were actually removed after grace period expired
          if (leftEarlyPlayer && !isStillActivePlayer) {
            console.log(
              `User ${socket.username} attempting late reconnection to room ${roomId} - BLOCKED (grace period expired)`
            );

            // Block late reconnection - redirect to lobby
            socket.emit("error", {
              message:
                "You left the game and cannot rejoin. Redirecting to lobby...",
              code: "LATE_RECONNECTION_BLOCKED",
              redirectToLobby: true,
            });

            // Emit redirect event to client
            socket.emit("redirect-to-lobby", {
              reason: "late_reconnection_blocked",
              message:
                "You cannot rejoin a game after leaving. Please find a new game.",
            });

            return; // Exit early, don't process normal join logic
          }
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
                  avatar: socket.data.avatar,
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

        // Check if this was a reconnection and notify other players
        if (oldSocketId && oldSocketId !== socket.id) {
          console.log(`User ${socket.username} reconnected to room ${roomId}`);
          // Notify other players about reconnection
          socket.to(roomId).emit("player-reconnected", {
            playerId: socket.userId,
            playerName: socket.username,
            message: `${socket.username} has reconnected`,
          });
        }

        // Notify other players
        socket.to(roomId).emit("player-joined", {
          player: {
            userId: socket.userId,
            username: socket.username,
            avatar: socket.data.avatar,
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
        console.log(
          `🔍 SERVER: Processing leave-room request from ${socket.username}`
        );
        await handleLeaveRoom(socket, socket.currentRoom);
        // Emit confirmation to the leaving player
        socket.emit("leave-room-confirmed", { roomId: socket.currentRoom });
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

      // Anti-cheat validation: Check if user is blocked - Made async
      if (socket.userId) {
        try {
          const isBlocked = await antiCheatSystem.isUserBlocked(socket.userId);
          if (isBlocked) {
            console.warn(
              `🚫 Blocked user ${socket.username} (${socket.userId}) attempted to flip card`
            );
            socket.emit("error", {
              message:
                "Your account has been blocked due to suspicious activity",
            });
            return;
          }
        } catch (error) {
          console.error(
            `Error checking if user ${socket.userId} is blocked:`,
            error
          );
          // Continue with the request if blocking check fails
        }
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

      // Anti-cheat validation: Check if user is blocked - Made async
      if (socket.userId) {
        try {
          const isBlocked = await antiCheatSystem.isUserBlocked(socket.userId);
          if (isBlocked) {
            console.warn(
              `🚫 Blocked user ${socket.username} (${socket.userId}) attempted to use power-up`
            );
            socket.emit("error", {
              message:
                "Your account has been blocked due to suspicious activity",
            });
            return;
          }
        } catch (error) {
          console.error(
            `Error checking if user ${socket.userId} is blocked:`,
            error
          );
          // Continue with the request if blocking check fails
        }
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
      console.log(`Active players before disconnect: ${activePlayers.size}`);

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

      // Also clean up any grace period timeout stored under userId
      if (socket.userId) {
        const userCleanupFunction = socketCleanup.get(socket.userId);
        if (userCleanupFunction) {
          try {
            userCleanupFunction();
          } catch (error) {
            console.error("Error during user cleanup:", error);
          }
          socketCleanup.delete(socket.userId);
        }
      }

      if (socket.userId) {
        // Store user info for potential reconnection
        const userInfo = {
          userId: socket.userId,
          username: socket.username,
          roomId: userRooms.get(socket.userId) || socket.currentRoom,
          disconnectedAt: new Date(),
          socketId: socket.id,
        };

        // Only apply grace period if user is in a game room
        if (userInfo.roomId) {
          console.log(
            `User ${socket.username} disconnected from game room ${userInfo.roomId} - applying 60 second grace period`
          );

          // Add grace period for mobile reconnection (60 seconds) - ONLY for game rooms
          const gracePeriodTimeout = setTimeout(async () => {
            console.log(
              `Grace period expired for user ${socket.username}, processing disconnect`
            );

            // Remove from active tracking after grace period
            userSockets.delete(socket.userId);
            socketUsers.delete(socket.id);
            activePlayers.delete(socket.userId);
            userRooms.delete(socket.userId);

            // Update metrics
            updateMetrics.decrementSocketConnections();
            updateMetrics.incrementSocketDisconnections();
            updateMetrics.setActivePlayers(activePlayers.size);

            // Emit updated active players count to all clients with a small delay
            setTimeout(() => {
              io.emit("active-players", { count: activePlayers.size });
            }, 50);

            // Handle game room disconnect after grace period
            await handleLeaveRoomAfterGracePeriod(userInfo);
          }, 60000); // 60 second grace period (1 minute)

          // Store timeout for potential cancellation on reconnection
          // Use userId as key instead of socket.id since socket.id changes on reconnection
          socketCleanup.set(socket.userId, () => {
            clearTimeout(gracePeriodTimeout);
          });
        } else {
          // User is in lobby - remove immediately (no grace period)
          console.log(
            `User ${socket.username} disconnected from lobby - removing immediately (no grace period)`
          );

          // Remove from active tracking immediately
          userSockets.delete(socket.userId);
          socketUsers.delete(socket.id);
          activePlayers.delete(socket.userId);
          userRooms.delete(socket.userId);

          // Update metrics
          updateMetrics.decrementSocketConnections();
          updateMetrics.incrementSocketDisconnections();
          updateMetrics.setActivePlayers(activePlayers.size);

          // Emit updated active players count to all clients with a small delay
          setTimeout(() => {
            io.emit("active-players", { count: activePlayers.size });
          }, 50);
        }
      }
    });
  });

  // Helper function to handle leaving room after grace period
  async function handleLeaveRoomAfterGracePeriod(userInfo) {
    const { userId, username, roomId } = userInfo;

    try {
      console.log(
        `Processing delayed disconnect for user ${username} from room ${roomId}`
      );

      // Check if user has reconnected in the meantime
      if (userSockets.has(userId)) {
        console.log(
          `User ${username} reconnected, cancelling disconnect processing`
        );
        return;
      }

      // Get the game engine and handle disconnect
      const gameEngine = activeGames.get(roomId);
      if (gameEngine) {
        try {
          await gameEngine.handlePlayerDisconnect(userId);
        } catch (e) {
          console.error("Game engine disconnect handling error:", e);
        }
      }

      // Remove player from database
      const game = await Game.findOne({ roomId });
      if (game) {
        // Check if player is still in the game (might have been removed by manual leave)
        const playerStillInGame = game.players.find((p) => p.userId === userId);
        if (!playerStillInGame) {
          console.log(
            `Player ${username} already removed from game ${roomId}, skipping grace period processing`
          );
          return;
        }

        // Get opponents BEFORE removal (including the leaving player)
        const opponentsBeforeRemoval = game.players.map((opponent) => ({
          userId: opponent.userId,
          username: opponent.username,
          score: opponent.score || 0,
          matches: opponent.matches || 0,
          leftEarly:
            opponent.userId === userId ? true : opponent.leftEarly || false,
          disconnectedAt:
            opponent.userId === userId ? new Date() : opponent.disconnectedAt,
        }));

        // Emit player left event BEFORE removing player from database
        io.to(roomId).emit("player-left", {
          roomId,
          userId: userId,
          username: username,
          opponents: opponentsBeforeRemoval,
          reason: "disconnected_after_grace_period",
        });

        // Remove player from database with leftEarly flag
        const playerRemoved = await game.removePlayer(userId, true); // true = leftEarly
        if (playerRemoved) {
          await game.save();
          console.log(
            `Player ${username} removed from room ${roomId} after grace period (leftEarly: true)`
          );

          // Handle game completion when only one player remains after grace period
          if (game.players.length === 1) {
            console.log(
              `Only one player remains in game ${roomId} after grace period - declaring winner`
            );

            // Get the game engine and end the game with the remaining player as winner
            const gameEngine = activeGames.get(roomId);
            if (gameEngine) {
              try {
                await gameEngine.endGame("last_player_winner");
                console.log(
                  `Game ${roomId} ended after grace period - remaining player declared winner`
                );
              } catch (error) {
                console.error(
                  `Error ending game ${roomId} after grace period:`,
                  error
                );
              }
            } else {
              // If no game engine, manually end the game
              console.log(
                `No game engine found for ${roomId} after grace period, manually ending game`
              );
              game.gameState.status = "finished";
              game.status = "completed";
              game.endedAt = new Date();
              game.completionReason = "opponents_left";
              game.winner = game.players[0].username;
              await game.save();

              // Emit game over event
              io.to(roomId).emit("game-over", {
                reason: "last_player_winner",
                winners: game.players,
                finalStats: game.players.map((p) => ({
                  userId: p.userId,
                  username: p.username,
                  score: p.score || 0,
                  matches: p.matches || 0,
                  memoryMeter: p.memoryMeter || 0,
                })),
              });
            }
          } else if (game.players.length === 0) {
            console.log(
              `Last player left game ${roomId} after grace period - deleting from database`
            );

            // Clean up game engine first
            const gameEngine = activeGames.get(roomId);
            if (gameEngine) {
              gameEngine.cleanup();
              activeGames.delete(roomId);
              console.log(
                `Cleaned up game engine for deleted game ${roomId} after grace period`
              );
            }

            // Delete the game from database
            try {
              await Game.findByIdAndDelete(game._id);
              console.log(
                `Successfully deleted game ${roomId} from database after grace period`
              );

              // Broadcast room deletion to all clients
              io.emit("room-deleted", roomId);
            } catch (error) {
              console.error(
                `Error deleting game ${roomId} from database after grace period:`,
                error
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(
        `Error handling delayed disconnect for user ${username}:`,
        error
      );
    }
  }

  // Helper function to handle leaving room
  async function handleLeaveRoom(socket, roomId) {
    const releaseLock = await acquireOperationLock(roomId, "leave-room");

    try {
      // Set user's room to null instead of deleting from userRooms
      // This prevents them from being treated as a disconnected lobby user
      userRooms.set(socket.userId, null);

      // Get current game state before removing player
      const game = await Game.findOne({ roomId });
      if (!game) {
        console.log(`Game ${roomId} not found during leave room`);
        return;
      }

      // Check if player is still in the game
      const playerStillInGame = game.players.find(
        (p) => p.userId === socket.userId
      );
      if (!playerStillInGame) {
        console.log(
          `Player ${socket.username} already removed from game ${roomId}, skipping manual leave processing`
        );
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

      // Get opponents BEFORE removal (including the leaving player)
      const opponentsBeforeRemoval = game.players.map((opponent) => ({
        userId: opponent.userId,
        username: opponent.username,
        avatar: opponent.avatar,
        score: opponent.score || 0,
        matches: opponent.matches || 0,
      }));

      console.log(
        `🔍 DEBUG: Manual leave - Player ${socket.username} (${socket.userId}) leaving room ${roomId}`
      );

      // Emit player left event BEFORE removing player from database
      const playerLeftData = {
        userId: socket.userId,
        username: socket.username,
        remainingPlayers: game.players.length - 1, // Will be remaining after removal
        opponents: opponentsBeforeRemoval.filter(
          (p) => p.userId !== socket.userId
        ), // Exclude leaving player
        gameStatus: game.gameState?.status || game.status,
        reason: "manual_leave",
      };

      // Primary emission to room
      io.to(roomId).emit("player-left", playerLeftData);

      // Also emit to individual players as fallback
      const remainingPlayerIds = game.players
        .filter((p) => p.userId !== socket.userId)
        .map((p) => p.userId);

      remainingPlayerIds.forEach((playerId) => {
        const playerSocketId = userSockets.get(playerId);
        if (playerSocketId) {
          const playerSocket = io.sockets.sockets.get(playerSocketId);
          if (playerSocket) {
            playerSocket.emit("player-left", playerLeftData);
          }
        }
      });

      // Now remove the player from database (manual leave = leftEarly)
      const playerRemoved = game.removePlayer(socket.userId, true);

      if (playerRemoved) {
        await game.save();
        console.log(`Player ${socket.username} manually left room ${roomId}`);

        // Handle game completion when only one player remains
        if (game.players.length === 1) {
          console.log(
            `Only one player remains in game ${roomId} - declaring winner`
          );

          // Get the game engine and end the game with the remaining player as winner
          const gameEngine = activeGames.get(roomId);
          if (gameEngine) {
            try {
              await gameEngine.endGame("last_player_winner");
              console.log(
                `Game ${roomId} ended - remaining player declared winner`
              );
            } catch (error) {
              console.error(`Error ending game ${roomId}:`, error);
            }
          } else {
            // If no game engine, manually end the game
            console.log(
              `No game engine found for ${roomId}, manually ending game`
            );
            game.gameState.status = "finished";
            game.status = "completed";
            game.endedAt = new Date();
            game.completionReason = "opponents_left";
            game.winner = game.players[0].username;
            await game.save();

            // Emit game over event
            io.to(roomId).emit("game-over", {
              reason: "last_player_winner",
              winners: game.players,
              finalStats: game.players.map((p) => ({
                userId: p.userId,
                username: p.username,
                score: p.score || 0,
                matches: p.matches || 0,
                memoryMeter: p.memoryMeter || 0,
              })),
            });
          }
        } else if (game.players.length === 0) {
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
