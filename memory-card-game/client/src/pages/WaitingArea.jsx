import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { motion } from 'framer-motion';
import { UserGroupIcon, ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';

const WaitingArea = () => {
  const { roomId } = useParams();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const startRequestedRef = useRef(false);

  useEffect(() => {
    if (socket) {
      // Join the room when component mounts (debounced in context)
      socket.emit('join-room', { roomId });

      // Listen for room updates
      socket.off('room-joined', handleRoomJoined);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('game-started', handleGameStarted);
      socket.off('game-start', handleGameStart);
      socket.off('error', handleError);
      socket.on('room-joined', handleRoomJoined);
      socket.on('player-joined', handlePlayerJoined);
      socket.on('game-started', handleGameStarted);
      socket.on('game-start', handleGameStart);
      socket.on('error', handleError);

      // Set a timeout to check if we're still loading after 5 seconds
      const loadingTimeout = setTimeout(() => {
        if (loading) {
          // If still loading after timeout, try to rejoin the room
          socket.emit('join-room', { roomId });
        }
      }, 5000);

      return () => {
        socket.off('room-joined', handleRoomJoined);
        socket.off('player-joined', handlePlayerJoined);
        socket.off('game-started', handleGameStarted);
        socket.off('game-start', handleGameStart);
        socket.off('error', handleError);
        clearTimeout(loadingTimeout);
        startRequestedRef.current = false;
      };
    }
  }, [socket, roomId, loading]);

  const handleRoomJoined = (data) => {
    setLoading(false);
    setRoom(data.game);
    setPlayers(data.game.players);

    // If there are already enough players to start the game, automatically start it
    const max = data.game.settings?.maxPlayers || 2;
    if (!startRequestedRef.current && data.game.players.length >= max) {
      startRequestedRef.current = true;
      socket.emit('start-game', { roomId });
    }
  };

  const handlePlayerJoined = (data) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      const existingPlayerIndex = newPlayers.findIndex(p => p.userId === data.player.userId);
      
      if (existingPlayerIndex >= 0) {
        newPlayers[existingPlayerIndex] = data.player;
      } else {
        newPlayers.push(data.player);
      }

      // If we now have enough players to start the game, automatically start it
      const max = (room?.settings?.maxPlayers || 2);
      if (!startRequestedRef.current && room && newPlayers.length >= max) {
        startRequestedRef.current = true;
        socket.emit('start-game', { roomId });
      }

      return newPlayers;
    });
  };

  const handleGameStarted = (data) => {
    addToast('Game is starting!', 'success');
    navigate(`/game/${roomId}`);
  };
  
  // Add handler for the new game-start event
  const handleGameStart = (data) => {
    addToast('Game is starting!', 'success');
    navigate(`/game/${roomId}`);
  };

  const handleError = (error) => {
    addToast(error.message || 'An error occurred', 'error');
    navigate('/lobby');
  };

  const leaveRoom = () => {
    if (socket) {
      socket.emit('leave-room');
    }
    navigate('/lobby');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Waiting for Players
        </h1>
        <button
          onClick={leaveRoom}
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 
                   dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white 
                   rounded-lg font-medium transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Leave Room
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
        <div className="flex items-center">
          <ClockIcon className="h-6 w-6 text-blue-500 mr-3" />
          <p className="text-blue-700 dark:text-blue-300">
            Waiting for another player to join...
            <span className="inline-block ml-2">
              <span className="animate-pulse">.</span>
              <span className="animate-pulse delay-100">.</span>
              <span className="animate-pulse delay-200">.</span>
            </span>
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Room Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Room ID</p>
            <p className="font-medium text-gray-900 dark:text-white">{roomId}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Game Mode</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {room?.settings?.gameMode?.charAt(0).toUpperCase() + room?.settings?.gameMode?.slice(1) || 'Classic'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Board Size</p>
            <p className="font-medium text-gray-900 dark:text-white">{room?.settings?.boardSize || '4x4'}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Max Players</p>
            <p className="font-medium text-gray-900 dark:text-white">{room?.settings?.maxPlayers || 2}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <UserGroupIcon className="h-5 w-5 mr-2" />
          Players ({players.length}/{room?.settings?.maxPlayers || 2})
        </h2>
        <div className="space-y-3">
          {players.map((player) => (
            <motion.div
              key={player.userId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                <img 
                  src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.username}`} 
                  alt={player.username} 
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{player.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {player.userId === user?.id ? 'You' : 'Opponent'}
                </p>
              </div>
              {player.isHost && (
                <span className="ml-auto px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs rounded-full">
                  Host
                </span>
              )}
            </motion.div>
          ))}

          {Array.from({ length: (room?.settings?.maxPlayers || 2) - players.length }).map((_, index) => (
            <div 
              key={`empty-${index}`}
              className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg opacity-50"
            >
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 mr-3 flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="font-medium text-gray-400 dark:text-gray-500">Waiting for player...</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WaitingArea;