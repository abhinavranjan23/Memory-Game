const { Game } = require('../models/Game.js');
const { User } = require('../models/User.js');
const { GameEngine } = require('./gameEngine.js');
const { authenticateSocket } = require('../middleware/auth.js');

const activeGames = new Map(); // roomId -> GameEngine
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId
const activePlayers = new Set(); // Set of active user IDs

function initializeSocket(io) {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.id})`);
    
    if (socket.userId) {
      userSockets.set(socket.userId, socket.id);
      socketUsers.set(socket.id, socket.userId);
      activePlayers.add(socket.userId);
      
      // Emit active players count to all clients
      io.emit('active-players', { count: activePlayers.size });
    }

    // Join a game room
    socket.on('join-room', async (data) => {
      try {
        const { roomId, password } = data;
        
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }

        // Leave current room if in one
        if (socket.currentRoom) {
          await handleLeaveRoom(socket, socket.currentRoom);
        }

        // Find the game
        let game = await Game.findOne({ roomId });
        
        if (!game) {
          // Create new game if it doesn't exist
          game = new Game({
            roomId,
            settings: {
              boardSize: 4,
              theme: 'emojis',
              gameMode: 'classic',
              timeLimit: 300,
              maxPlayers: 2,
              powerUpsEnabled: true,
              chatEnabled: true,
              isRanked: true
            },
            isPrivate: !!password,
            password: password || undefined
          });
          await game.save();
        }

        // Check password for private rooms
        if (game.isPrivate && game.password && game.password !== password) {
          socket.emit('error', { message: 'Invalid room password' });
          return;
        }

        // Check if room is full
        if (game.players.length >= game.settings.maxPlayers) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        // Check if user is already in the game
        const existingPlayer = game.players.find(p => p.userId === socket.userId);
        if (!existingPlayer) {
          try {
            game.addPlayer(socket.userId, socket.username, socket.data?.avatar);
            await game.save();
          } catch (error) {
            socket.emit('error', { message: error.message });
            return;
          }
        }

        // Join the socket room
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Initialize game engine if not exists
        if (!activeGames.has(roomId)) {
          const gameEngine = new GameEngine(roomId, io);
          activeGames.set(roomId, gameEngine);
        }

        // Emit successful join
        socket.emit('room-joined', {
          roomId,
          game: {
            roomId: game.roomId,
            players: game.players,
            gameState: game.gameState,
            settings: game.settings,
            chat: game.chat.slice(-50)
          }
        });

        // Notify other players
        socket.to(roomId).emit('player-joined', {
          player: {
            userId: socket.userId,
            username: socket.username,
            avatar: socket.data?.avatar,
            isReady: false
          }
        });

        // Notify all clients about the room update
        io.emit('room-updated', {
          roomId: game.roomId,
          playerCount: game.players.length,
          maxPlayers: game.settings.maxPlayers,
          isJoinable: game.players.length < game.settings.maxPlayers,
          gameMode: game.settings.gameMode,
          status: game.gameState.status
        });
        
        // Auto-start game if room has reached 2 players
        if (game.players.length === 2 && game.gameState.status === 'waiting') {
          // Set all players as ready
          game.players.forEach(player => {
            player.isReady = true;
          });
          game.gameState.status = 'starting';
          await game.save();
          
          // Emit game-start event to all players in the room
          io.to(roomId).emit('game-start', {
            roomId: game.roomId,
            players: game.players,
            gameState: game.gameState
          });
          
          // Start the game
          const gameEngine = activeGames.get(roomId);
          if (gameEngine) {
            await gameEngine.startGame();
          }
        }

        console.log(`${socket.username} joined room ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave current room
    socket.on('leave-room', async () => {
      if (socket.currentRoom) {
        await handleLeaveRoom(socket, socket.currentRoom);
      }
    });

    // Toggle ready status
    socket.on('toggle-ready', async () => {
      if (!socket.currentRoom) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      try {
        const game = await Game.findOne({ roomId: socket.currentRoom });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        game.togglePlayerReady(socket.userId);
        await game.save();

        // Emit updated game state
        io.to(socket.currentRoom).emit('game-state', {
          players: game.players,
          gameState: game.gameState
        });

        // Start game if all players are ready
        if (game.gameState.status === 'starting') {
          const gameEngine = activeGames.get(socket.currentRoom);
          if (gameEngine) {
            await gameEngine.startGame();
          }
        }
      } catch (error) {
        console.error('Toggle ready error:', error);
        socket.emit('error', { message: 'Failed to toggle ready status' });
      }
    });

    // Flip a card
    socket.on('flip-card', async (data) => {
      const { cardId } = data;
      const gameEngine = activeGames.get(socket.currentRoom);
      
      if (!gameEngine) {
        socket.emit('error', { message: 'Game not active' });
        return;
      }

      try {
        await gameEngine.flipCard(socket.userId, cardId);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Use a power-up
    socket.on('use-powerup', async (data) => {
      const { powerUpType, target } = data;
      const gameEngine = activeGames.get(socket.currentRoom);
      
      if (!gameEngine) {
        socket.emit('error', { message: 'Game not active' });
        return;
      }

      try {
        await gameEngine.usePowerUp(socket.userId, powerUpType, target);
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    // Send chat message
    socket.on('send-chat', async (data) => {
      if (!socket.currentRoom) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      try {
        const { message } = data;
        
        if (!message || message.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        if (message.length > 500) {
          socket.emit('error', { message: 'Message too long' });
          return;
        }

        const game = await Game.findOne({ roomId: socket.currentRoom });
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        if (!game.settings.chatEnabled) {
          socket.emit('error', { message: 'Chat is disabled in this room' });
          return;
        }

        game.addChatMessage(socket.userId, socket.username, message.trim());
        await game.save();

        // Broadcast chat message
        io.to(socket.currentRoom).emit('chat-message', {
          id: game.chat[game.chat.length - 1].id,
          userId: socket.userId,
          username: socket.username,
          message: message.trim(),
          timestamp: new Date(),
          type: 'user'
        });
      } catch (error) {
        console.error('Chat error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Get available rooms
    socket.on('get-rooms', async () => {
      try {
        const rooms = await Game.find({
          'gameState.status': { $in: ['waiting', 'starting'] },
          isPrivate: false
        })
        .limit(20)
        .select('roomId players gameState settings createdAt')
        .sort({ createdAt: -1 })
        .exec();

        socket.emit('rooms-list', {
          rooms: rooms.map(game => ({
            roomId: game.roomId,
            playerCount: game.players.length,
            maxPlayers: game.settings.maxPlayers,
            gameMode: game.settings.gameMode,
            boardSize: game.settings.boardSize,
            theme: game.settings.theme,
            status: game.gameState.status,
            isJoinable: game.players.length < game.settings.maxPlayers,
            players: game.players.map(p => ({
              userId: p.userId,
              username: p.username,
              avatar: p.avatar,
              isHost: p.isHost
            })),
            createdAt: game.createdAt
          }))
        });
      } catch (error) {
        console.error('Get rooms error:', error);
        socket.emit('error', { message: 'Failed to fetch rooms' });
      }
    });

    // Create private room
    socket.on('create-private-room', async (data) => {
      try {
        const { password, settings = {} } = data;
        const roomId = generateRoomId();

        const gameSettings = {
          boardSize: settings.boardSize || 4,
          theme: settings.theme || 'emojis',
          gameMode: settings.gameMode || 'classic',
          timeLimit: settings.timeLimit || 300,
          maxPlayers: settings.maxPlayers || 2,
          powerUpsEnabled: settings.powerUpsEnabled !== false,
          chatEnabled: settings.chatEnabled !== false,
          isRanked: settings.isRanked !== false
        };

        const game = new Game({
          roomId,
          settings: gameSettings,
          isPrivate: true,
          password: password || undefined
        });

        // Add creator as first player
        game.addPlayer(socket.userId, socket.username, socket.data?.avatar);
        await game.save();

        socket.emit('private-room-created', {
          roomId,
          password,
          settings: gameSettings
        });

        console.log(`Private room ${roomId} created by ${socket.username}`);
      } catch (error) {
        console.error('Create private room error:', error);
        socket.emit('error', { message: 'Failed to create private room' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username} (${socket.id})`);
      
      if (socket.userId) {
        userSockets.delete(socket.userId);
        socketUsers.delete(socket.id);
        activePlayers.delete(socket.userId);
        
        // Emit updated active players count to all clients
        io.emit('active-players', { count: activePlayers.size });
      }

      if (socket.currentRoom) {
        await handleLeaveRoom(socket, socket.currentRoom);
      }
    });
  });

  // Helper function to handle leaving room
  async function handleLeaveRoom(socket, roomId) {
    try {
      const game = await Game.findOne({ roomId });
      if (game) {
        game.removePlayer(socket.userId);
        
        if (game.players.length === 0) {
          // Delete empty game
          await Game.findOneAndDelete({ roomId });
          activeGames.delete(roomId);
        } else {
          await game.save();
          
          // Notify remaining players
          socket.to(roomId).emit('player-left', {
            userId: socket.userId,
            username: socket.username
          });

          // Update game state
          socket.to(roomId).emit('game-state', {
            players: game.players,
            gameState: game.gameState
          });
        }
      }

      socket.leave(roomId);
      socket.currentRoom = null;
      console.log(`${socket.username} left room ${roomId}`);
    } catch (error) {
      console.error('Leave room error:', error);
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
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
    
    // Remove inactive games
    await Game.deleteMany({
      'gameState.lastActivity': { $lt: cutoffTime },
      'gameState.status': { $in: ['waiting', 'starting'] }
    });

    // Clean up active games map
    for (const [roomId, gameEngine] of activeGames) {
      const game = await Game.findOne({ roomId });
      if (!game || game.gameState.status === 'finished') {
        activeGames.delete(roomId);
      }
    }
  } catch (error) {
    console.error('Game cleanup error:', error);
  }
}, 5 * 60 * 1000); // Every 5 minutes

module.exports = { initializeSocket };