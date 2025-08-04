import { Server as SocketIOServer, Socket } from 'socket.io';
import { Game } from '../models/Game.js';
import { User } from '../models/User.js';
import { GameEngine } from './gameEngine.js';
import { verifySocketToken } from '../middleware/auth.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  isGuest?: boolean;
}

const activeGames = new Map<string, GameEngine>();
const userSockets = new Map<string, string>(); // userId -> socketId
const socketUsers = new Map<string, string>(); // socketId -> userId

export function initializeSocket(io: SocketIOServer) {
  // Authentication middleware
  io.use(verifySocketToken);

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.username} (${socket.id})`);
    
    if (socket.userId) {
      userSockets.set(socket.userId, socket.id);
      socketUsers.set(socket.id, socket.userId);
    }

    // Join a game room
    socket.on('join-room', async (data: { roomId: string; password?: string }) => {
      try {
        const { roomId, password } = data;
        let game = await Game.findOne({ roomId }).exec();
        
        if (!game) {
          // Create new game
          game = new Game({
            roomId,
            players: [],
            isPrivate: !!password,
            password
          });
          await game.save();
        }

        // Check password for private rooms
        if (game.isPrivate && game.password !== password) {
          socket.emit('error', { message: 'Invalid password' });
          return;
        }

        // Check if room is full
        if (game.players.length >= game.settings.maxPlayers) {
          socket.emit('error', { message: 'Room is full' });
          return;
        }

        // Add player to game
        try {
          game.addPlayer(socket.userId!, socket.username!, socket.data?.avatar);
          await game.save();
          
          // Join socket room
          socket.join(roomId);
          
          // Initialize game engine if not exists
          if (!activeGames.has(roomId)) {
            activeGames.set(roomId, new GameEngine(game, io));
          }
          
          const gameEngine = activeGames.get(roomId)!;
          gameEngine.addPlayer(socket);
          
          // Notify all players in room
          io.to(roomId).emit('player-joined', {
            player: game.players.find(p => p.userId === socket.userId),
            gameState: game.gameState
          });
          
          socket.emit('room-joined', {
            roomId,
            game: game.toObject()
          });
          
        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
        
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave-room', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const game = await Game.findOne({ roomId }).exec();
        
        if (game && socket.userId) {
          game.removePlayer(socket.userId);
          await game.save();
          
          socket.leave(roomId);
          
          const gameEngine = activeGames.get(roomId);
          if (gameEngine) {
            gameEngine.removePlayer(socket.userId);
            
            // Remove game engine if no players left
            if (game.players.length === 0) {
              activeGames.delete(roomId);
            }
          }
          
          // Notify remaining players
          io.to(roomId).emit('player-left', {
            userId: socket.userId,
            gameState: game.gameState
          });
        }
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });

    // Player ready toggle
    socket.on('toggle-ready', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const game = await Game.findOne({ roomId }).exec();
        
        if (game && socket.userId) {
          game.togglePlayerReady(socket.userId);
          await game.save();
          
          io.to(roomId).emit('player-ready-changed', {
            userId: socket.userId,
            gameState: game.gameState
          });
          
          // Start game if all players ready
          if (game.gameState.status === 'starting') {
            const gameEngine = activeGames.get(roomId);
            if (gameEngine) {
              await gameEngine.startGame();
            }
          }
        }
      } catch (error) {
        console.error('Error toggling ready:', error);
      }
    });

    // Flip card
    socket.on('flip-card', async (data: { roomId: string; cardId: number }) => {
      try {
        const { roomId, cardId } = data;
        const gameEngine = activeGames.get(roomId);
        
        if (gameEngine && socket.userId) {
          await gameEngine.flipCard(socket.userId, cardId);
        }
      } catch (error) {
        console.error('Error flipping card:', error);
        socket.emit('error', { message: 'Invalid move' });
      }
    });

    // Use power-up
    socket.on('use-powerup', async (data: { 
      roomId: string; 
      powerUpType: string; 
      target?: any;
    }) => {
      try {
        const { roomId, powerUpType, target } = data;
        const gameEngine = activeGames.get(roomId);
        
        if (gameEngine && socket.userId) {
          await gameEngine.usePowerUp(socket.userId, powerUpType, target);
        }
      } catch (error) {
        console.error('Error using power-up:', error);
        socket.emit('error', { message: 'Failed to use power-up' });
      }
    });

    // Send chat message
    socket.on('send-chat', async (data: { roomId: string; message: string }) => {
      try {
        const { roomId, message } = data;
        const game = await Game.findOne({ roomId }).exec();
        
        if (game && socket.userId && socket.username) {
          // Basic message filtering
          const cleanMessage = message.trim().substring(0, 500);
          if (cleanMessage.length === 0) return;
          
          game.addChatMessage(socket.userId, socket.username, cleanMessage);
          await game.save();
          
          io.to(roomId).emit('chat-message', {
            id: game.chat[game.chat.length - 1].id,
            userId: socket.userId,
            username: socket.username,
            message: cleanMessage,
            timestamp: new Date(),
            type: 'user'
          });
        }
      } catch (error) {
        console.error('Error sending chat:', error);
      }
    });

    // Get available rooms
    socket.on('get-rooms', async () => {
      try {
        const games = await Game.find({
          'gameState.status': { $in: ['waiting', 'starting'] },
          isPrivate: false
        })
        .limit(20)
        .select('roomId players gameState settings createdAt')
        .exec();
        
        const rooms = games.map(game => ({
          roomId: game.roomId,
          playerCount: game.players.length,
          maxPlayers: game.settings.maxPlayers,
          gameMode: game.settings.gameMode,
          boardSize: game.settings.boardSize,
          status: game.gameState.status,
          createdAt: game.createdAt
        }));
        
        socket.emit('rooms-list', rooms);
      } catch (error) {
        console.error('Error getting rooms:', error);
      }
    });

    // Create private room
    socket.on('create-private-room', async (data: {
      roomName: string;
      password: string;
      settings: any;
    }) => {
      try {
        const { roomName, password, settings } = data;
        const roomId = `private-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const game = new Game({
          roomId,
          players: [],
          isPrivate: true,
          password,
          settings: {
            ...settings,
            maxPlayers: Math.min(Math.max(settings.maxPlayers || 2, 2), 4)
          }
        });
        
        await game.save();
        
        socket.emit('private-room-created', {
          roomId,
          password
        });
      } catch (error) {
        console.error('Error creating private room:', error);
        socket.emit('error', { message: 'Failed to create private room' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username} (${socket.id})`);
      
      if (socket.userId) {
        userSockets.delete(socket.userId);
        socketUsers.delete(socket.id);
        
        // Find and leave any active games
        const games = await Game.find({
          'players.userId': socket.userId,
          'gameState.status': { $in: ['waiting', 'starting', 'playing'] }
        }).exec();
        
        for (const game of games) {
          const gameEngine = activeGames.get(game.roomId);
          if (gameEngine) {
            gameEngine.handlePlayerDisconnect(socket.userId);
          }
        }
        
        // Update user's last active time
        await User.findByIdAndUpdate(socket.userId, {
          lastActive: new Date()
        }).exec();
      }
    });
  });

  // Cleanup inactive games every 5 minutes
  setInterval(async () => {
    try {
      const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      const inactiveGames = await Game.find({
        'gameState.lastActivity': { $lt: cutoffTime },
        'gameState.status': { $ne: 'finished' }
      }).exec();
      
      for (const game of inactiveGames) {
        game.gameState.status = 'finished';
        await game.save();
        
        const gameEngine = activeGames.get(game.roomId);
        if (gameEngine) {
          gameEngine.endGame('timeout');
          activeGames.delete(game.roomId);
        }
      }
      
      console.log(`Cleaned up ${inactiveGames.length} inactive games`);
    } catch (error) {
      console.error('Error cleaning up inactive games:', error);
    }
  }, 5 * 60 * 1000);
}