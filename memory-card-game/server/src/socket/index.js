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
const disconnectedUsers = new Map();

function initializeSocket(io) {
  io.use(authenticateSocket);

  const cleanupOldGames = async () => {
    try {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

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
            ` Marking stale game ${game.roomId} as completed (status: ${game.gameState.status}, updated: ${game.updatedAt})`
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
            console.log(
              `🧹 Cleaned up game engine for stale game ${game.roomId}`
            );
          }

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
          ` Marked ${longWaitingGames.length} long-waiting games as completed`
        );
      }

      console.log(" Database cleanup completed");
    } catch (error) {
      console.error(" Error cleaning up old games:", error);
    }
  };

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

      updateMetrics.incrementSocketConnections();
      updateMetrics.setActivePlayers(activePlayers.size);

      console.log(
        `User ${socket.username} connected. Active players count: ${activePlayers.size}`
      );

      setTimeout(() => {
        io.emit("active-players", { count: activePlayers.size });
      }, 50);
    }

    socket.on("get-active-players", () => {
      io.emit("active-players", { count: activePlayers.size });
    });

    socket.on("join-room", async (data) => {
      try {
        const { roomId, password } = data;

        if (socket.userId) {
          try {
            const isBlocked = await antiCheatSystem.isUserBlocked(
              socket.userId
            );
            if (isBlocked) {
              console.warn(
                ` Blocked user ${socket.username} (${socket.userId}) attempted to join room`
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
          }
        }

        if (!roomId) {
          console.log("Join room error: Room ID is required");
          socket.emit("error", { message: "Room ID is required" });
          socket.emit("join-room-error", { message: "Room ID is required" });
          return;
        }

        socket.emit("join-room-received", { roomId });

        const currentRoom = userRooms.get(socket.userId);
        if (currentRoom && currentRoom !== roomId) {
          await handleLeaveRoom(socket, currentRoom);
        }

        const disconnectedUser = disconnectedUsers.get(socket.userId);
        console.log(`Reconnection check for user ${socket.userId}:`, {
          hasDisconnectedUser: !!disconnectedUser,
          disconnectedSocketId: disconnectedUser?.socketId,
          currentSocketId: socket.id,
          isReconnection:
            disconnectedUser && disconnectedUser.socketId !== socket.id,
          disconnectedUsersKeys: Array.from(disconnectedUsers.keys()),
        });

        if (disconnectedUser && disconnectedUser.socketId !== socket.id) {
          console.log(
            `User ${socket.username} reconnecting, cancelling grace period`
          );

          const cleanupFunction = socketCleanup.get(socket.userId);

          if (cleanupFunction) {
            try {
              cleanupFunction();
            } catch (error) {
              console.error("Error during reconnection cleanup:", error);
            }
            socketCleanup.delete(socket.userId);
          } else {
          }

          const oldSocket = io.sockets.sockets.get(disconnectedUser.socketId);
          if (oldSocket) {
            oldSocket.disconnect(true);
          }

          userRooms.set(socket.userId, roomId);

          socket.isReconnecting = true;

          disconnectedUsers.delete(socket.userId);
        }

        const existingGame = await Game.findOne({ roomId });
        if (existingGame) {
          const isStillActivePlayer = existingGame.players.find(
            (p) => p.userId === socket.userId
          );

          if (
            existingGame.gameState.status === "finished" ||
            existingGame.gameState.status === "completed"
          ) {
            socket.emit("error", {
              message: "This game has ended. Redirecting to lobby...",
              code: "GAME_ENDED",
              redirectToLobby: true,
            });

            socket.emit("redirect-to-lobby", {
              reason: "game_ended",
              message: "This game has ended. Please find a new game.",
            });

            return;
          }

          if (
            !isStillActivePlayer &&
            (existingGame.gameState.status === "waiting" ||
              existingGame.gameState.status === "starting" ||
              existingGame.gameState.status === "playing")
          ) {
            console.log(
              `User ${socket.username} rejoining active game ${roomId} - ALLOWED (game status: ${existingGame.gameState.status})`
            );
          }
        }

        if (socket.isReconnecting) {
          try {
            const existingGame = await Game.findOne({ roomId });
            console.log(`Found existing game for reconnection:`, {
              roomId,
              gameExists: !!existingGame,
              playerCount: existingGame?.players?.length || 0,
              gameState: existingGame?.gameState?.status,
            });

            if (existingGame) {
              const playerInGame = existingGame.players.find(
                (p) => p.userId === socket.userId
              );

              if (playerInGame) {
                socket.join(roomId);
                socket.currentRoom = roomId;
                userRooms.set(socket.userId, roomId);

                const roomJoinedData = {
                  roomId,
                  game: {
                    roomId: existingGame.roomId,
                    players: existingGame.players,
                    gameState: existingGame.gameState,
                    settings: existingGame.settings,
                    chat: existingGame.chat.slice(-50),
                  },
                  message: "Reconnected to existing game",
                };

                socket.emit("room-joined", roomJoinedData);

                socket.to(roomId).emit("player-reconnected", {
                  playerId: socket.userId,
                  playerName: socket.username,
                  message: `${socket.username} has reconnected`,
                });

                socket.isReconnecting = false;

                return;
              } else {
                console.log(
                  `Player ${socket.username} not found in game ${roomId} during reconnection`
                );
              }
            } else {
              console.log(`Game ${roomId} not found during reconnection`);
            }
          } catch (error) {
            console.error(
              `Error during reconnection processing for user ${socket.username}:`,
              error
            );
          }
        }

        if (currentRoom === roomId) {
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

        let game = await Game.findOne({ roomId });

        if (!game) {
          game = new Game({
            roomId,
            hostId: socket.userId,
            settings: {
              boardSize: "4x4",
              theme: "emojis",
              gameMode: "classic",
              timeLimit: 300,
              maxPlayers: 2,
              powerUpsEnabled: false,
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

        const existingPlayerInDB = game.players.find(
          (p) => p.userId === socket.userId
        );

        if (
          !existingPlayerInDB &&
          game.isPrivate &&
          game.password &&
          game.hostId !== socket.userId &&
          game.password.trim() !== (password || "").trim()
        ) {
          socket.emit("error", { message: "Invalid room password" });
          socket.emit("join-room-error", { message: "Invalid room password" });
          return;
        }

        // Add player to the game (actual push to DB)
        try {
          if (existingPlayerInDB) {
            console.log(
              `User ${socket.username} already exists in game ${roomId}`
            );

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

          const freshGame = await Game.findOne({ roomId });
          if (freshGame.players.find((p) => p.userId === socket.userId)) {
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

        socket.join(roomId);
        socket.currentRoom = roomId;
        userRooms.set(socket.userId, roomId);

        if (!activeGames.has(roomId)) {
          const { GameEngine } = require("./gameEngine.js");
          const gameEngine = new GameEngine(roomId, io);
          activeGames.set(roomId, gameEngine);
          console.log(`Created game engine for room ${roomId}`);
        }

        try {
          const playerIds = game.players.map((p) => p.userId);
          const uniquePlayerIds = [...new Set(playerIds)];

          if (playerIds.length !== uniquePlayerIds.length) {
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
          }
        } catch (error) {
          console.error("Error cleaning up duplicate players:", error);
        }

        socket.emit("room-joined", {
          roomId,
          game,
          message: "Successfully joined game",
        });

        if (socket.isReconnecting) {
          socket.to(roomId).emit("player-reconnected", {
            playerId: socket.userId,
            playerName: socket.username,
            message: `${socket.username} has reconnected`,
          });

          socket.isReconnecting = false;
        }

        socket.to(roomId).emit("player-joined", {
          player: {
            userId: socket.userId,
            username: socket.username,
            avatar: socket.data.avatar,
            isReady: true,
            isReconnecting: false,
          },
        });

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

        if (
          game.players.length >= game.settings.maxPlayers &&
          game.gameState.status === "waiting"
        ) {
          try {
            await Game.findOneAndUpdate(
              { roomId },
              {
                $set: {
                  "players.$[].isReady": true,
                },
              }
            );

            let gameEngine = activeGames.get(roomId);
            if (!gameEngine) {
              const { GameEngine } = require("./gameEngine.js");
              gameEngine = new GameEngine(roomId, io);
              activeGames.set(roomId, gameEngine);
            }

            await gameEngine.initialize();

            setTimeout(async () => {
              try {
                await gameEngine.startGame();
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
      } catch (error) {
        const errorMessage = error.message || "Failed to join room";

        socket.emit("error", { message: errorMessage });
        socket.emit("join-room-error", { message: errorMessage });
      }
    });

    socket.on("leave-room", async () => {
      if (socket.currentRoom) {
        await handleLeaveRoom(socket, socket.currentRoom);

        socket.emit("leave-room-confirmed", { roomId: socket.currentRoom });
      }
    });

    socket.on("start-game", async () => {
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

        const allReady = game.players.every((p) => p.isReady);
        if (!allReady) {
          socket.emit("error", { message: "All players must be ready" });
          return;
        }

        let gameEngine = activeGames.get(socket.currentRoom);
        if (!gameEngine) {
          console.log("Creating new game engine...");
          gameEngine = new GameEngine(socket.currentRoom, io);
          activeGames.set(socket.currentRoom, gameEngine);
        }

        await gameEngine.initialize();

        await gameEngine.startGame();
      } catch (error) {
        socket.emit("error", {
          message: "Failed to start game: " + error.message,
        });
      }
    });

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

        io.to(socket.currentRoom).emit("game-state", {
          players: game.players,
          gameState: game.gameState,
        });

        if (game.gameState.status === "starting") {
          const gameEngine = activeGames.get(socket.currentRoom);
          if (gameEngine) {
            setTimeout(async () => {
              try {
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

    socket.on("flip-card", async (data) => {
      if (!socket.currentRoom) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      if (socket.userId) {
        try {
          const isBlocked = await antiCheatSystem.isUserBlocked(socket.userId);
          if (isBlocked) {
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

    socket.on("use-powerup", async (data) => {
      if (!socket.currentRoom) {
        socket.emit("error", { message: "Not in a room" });
        return;
      }

      if (socket.userId) {
        try {
          const isBlocked = await antiCheatSystem.isUserBlocked(socket.userId);
          if (isBlocked) {
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
        }
      }

      const { powerUpType, target } = data;

      const gameEngine = activeGames.get(socket.currentRoom);

      if (!gameEngine) {
        socket.emit("error", { message: "Game not active" });
        return;
      }

      try {
        await gameEngine.usePowerUp(socket.userId, powerUpType, target);
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

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

        socket.emit("game-state", {
          gameState: game.gameState,
          players: game.players,
        });
      } catch (error) {
        console.error("Get game state error:", error);
        socket.emit("error", { message: "Failed to get game state" });
      }
    });

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

        game.addPlayer(socket.userId, socket.username, socket.data?.avatar);
        await game.save();

        socket.emit("private-room-created", {
          roomId,
          password,
          settings: gameSettings,
        });

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
      } catch (error) {
        socket.emit("error", { message: "Failed to create private room" });
      }
    });

    socket.on("disconnect", async () => {
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

      socket.isReconnecting = false;

      if (socket.userId) {
        const disconnectedUserInfo = {
          socketId: socket.id,
          username: socket.username,
          roomId: socket.currentRoom || userRooms.get(socket.userId),
          disconnectedAt: new Date(),
        };
        disconnectedUsers.set(socket.userId, disconnectedUserInfo);

        const userInfo = {
          userId: socket.userId,
          username: socket.username,
          roomId: socket.currentRoom || userRooms.get(socket.userId),
          disconnectedAt: new Date(),
          socketId: socket.id,
        };

        if (userInfo.roomId) {
          const gracePeriodTimeout = setTimeout(async () => {
            userSockets.delete(socket.userId);
            socketUsers.delete(socket.id);
            activePlayers.delete(socket.userId);
            userRooms.delete(socket.userId);
            disconnectedUsers.delete(socket.userId);

            updateMetrics.decrementSocketConnections();
            updateMetrics.incrementSocketDisconnections();
            updateMetrics.setActivePlayers(activePlayers.size);

            setTimeout(() => {
              io.emit("active-players", { count: activePlayers.size });
            }, 50);

            await handleLeaveRoomAfterGracePeriod(userInfo);
          }, 60000);
          const cleanupFunction = () => {
            clearTimeout(gracePeriodTimeout);
          };
          socketCleanup.set(socket.userId, cleanupFunction);
        } else {
          userSockets.delete(socket.userId);
          socketUsers.delete(socket.id);
          activePlayers.delete(socket.userId);
          userRooms.delete(socket.userId);
          disconnectedUsers.delete(socket.userId);

          updateMetrics.decrementSocketConnections();
          updateMetrics.incrementSocketDisconnections();
          updateMetrics.setActivePlayers(activePlayers.size);

          setTimeout(() => {
            io.emit("active-players", { count: activePlayers.size });
          }, 50);
        }
      }
    });
  });

  async function handleLeaveRoomAfterGracePeriod(userInfo) {
    const { userId, username, roomId } = userInfo;

    try {
      // Check if user has reconnected in the meantime
      if (userSockets.has(userId)) {
        return;
      }

      const game = await Game.findOne({ roomId });
      if (!game) {
        return;
      }

      const playerStillInGame = game.players.find((p) => p.userId === userId);

      if (playerStillInGame) {
        const hasActiveSocket = userSockets.has(userId);
        if (hasActiveSocket) {
          return;
        } else {
        }
      }

      const gameEngine = activeGames.get(roomId);
      if (gameEngine) {
        try {
          await gameEngine.handlePlayerDisconnect(userId);
        } catch (e) {
          console.error("Game engine disconnect handling error:", e);
        }
      }

      if (game) {
        const playerStillInGame = game.players.find((p) => p.userId === userId);
        if (!playerStillInGame) {
          return;
        }

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

        io.to(roomId).emit("player-left", {
          roomId,
          userId: userId,
          username: username,
          opponents: opponentsBeforeRemoval,
          reason: "disconnected_after_grace_period",
        });

        const playerRemoved = await game.removePlayer(userId, true);
        if (playerRemoved) {
          try {
            await game.save();
          } catch (saveError) {
            if (saveError.name === "VersionError") {
              return;
            } else {
              throw saveError; // Re-throw if it's not a VersionError
            }
          }

          if (game.players.length === 1) {
            const gameEngine = activeGames.get(roomId);
            if (gameEngine) {
              try {
                await gameEngine.endGame("last_player_winner");
              } catch (error) {
                console.error(
                  `Error ending game ${roomId} after grace period:`,
                  error
                );
              }
            } else {
              game.gameState.status = "finished";
              game.status = "completed";
              game.endedAt = new Date();
              game.completionReason = "opponents_left";
              game.winner = game.players[0].username;
              try {
                await game.save();
              } catch (saveError) {
                if (saveError.name === "VersionError") {
                  return;
                } else {
                  throw saveError;
                }
              }

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
            const gameEngine = activeGames.get(roomId);
            if (gameEngine) {
              gameEngine.cleanup();
              activeGames.delete(roomId);
            }

            // Delete the game from database
            try {
              await Game.findByIdAndDelete(game._id);

              // Broadcast room deletion to all clients
              io.emit("room-deleted", roomId);
            } catch (error) {}
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

  async function handleLeaveRoom(socket, roomId) {
    const releaseLock = await acquireOperationLock(roomId, "leave-room");

    try {
      const currentSocketId = userSockets.get(socket.userId);
      if (currentSocketId && currentSocketId !== socket.id) {
        return;
      }

      userRooms.set(socket.userId, null);

      const game = await Game.findOne({ roomId });
      if (!game) {
        return;
      }

      const playerStillInGame = game.players.find(
        (p) => p.userId === socket.userId
      );
      if (!playerStillInGame) {
        return;
      }

      const gameEngine = activeGames.get(roomId);
      if (gameEngine) {
        try {
          await gameEngine.handlePlayerDisconnect(socket.userId);
        } catch (e) {
          console.error("Game engine disconnect handling error:", e);
        }
      }

      const opponentsBeforeRemoval = game.players.map((opponent) => ({
        userId: opponent.userId,
        username: opponent.username,
        avatar: opponent.avatar,
        score: opponent.score || 0,
        matches: opponent.matches || 0,
      }));

      const playerLeftData = {
        userId: socket.userId,
        username: socket.username,
        remainingPlayers: game.players.length - 1,
        opponents: opponentsBeforeRemoval.filter(
          (p) => p.userId !== socket.userId
        ),
        gameStatus: game.gameState?.status || game.status,
        reason: "manual_leave",
      };

      io.to(roomId).emit("player-left", playerLeftData);

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

      const playerRemoved = game.removePlayer(socket.userId, true);

      if (playerRemoved) {
        await game.save();
        console.log(`Player ${socket.username} manually left room ${roomId}`);

        if (game.players.length === 1) {
          const gameEngine = activeGames.get(roomId);
          if (gameEngine) {
            try {
              await gameEngine.endGame("last_player_winner");
            } catch (error) {
              console.error(`Error ending game ${roomId}:`, error);
            }
          } else {
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
          const gameEngine = activeGames.get(roomId);
          if (gameEngine) {
            gameEngine.cleanup();
            activeGames.delete(roomId);
          }

          try {
            await Game.findByIdAndDelete(game._id);

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

  function addSocketCleanup(socketId, cleanupFunction) {
    const cleanupSet = socketCleanup.get(socketId);
    if (cleanupSet) {
      cleanupSet.add(cleanupFunction);
    }
  }

  async function acquireOperationLock(roomId, operation, timeout = 5000) {
    const lockKey = `${roomId}-${operation}`;
    const existingLock = operationLocks.get(lockKey);

    if (existingLock) {
      await existingLock;
      return () => {};
    }

    let resolveLock;
    const lockPromise = new Promise((resolve) => {
      resolveLock = resolve;
    });

    operationLocks.set(lockKey, lockPromise);

    setTimeout(() => {
      if (operationLocks.get(lockKey) === lockPromise) {
        operationLocks.delete(lockKey);
        resolveLock();
      }
    }, timeout);

    return () => {
      const currentLock = operationLocks.get(lockKey);
      if (currentLock === lockPromise) {
        operationLocks.delete(lockKey);
        resolveLock();
      }
    };
  }

  function releaseOperationLock(roomId, operation) {
    const lockKey = `${roomId}-${operation}`;
    const lockPromise = operationLocks.get(lockKey);
    if (lockPromise) {
      operationLocks.delete(lockKey);

      lockPromise.then((resolve) => resolve());
    }
  }

  function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

setInterval(async () => {
  try {
    const emptyRoomCutoffTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes

    const inactiveGameCutoffTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour

    const emptyRooms = await Game.find({
      $or: [
        {
          "gameState.status": { $in: ["waiting", "starting"] },
          updatedAt: { $lt: emptyRoomCutoffTime },
          players: { $size: 0 },
        },
        {
          "gameState.status": { $in: ["waiting", "starting"] },
          updatedAt: { $lt: emptyRoomCutoffTime },
          "players.0": { $exists: false },
        },
      ],
    });

    for (const game of emptyRooms) {
      try {
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

    const inactiveGames = await Game.find({
      $or: [
        {
          "gameState.status": { $in: ["waiting", "starting", "playing"] },
          updatedAt: { $lt: inactiveGameCutoffTime },
        },
      ],
    });

    for (const game of inactiveGames) {
      try {
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

    const completedCutoffTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); //10 days
    const completedGames = await Game.find({
      $or: [{ status: "completed" }, { "gameState.status": "finished" }],
      updatedAt: { $lt: completedCutoffTime },
    });

    for (const game of completedGames) {
      try {
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

    for (const [roomId, gameEngine] of activeGames) {
      try {
        const game = await Game.findOne({ roomId });
        if (!game) {
          gameEngine.cleanup();
          activeGames.delete(roomId);
          io.emit("room-deleted", roomId);
        }
      } catch (error) {
        console.error(`Error checking game ${roomId} for cleanup:`, error);

        gameEngine.cleanup();
        activeGames.delete(roomId);
      }
    }
  } catch (error) {
    console.error("Game cleanup error:", error);
  }
}, 20 * 60 * 1000);

module.exports = { initializeSocket };
